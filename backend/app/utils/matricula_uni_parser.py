"""Parser determinista de la Boleta/Ficha de Matrícula UNI.

La ficha oficial generada por https://matricula-alumno.uni.edu.pe/ tiene
estructura fija con dos tablas:

- ``CURSOS MATRICULADOS``: CICLO | CURSO | SEC | NOMBRE DEL CURSO |
  CONDICIÓN | CRÉD. | VECES REP.
- ``HORARIO DE CLASES``: CURSO | SEC | DÍA | HORA | TIPO | DOCENTE | AULA

Este módulo intenta extraer esas tablas con ``pdfplumber.extract_tables()``
y, como red de seguridad, con regex sobre el texto plano. Devuelve ``None``
si el PDF no cumple la firma estándar UNI (para que el caller haga fallback
a Gemini).
"""

from __future__ import annotations

import io
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# ── Firma del documento UNI ─────────────────────────────────────────────────
FIRMA_HORARIO_RE = re.compile(r"HORARIO\s+DE\s+CLASES", re.IGNORECASE)

# ── Normalización ───────────────────────────────────────────────────────────
ABREV_NOMBRE = "ÁÉÍÓÚÜÑ"
_DIA_LOOKUP = {}
for _abrev, _nombres in {
    "LU": ["LUNES", "LU"],
    "MA": ["MARTES", "MA"],
    "MI": ["MIÉRCOLES", "MIERCOLES", "MI", "MIE"],
    "JU": ["JUEVES", "JU", "JUE"],
    "VI": ["VIERNES", "VI", "VIE"],
    "SA": ["SÁBADO", "SABADO", "SA", "SAB"],
}.items():
    for _n in _nombres:
        _DIA_LOOKUP[_n] = _abrev

_TIPO_LOOKUP = {
    "T": "T", "TEORÍA": "T", "TEORIA": "T", "TEO": "T",
    "PRA": "P", "P": "P", "PRÁCTICA": "P", "PRACTICA": "P",
    "LAB": "LAB", "LABORATORIO": "LAB",
}

# Código de curso UNI: 2-3 letras + 2-3 dígitos (+ sufijo letra opcional).
# Ejemplos: BEG01, FB501, SI501, MA141.
CODIGO_RE = re.compile(r"^[A-Z]{2,3}\d{2,3}[A-Z]?$")

HORA_RE = re.compile(r"(\d{1,2}):(\d{2})")

_DIAS_REGEX = (
    r"Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|"
    r"LU|MA|MI|MIE|JU|JUE|VI|VIE|SA|SAB"
)


def _norm(texto: Optional[str]) -> str:
    """Normaliza una celda de tabla: colapsa espacios/saltos, quita bordes."""
    if not texto:
        return ""
    return re.sub(r"\s+", " ", texto).strip()


def _upper_norm(texto: Optional[str]) -> str:
    return _norm(texto).upper()


def _norm_tipo(tipo: str) -> Optional[str]:
    return _TIPO_LOOKUP.get(_upper_norm(tipo))


def _norm_dia(dia: str) -> Optional[str]:
    return _DIA_LOOKUP.get(_upper_norm(dia))


def _parse_hora_rango(hora: str) -> Optional[tuple[str, str]]:
    """'10:00 - 12:00' → ('10:00', '12:00')."""
    matches = HORA_RE.findall(hora or "")
    if len(matches) < 2:
        return None
    hi, hf = matches[0], matches[1]
    fmt = lambda m: f"{int(m[0]):02d}:{m[1]}"
    return fmt(hi), fmt(hf)


def _valid_bloque(b: dict) -> bool:
    """Un bloque es válido si tiene código, sección, día, horario y duración > 0."""
    if not (b.get("codigo") and b.get("dia") and b.get("hora_inicio") and b.get("hora_fin")):
        return False
    try:
        hi = int(b["hora_inicio"][:2]) * 60 + int(b["hora_inicio"][3:])
        hf = int(b["hora_fin"][:2]) * 60 + int(b["hora_fin"][3:])
    except (ValueError, IndexError):
        return False
    return hf > hi


def _hdr_match(header_cells: list[str], palabra: str) -> bool:
    return any(palabra in cell for cell in header_cells)


# ── Extracción vía extract_tables() ─────────────────────────────────────────

