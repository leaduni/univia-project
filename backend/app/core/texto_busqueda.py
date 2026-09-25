"""Motor de búsqueda libre de la biblioteca (banco de recursos).

Fases A-B del rediseño: normalización sin tildes ni símbolos, tokens AND,
expansión de patrones de semestre UNI ("2023-1" ~ "23-II"), detección de
"ciclo N", aliases de tipos (`tipos_recursos`) y tolerancia a typos por
token vía rapidfuzz, con ranking por relevancia (`puntuar`).
"""

import re
import unicodedata
from typing import List, Optional, Set

from rapidfuzz.distance import DamerauLevenshtein

from app.core.tipos_recursos import normalizar_tipo

# Umbral de similitud normalizada (0-100) para que un token con typo se
# acepte contra una palabra del haystack. Damerau-Levenshtein trata la
# transposición ("exmaen") como un solo error. 80 acepta 1 typo en palabras
# de 5+ letras ("apliqada", "numrico") y exige 2 en palabras cortas.
UMBRAL_FUZZY = 80
# Tokens cortos (<4 letras) solo aceptan substring: fuzzy sobre "pc" o "f2"
# genera demasiado ruido.
MIN_LEN_FUZZY = 4

_ROMANOS = {"1": "i", "2": "ii", "i": "1", "ii": "2"}

# "2023-1", "2023/2", "23-1", "23II", "23-ii", "2024i".
_PATRON_SEMESTRE = re.compile(r"^(\d{2})(\d{2})?[-/]?(1|2|i|ii)$")
# "ciclo 3" / "ciclo3".
_PATRON_CICLO = re.compile(r"^ciclo(\d{1,2})$")


def normalizar_texto(s: str) -> str:
    """Minúsculas, sin diacríticos y sin símbolos (á->a, MA-1001->ma1001).

    Eliminar separadores permite que "MA1001" encuentre el código "MA-1001"
    y que "pc 1" matchee "PC1". La tokenización de la búsqueda se hace sobre
    el texto original (solo en minúsculas) para respetar los espacios.
    """
    s = (s or "").lower()
    return "".join(
        c for c in unicodedata.normalize("NFD", s)
        if c.isalnum() and unicodedata.category(c) != "Mn"
    )


def palabras_normalizadas(s: str) -> List[str]:
    """Palabras normalizadas, cortadas por cualquier no-alfanumérico.

    "Alcantara-Fukuda" -> ["alcantara", "fukuda"]: separar permite que el
    fuzzy compare "alcantra" contra "alcantara" y no contra la palabra
    compuesta, donde la distancia sería demasiado grande.
    """
    return [
        normalizar_texto(p)
        for p in re.findall(r"[^\W_]+", s or "", flags=re.UNICODE)
        if normalizar_texto(p)
    ]


def expandir_semestre(t: str) -> Set[str]:
    """Expande fechas cortas: '23-1' -> {231, 23i, 20231, 2023i}; '2023-2' -> idem.

    Los títulos del banco mezclan 'PC3 21-2', '23-II SOLUCIONARIO' y
    'IPC 2023 II' para el mismo semestre; sin esta expansión ninguno de esos
    formatos cruzaba con los otros.
    """
    m = _PATRON_SEMESTRE.match(normalizar_texto(t))
    if not m:
        return set()
    if m.group(2) is not None:          # "2023-1" -> año "20"+"23", corto "23"
        yy = m.group(2)
        yyyy = m.group(1) + m.group(2)
    else:                                # "23-1" -> corto "23", largo "2023"
        yy = m.group(1)
        yyyy = "20" + yy
    per = m.group(3)
    alt = _ROMANOS[per]
    return {yy + per, yy + alt, yyyy + per, yyyy + alt}


def _variantes_token(token: str) -> Set[str]:
    """Variantes de un token: semestre, singular simple y tipo canónico."""
    variantes: Set[str] = set()
    if "--" in token:  # nunca ocurre; guardia por si normalizar cambia
        return {token}

    semestre = expandir_semestre(token)
    if semestre:
        return semestre

    # "ciclo3" se maneja en tokens_de_busqueda (token especial).
    if _PATRON_CICLO.match(token):
        return {token}

    variantes.add(token)
    # Despluralización suficiente para el vocabulario del banco:
    # "examenes" -> "examen", "practicas" -> "practica", "labos" -> "labo".
    if len(token) > 4 and token.endswith("es"):
        variantes.add(token[:-2])
    elif len(token) > 3 and token.endswith("s"):
        variantes.add(token[:-1])
    # Alias de tipo: "parcial"/"plancha" -> "examen", "pc" -> "practica".
    canonico = normalizar_texto(normalizar_tipo(token))
    if canonico:
        variantes.add(canonico)
    return variantes


