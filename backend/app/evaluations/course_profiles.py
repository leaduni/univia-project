"""Perfiles de dificultad según el curso y sus temas."""

import unicodedata
from collections.abc import Sequence


def classify_course_profile(module: str, topics: Sequence[str]) -> str:
    joined = " ".join((module, *topics)).casefold()
    text = "".join(
        char for char in unicodedata.normalize("NFKD", joined)
        if not unicodedata.combining(char)
    )
    if any(term in text for term in ("geometr", "recta", "vector", "triangulo")):
        return "geometry"
    if any(term in text for term in ("program", "algoritm", "software", "codigo", "datos")):
        return "programming"
    if any(term in text for term in ("calcul", "algebra", "matemat", "ecuacion", "estadistic")):
        return "mathematics"
    if any(term in text for term in ("quimic", "fisic", "biolog", "termodinam", "electromagnet")):
        return "science"
    return "conceptual"


_FOCUSES = {
    "geometry": (
        "construcción e interpretación geométrica",
        "comparación de configuraciones espaciales",
        "demostración de una propiedad geométrica",
        "problema inverso con datos geométricos",
    ),
    "mathematics": (
        "aplicación de un procedimiento matemático",
        "demostración o verificación de una propiedad",
        "comparación de dos métodos de solución",
        "problema inverso a partir de un resultado",
    ),
    "science": (
        "explicación de un fenómeno",
        "interpretación de datos o resultados experimentales",
        "comparación de dos condiciones de estudio",
        "predicción fundamentada de un cambio",
    ),
    "programming": (
        "diseño de un algoritmo",
        "análisis de casos límite",
        "depuración de una implementación",
        "comparación de soluciones y complejidad",
    ),
    "conceptual": (
        "análisis de un caso",
        "comparación de dos posturas",
        "identificación de supuestos y consecuencias",
        "argumentación basada en un principio del curso",
    ),
}


def focus_for_profile(profile: str, index: int) -> str:
    focuses = _FOCUSES[profile]
    return focuses[index % len(focuses)]