def _procesar_tabla(tabla: list[list[Optional[str]]],
                    cursos: dict, bloques: list[dict]) -> None:
    """Clasifica una tabla extraída y alimenta `cursos` / `bloques`."""
    if not tabla or len(tabla) < 2:
        return
    header = [_upper_norm(c) for c in tabla[0]]

    # Tabla HORARIO DE CLASES: CURSO | SEC | DÍA | HORA | TIPO | DOCENTE | AULA
    if (_hdr_match(header, "HORA") and _hdr_match(header, "AULA")
            and _hdr_match(header, "DOCENTE")):

        def idx(palabra: str, default: int = -1) -> int:
            for i, h in enumerate(header):
                if palabra in h:
                    return i
            return default

        i_cur, i_sec = idx("CURSO"), idx("SEC")
        i_dia, i_hora = idx("DÍA", idx("DIA")), idx("HORA")
        i_tipo, i_doc, i_aula = idx("TIPO"), idx("DOCENTE"), idx("AULA")

        for row in tabla[1:]:
            if not row or all(not _norm(c) for c in row):
                continue
            cells = [_norm(c) for c in row] + [""] * (len(header) - len(row))
            codigo = cells[i_cur].upper() if i_cur >= 0 else ""
            if not CODIGO_RE.match(codigo):
                continue
            rango = _parse_hora_rango(cells[i_hora] if i_hora >= 0 else "")
            bloque = {
                "codigo": codigo,
                "seccion": cells[i_sec].upper() if i_sec >= 0 else "",
                "dia": _norm_dia(cells[i_dia]) if i_dia >= 0 else None,
                "hora_inicio": rango[0] if rango else None,
                "hora_fin": rango[1] if rango else None,
                "tipo": _norm_tipo(cells[i_tipo]) or "T" if i_tipo >= 0 else "T",
                "docente": cells[i_doc].upper() if i_doc >= 0 else "",
                "aula": cells[i_aula].upper() if i_aula >= 0 else "",
            }
            if _valid_bloque(bloque):
                bloques.append(bloque)
        return

    # Tabla CURSOS MATRICULADOS: CICLO | CURSO | SEC | NOMBRE | CONDICIÓN | CRÉD. | ...
    if (_hdr_match(header, "NOMBRE")
            and (_hdr_match(header, "CRÉD") or _hdr_match(header, "CRED")
                 or _hdr_match(header, "CONDICI"))):

        def idx(palabra: str, default: int = -1) -> int:
            for i, h in enumerate(header):
                if palabra in h:
                    return i
            return default

        i_cur, i_sec, i_nom = idx("CURSO"), idx("SEC"), idx("NOMBRE")
        for row in tabla[1:]:
            if not row or all(not _norm(c) for c in row):
                continue
            cells = [_norm(c) for c in row] + [""] * (len(header) - len(row))
            codigo = cells[i_cur].upper() if i_cur >= 0 else ""
            if not CODIGO_RE.match(codigo):
                continue
            cursos.setdefault(codigo, {
                "nombre": cells[i_nom] if i_nom >= 0 else "",
                "seccion": cells[i_sec].upper() if i_sec >= 0 else "",
            })


# ── Fallback regex sobre texto plano ────────────────────────────────────────

_HORARIO_LINE_RE = re.compile(
    rf"^([A-Z]{{2,3}}\d{{2,3}}[A-Z]?)\s+"          # 1: código curso
    rf"([A-Z]{{1,2}})\s+"                          # 2: sección
    rf"({_DIAS_REGEX})\s+"                         # 3: día
    rf"(\d{{1,2}}:\d{{2}})\s*[-–]\s*(\d{{1,2}}:\d{{2}})\s+"  # 4,5: hora inicio-fin
    rf"(T|PRA|LAB|P|Teor[ií]a|Pr[aá]ctica|Laboratorio)\s+"   # 6: tipo
    rf"(.+?)\s\s+"                             # 7: docente (lazy)
    rf"([A-Z0-9][A-Za-z0-9.\-]*(?:\s*\([^)]*\))?)\s*$",      # 8: aula
)


