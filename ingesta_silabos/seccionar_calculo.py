"""
Reemplaza los learning_path_steps de Cálculo Diferencial por las 5 unidades del temario.
Aplica a todas las instancias del curso (Sistemas, Software, Industrial): ids 12, 32, 50.
La estructura y los temas replican el patrón usado en Geometría Analítica (curso 11).

Uso:
    python ingesta_silabos/seccionar_calculo.py
"""
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(REPO_ROOT / "backend" / ".env")

from database import get_supabase

CURSO_IDS = [12, 32, 50]  # Cálculo Diferencial: Sistemas / Software / Industrial

UNIDADES = [
    {
        "title": "Unidad 1: Lógica proposicional y conjuntos",
        "description": "Proposiciones, conectivos, cuantificadores y teoría de conjuntos.",
        "duration": "4h",
        "order_index": 1,
        "topics": [
            "Proposiciones y conectivos logicos",
            "Tablas de verdad",
            "Cuantificadores",
            "Operaciones con conjuntos",
        ],
        "icon": "check-square",
    },
    {
        "title": "Unidad 2: Funciones",
        "description": "Números reales, inecuaciones y estudio de funciones.",
        "duration": "4h",
        "order_index": 2,
        "topics": [
            "Numeros reales e inecuaciones",
            "Dominio y rango de funciones",
            "Tipos de funciones",
            "Operaciones y composicion de funciones",
            "Funciones inversas",
        ],
        "icon": "function-square",
    },
    {
        "title": "Unidad 3: Límites y continuidad",
        "description": "Límites de funciones, límites laterales y continuidad.",
        "duration": "4h",
        "order_index": 3,
        "topics": [
            "Limite de una funcion",
            "Limites laterales e infinitos",
            "Continuidad de funciones",
        ],
        "icon": "trending-up",
    },
    {
        "title": "Unidad 4: Derivación",
        "description": "Definición de derivada y reglas de derivación.",
        "duration": "4h",
        "order_index": 4,
        "topics": [
            "Definicion de derivada",
            "Reglas de derivacion",
            "Regla de la cadena",
            "Derivada implicita",
        ],
        "icon": "activity",
    },
    {
        "title": "Unidad 5: Aplicaciones de las derivadas y teoremas importantes",
        "description": "Optimización, razón de cambio y teoremas del valor medio.",
        "duration": "4h",
        "order_index": 5,
        "topics": [
            "Optimizacion",
            "Razon de cambio",
            "Maximos y minimos",
            "Teoremas del valor medio",
        ],
        "icon": "target",
    },
]


def main():
    sb = get_supabase()
    for curso_id in CURSO_IDS:
        print(f"\n=== Curso {curso_id} ===")
        # Borra los steps existentes (estructura semanal genérica)
        existentes = sb.table("learning_path_steps").select("id").eq("curso_id", curso_id).execute()
        if existentes.data:
            sb.table("learning_path_steps").delete().eq("curso_id", curso_id).execute()
            print(f"  Eliminados {len(existentes.data)} steps previos.")

        # Inserta las 5 unidades
        filas = [{"curso_id": curso_id, **u} for u in UNIDADES]
        resp = sb.table("learning_path_steps").insert(filas).execute()
        print(f"  Insertadas {len(resp.data)} unidades nuevas.")

    print("\nListo. Cálculo Diferencial seccionado en 5 unidades.")


if __name__ == "__main__":
    main()
