"""Verificacion del motor de busqueda de /api/recursos (Fases A y B).

No requiere base de datos: prueba normalizar_texto / tokens_de_busqueda /
puntuar sobre casos representativos del banco real de la UNI.

Ejecutar desde backend/ (con el venv):  python scripts_manuales/test_busqueda_fuzzy.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.texto_busqueda import (  # noqa: E402
    expandir_semestre,
    normalizar_texto,
    palabras_normalizadas,
    puntuar,
    tokens_de_busqueda,
)

fallos = []


def check(nombre, condicion):
    print(("PASS" if condicion else "FAIL"), "-", nombre)
    if not condicion:
        fallos.append(nombre)


def busca(consulta: str, haystack: str, ciclo: int = None) -> bool:
    """AND estricto: la tarjeta sobrevive solo si puntuar da score."""
    return puntuar(
        tokens_de_busqueda(consulta),
        normalizar_texto(haystack),
        palabras=palabras_normalizadas(haystack),
        ciclo_recurso=ciclo,
    ) is not None


# --- Normalizacion -----------------------------------------------------------
check("tildes fuera", normalizar_texto("Exámenes Física") == "examenesfisica")
check("guiones fuera (codigo)", normalizar_texto("MA-1001") == "ma1001")
check("vacio seguro", normalizar_texto(None) == "")

# --- Palabras normalizadas -----------------------------------------------------
p = palabras_normalizadas("Examen PC1 Matemática Básica MA-1002")
check("palabras separadas y normalizadas", p == ["examen", "pc1", "matematica", "basica", "ma", "1002"])

# --- AND estricto: substring / exacto ------------------------------------------
h1 = "Examen PC1 Aplicada a los Negocios Administracion CB14"
check("un token exacto", busca("examen", h1))
check("AND: todos presentes", busca("examen aplicada", h1))
check("AND: falta un token -> no", not busca("examen calculo", h1))
check("plural->singular (examenes->examen)", busca("examenes aplicada", h1))
check("alias plancha->examen", busca("plancha pc1", h1))
check("codigo sin guion (cb14)", busca("cb14", h1))
check("codigo con formato (MA-1001): consulta ma1001", busca("ma1001", "Silabo Matemática I MA-1001 2025-1"))

# --- Casos reales del banco UNI --------------------------------------------------
check("'calc num' abreviado", busca("calc num", "FB402 PC3 21-2 Cálculo Numérico"))
check("sigla de curso BMA01", busca("bma01", "BMA01 PC3 21-2 Cálculo Diferencial"))
check("sigla separada", busca("bma 01", "BMA01 PC3 21-2"))
check("profesor en titulo", busca("alcantara", "BQU01 ES 18-1 Alcantara-Fukuda Química I"))
check("profesor en drive_path", busca("ramos", "PC2 22-1 drive/BFI01/Ramos_PC2.pdf Física I"))
check("'pc 2' separado", busca("pc 2", "PC2 25-2 Solucionario"))
check("'labos' despluraliza a laboratorio", busca("labos quimica", "Laboratorio 3 BQU01 Química I"))

# --- Semestres -------------------------------------------------------------------
check("2023-1 contra '23-1'", busca("2023-1", "PC3 23-1 Cálculo Numérico"))
check("2023-1 contra '23-I' (romano)", busca("2023-1", "PC4 23-I Física"))
check("23-2 corto contra 2024-II", not busca("23-2", "PC1 2024-II Álgebra"))
check("ano solo empareja", busca("2023", "PC1 2023 II Física I"))
check("expansion 2023-2 incluye 2023ii", "2023ii" in expandir_semestre("2023-2"))
check("expansion 23-1 incluye 20231", "20231" in expandir_semestre("23-1"))
check("palabra normal no es semestre", expandir_semestre("calculo") == set())

# --- 'ciclo N' contra el campo ---------------------------------------------------
check("ciclo 3 empareja ciclo=3", busca("ciclo 3", "PC1 22-1 Cálculo", ciclo=3))
check("ciclo 3 NO empareja ciclo=5", not busca("ciclo 3", "PC1 22-1 Cálculo", ciclo=5))
check("ciclo 3 + curso", busca("ciclo 3 fisica", "PC1 22-1 Física I", ciclo=3))

# --- Fuzzy: errores de tipeo ------------------------------------------------------
check("tipos transposicion (exmaen)", busca("exmaen", h1))
check("tipos letra cambiada (apliqada)", busca("apliqada", h1))
check("typo en nombre de curso (numrico)", busca("calculo numrico", "FB402 PC3 21-2 Cálculo Numérico"))
check("typo en apellido (alcantra)", busca("alcantra", "BQU01 ES 18-1 Alcantara-Fukuda"))

# --- Ruido controlado --------------------------------------------------------------
check("token corto no fuzzy (mx)", not busca("mx", h1))
check("palabra sin relacion (quimica)", not busca("quimica", h1))
check("AND estricto: un token ajeno descarta", not busca("examen loremipsum", h1))
check("haystack vacio + consulta = False", not busca("examen", ""))
check("consulta vacia puntua 0.0", puntuar([], "abc") == 0.0)

# --- Ranking ----------------------------------------------------------------------
s_exacto = puntuar(tokens_de_busqueda("bma01"), normalizar_texto("BMA01 PC3 21-2 Cálculo Diferencial BMA01"),
                   palabras=palabras_normalizadas("BMA01 PC3 21-2 Cálculo Diferencial BMA01"),
                   codigo_exacto_norm="bma01")
s_parcial = puntuar(tokens_de_busqueda("bma01"), normalizar_texto("EF 21-1 Cálculo Diferencial BMA01 extra"),
                    palabras=palabras_normalizadas("EF 21-1 Cálculo Diferencial BMA01 extra"))
s_fuzzy = puntuar(tokens_de_busqueda("calculo numrico"), normalizar_texto("FB402 PC3 21-2 Cálculo Numérico"),
                  palabras=palabras_normalizadas("FB402 PC3 21-2 Cálculo Numérico"))
s_exact_words = puntuar(tokens_de_busqueda("calculo numerico"), normalizar_texto("FB402 PC3 21-2 Cálculo Numérico"),
                        palabras=palabras_normalizadas("FB402 PC3 21-2 Cálculo Numérico"))
check("ranking: exacto > fuzzy", (s_exact_words or 0) > (s_fuzzy or 0))
check("ranking: boost de codigo exacto", (s_exacto or 0) > (s_parcial or 0))

print()
if fallos:
    print(f"RESULTADO: {len(fallos)} fallaron: {fallos}")
    sys.exit(1)
print("RESULTADO: todas las verificaciones pasaron.")