def _parsear_texto_horario(texto: str, bloques: list[dict]) -> None:
    """Fallback: detecta filas del HORARIO DE CLASES en texto plano."""
    en_horario = False
    for linea in texto.splitlines():
        linea = linea.rstrip()
        up = linea.upper()
        if FIRMA_HORARIO_RE.search(up):
            en_horario = True
            continue
        if not en_horario:
            continue
        if up.strip() and not linea.strip():
            continue
        m = _HORARIO_LINE_RE.match(linea.strip())
        if m:
            codigo, seccion, dia, hi, hf, tipo, docente, aula = m.groups()
            bloque = {
                "codigo": codigo.upper(),
                "seccion": seccion.upper(),
                "dia": _norm_dia(dia),
                "hora_inicio": hi,
                "hora_fin": hf,
                "tipo": _norm_tipo(tipo) or "T",
                "docente": re.sub(r"\s+", " ", docente).strip().upper(),
                "aula": re.sub(r"\s+", " ", aula).strip().upper(),
            }
            if _valid_bloque(bloque) and bloque["dia"]:
                bloques.append(bloque)


def extraer_texto(pdf_bytes: bytes) -> str:
    """Devuelve el texto completo del PDF (una línea por salto de página)."""
    import pdfplumber

    partes = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            partes.append(page.extract_text() or "")
    return "\n".join(partes)


def parse_ficha_uni(pdf_bytes: bytes) -> Optional[dict]:
    """Intenta extraer la ficha de matrícula UNI de forma determinista.

    Retorna ``None`` si el PDF no cumple la firma estándar (caller hace
    fallback a IA). Si tiene éxito::

        {
            "cursos": {"BEG01": {"nombre": "ALGORITMOS...", "seccion": "Z"}, ...},
            "bloques": [
                {"codigo": "BEG01", "seccion": "Z", "dia": "MA",
                 "hora_inicio": "10:00", "hora_fin": "12:00",
                 "tipo": "T", "docente": "...", "aula": "S7-106"}, ...
            ],
        }
    """
    try:
        import pdfplumber
    except ImportError:
        logger.warning("pdfplumber no instalado; parser local UNI deshabilitado.")
        return None

    # 1) Firma del documento
    texto = extraer_texto(pdf_bytes)
    if not texto.strip() or not FIRMA_HORARIO_RE.search(texto):
        return None

    cursos: dict = {}
    bloques: list[dict] = []

    # 2) Tablas estructuradas
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                for tabla in page.extract_tables() or []:
                    _procesar_tabla(tabla, cursos, bloques)
    except Exception as e:
        logger.warning("extract_tables() falló, se usará fallback regex: %s", e)

    # 3) Fallback: regex sobre texto plano si no hubo bloques con tablas
    if not bloques:
        _parsear_texto_horario(texto, bloques)

    if not bloques:
        return None

    # 4) Dedupe por (código, sección, día, hora_inicio, tipo)
    vistos = set()
    bloques_unicos = []
    for b in bloques:
        clave = (b["codigo"], b.get("seccion", ""), b["dia"],
                 b["hora_inicio"], b.get("tipo", "T"))
        if clave in vistos:
            continue
        vistos.add(clave)
        bloques_unicos.append(b)

    # 5) Si faltaron nombres, intentar detectarlos sobre filas del texto
    if not cursos:
        _extraer_nombres_texto(texto, {b["codigo"] for b in bloques_unicos}, cursos)

    return {"cursos": cursos, "bloques": bloques_unicos}


def _extraer_nombres_texto(texto: str, codigos: set[str], cursos: dict) -> None:
    """Best-effort: nombre de curso desde CURSOS MATRICULADOS en texto plano."""
    for linea in texto.splitlines():
        tokens = linea.split()
        for i, tok in enumerate(tokens):
            t = tok.upper()
            if t in codigos and len(tokens) > i + 2 and CODIGO_RE.match(t):
                # Heurística: nombre = tokens entre el código (o su sección) y el primer
                # token que parezca condición/crédito ("O"/"VO"/número).
                sec_idx = i + 1
                nombre_tokens = []
                for t2 in tokens[sec_idx + 1:]:
                    if re.fullmatch(r"[A-ZÑ]{1,3}|\d+(\.\d+)?", t2.upper()) and nombre_tokens:
                        break
                    nombre_tokens.append(t2)
                if nombre_tokens:
                    cursos.setdefault(t, {
                        "nombre": re.sub(r"\s+", " ", " ".join(nombre_tokens)).strip(),
                        "seccion": tokens[sec_idx].upper(),
                    })
                break