class TokenBusqueda:
    """Un token del usuario con sus variantes y, si aplica, filtro de ciclo."""

    def __init__(self, variantes: Set[str], token: str):
        self.variantes = variantes
        m = _PATRON_CICLO.match(token)
        self.ciclo = int(m.group(1)) if m else None

    def __repr__(self) -> str:  # pragma: no cover
        return f"TokenBusqueda({self.variantes}, ciclo={self.ciclo})"


def tokens_de_busqueda(search: str) -> List[TokenBusqueda]:
    """Convierte "ciclo 3 calc num" en tokens con variantes y/o filtro ciclo.

    El split se hace sobre el texto original en minúsculas (los espacios
    separan palabras); cada palabra se normaliza por separado. "ciclo 3" se
    fusiona en un solo token especial con filtro de ciclo.
    """
    crudos = (search or "").lower().split()
    tokens: List[TokenBusqueda] = []
    i = 0
    while i < len(crudos):
        palabra = normalizar_texto(crudos[i])
        if not palabra:
            i += 1
            continue
        # "ciclo 3" (dos palabras) -> un solo token especial.
        if palabra == "ciclo" and i + 1 < len(crudos):
            siguiente = normalizar_texto(crudos[i + 1])
            if siguiente.isdigit():
                fusion = f"ciclo{siguiente}"
                tokens.append(TokenBusqueda({fusion}, fusion))
                i += 2
                continue
        variantes = _variantes_token(palabra)
        tokens.append(TokenBusqueda(variantes, palabra))
        i += 1
    return tokens


def _score_token(token: TokenBusqueda, palabras: List[str], haystack: str) -> int:
    """100 = substring exacto; fuzzy (>=UMBRAL) devuelve el score real."""
    # Substring contra el haystack completo (sin espacios): cubre "ma1001"
    # dentro de "bma01pc3..." y variantes de semestre ya expandidas.
    if any(v in haystack for v in token.variantes):
        return 100
    # Fuzzy palabra por palabra (typos). Solo para tokens largos y puramente
    # alfabéticos: en códigos y fechas (bma01, 2023ii) un dígito distinto es
    # otro documento, no un typo.
    if (
        max((len(v) for v in token.variantes), default=0) >= MIN_LEN_FUZZY
        and all(v.isalpha() for v in token.variantes)
    ):
        mejor = 0
        for v in token.variantes:
            for w in palabras:
                # Coste similar: solo comparamos palabras de longitud cercana.
                if abs(len(w) - len(v)) > 2:
                    continue
                s = DamerauLevenshtein.normalized_similarity(v, w) * 100
                if s > mejor:
                    mejor = s
        if mejor >= UMBRAL_FUZZY:
            return int(mejor)
    return 0


def puntuar(
    tokens: List[TokenBusqueda],
    haystack: str,
    palabras: Optional[List[str]] = None,
    ciclo_recurso: Optional[int] = None,
    codigo_exacto_norm: str = "",
) -> Optional[float]:
    """Score AND: todos los tokens deben coincidir; None si alguno falla.

    Boosts: +50 si el código de curso completo coincide con algún token,
    +20 por cada token que cae literal sobre el código, +5 por token fuzzy
    (penaliza frente a exactos para el ranking).
    """
    if palabras is None:
        palabras = []
    if not tokens:
        return 0.0
    total = 0.0
    for token in tokens:
        # "ciclo 3" compara contra el campo ciclo, no contra el texto.
        if token.ciclo is not None:
            if ciclo_recurso is not None and ciclo_recurso == token.ciclo:
                total += 100
                continue
            return None
        s = _score_token(token, palabras, haystack)
        if s == 0:
            return None
        total += s
        if s < 100:
            total -= 5  # fuzzy sirve pero pesa menos que exacto
        if codigo_exacto_norm and any(
            v == codigo_exacto_norm for v in token.variantes
        ):
            total += 50
    return total


def coincide(tokens: List[TokenBusqueda], haystack: str) -> bool:
    """Compatibilidad con la Fase A: AND puro sin ranking."""
    return puntuar(tokens, haystack) is not None
