"""Etiqueta cada recurso (examen/práctica) con el profesor al que pertenece,
usando IA para leer el contenido ya extraído (resource_chunks) en vez de
volver a descargar los PDFs.

curso_profesores (poblada por scrape_profesores.py) solo sabe qué profesor
dicta qué curso, no qué profesor es dueño de qué documento — la mayoría de
los títulos de recursos tampoco lo dicen (son por tema: "APLICACIONES DE LA
DERIVADA", etc.). Este script le pasa a Gemini el texto ya vectorizado del
recurso más la lista de profesores reales de ESE curso (acotar la lista baja
falsos positivos frente a preguntar contra los ~85 profesores globales), y
le pide el nombre exacto si hay mención inequívoca, o nada si no la hay.

Reanudable: se salta cualquier recurso que ya tenga profesor_id.
"""
import argparse
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from google import genai

from app.core.database import get_admin_client

MODEL_NAME = "gemini-2.5-flash"
MAX_CARACTERES_CONTEXTO = 4000
# La cuota gratis de Gemini es de 5 peticiones/minuto para gemini-2.5-flash;
# 13s de pausa deja margen sobre ese límite.
PAUSA = 13
MAX_REINTENTOS = 3


def obtener_candidatos_por_curso(sb) -> dict:
    """curso_id -> lista de nombres de profesores que dictan ese curso."""
    resp = (
        sb.table("curso_profesores")
        .select("curso_id, profesores(id, nombre_completo)")
        .execute()
    )
    candidatos: dict = {}
    for fila in resp.data or []:
        profesor = fila.get("profesores") or {}
        if not profesor.get("nombre_completo"):
            continue
        candidatos.setdefault(fila["curso_id"], []).append(profesor)
    return candidatos


def obtener_contenido_recurso(sb, recurso_id: int) -> str:
    resp = (
        sb.table("resource_chunks")
        .select("contenido")
        .eq("recurso_id", recurso_id)
        .execute()
    )
    texto = "\n".join(c["contenido"] for c in (resp.data or []) if c.get("contenido"))
    return texto[:MAX_CARACTERES_CONTEXTO]


def preguntar_profesor(client, titulo: str, contenido: str, candidatos: list) -> str | None:
    nombres = [c["nombre_completo"] for c in candidatos]
    prompt = f"""Eres un asistente que identifica al autor de un documento académico.

Documento: "{titulo}"
Contenido (puede estar incompleto o ser solo un fragmento):
---
{contenido}
---

Lista de profesores que dictan este curso (los únicos candidatos válidos):
{json.dumps(nombres, ensure_ascii=False)}

¿El documento menciona explícitamente a alguno de estos profesores como su
autor/docente (ej. en un encabezado, pie de página, o firma)? Responde SOLO
con JSON: {{"profesor": "<nombre exacto de la lista>"}} si hay una mención
inequívoca, o {{"profesor": null}} si no hay mención clara o es ambigua.
Ante la duda, responde null — es preferible no etiquetar a etiquetar mal."""

    for intento in range(MAX_REINTENTOS):
        try:
            respuesta = client.models.generate_content(model=MODEL_NAME, contents=prompt)
            texto = (respuesta.text or "").strip()
            texto = texto.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            data = json.loads(texto)
            nombre = data.get("profesor")
            return nombre if nombre in nombres else None
        except Exception as e:
            mensaje = str(e)
            es_rate_limit = "429" in mensaje or "RESOURCE_EXHAUSTED" in mensaje
            es_transitorio = es_rate_limit or "503" in mensaje or "UNAVAILABLE" in mensaje
            if es_transitorio and intento < MAX_REINTENTOS - 1:
                match = re.search(r"retryDelay['\"]?:\s*['\"]?(\d+)s", mensaje)
                espera = int(match.group(1)) + 2 if match else PAUSA * 2
                print(f"    {'Rate limit' if es_rate_limit else 'Servicio no disponible'}, reintentando en {espera}s...")
                time.sleep(espera)
                continue
            print(f"    Error consultando a Gemini: {e}")
            return None
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None, help="Procesa como máximo N recursos.")
    parser.add_argument("--curso-id", type=int, default=None, help="Limita a un curso (materia) específico, para pilotos.")
    args = parser.parse_args()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Falta GEMINI_API_KEY en el .env")
        return

    client = genai.Client(api_key=api_key)
    sb = get_admin_client()

    candidatos_por_curso = obtener_candidatos_por_curso(sb)

    query = (
        sb.table("recursos")
        .select("id, titulo, curso_id")
        .not_.is_("curso_id", "null")
        .is_("profesor_id", "null")
    )
    if args.curso_id is not None:
        query = query.eq("curso_id", args.curso_id)
    recursos = query.execute().data or []

    if args.limit is not None:
        recursos = recursos[: args.limit]

    print(f"{len(recursos)} recursos por revisar.\n")

    tageados = 0
    sin_candidatos = 0
    sin_match = 0

    for i, r in enumerate(recursos, 1):
        candidatos = candidatos_por_curso.get(r["curso_id"])
        if not candidatos:
            sin_candidatos += 1
            continue

        contenido = obtener_contenido_recurso(sb, r["id"])
        if not contenido:
            sin_match += 1
            continue

        time.sleep(PAUSA)
        nombre = preguntar_profesor(client, r["titulo"] or "", contenido, candidatos)

        if nombre:
            profesor_id = next(c["id"] for c in candidatos if c["nombre_completo"] == nombre)
            sb.table("recursos").update({"profesor_id": profesor_id}).eq("id", r["id"]).execute()
            tageados += 1
            print(f"  [{i}/{len(recursos)}] {r['titulo']!r} -> {nombre}")
        else:
            sin_match += 1

    print("\n=== Resumen ===")
    print(f"Tageados: {tageados}")
    print(f"Sin match / sin contenido: {sin_match}")
    print(f"Sin profesores candidatos para su curso: {sin_candidatos}")


if __name__ == "__main__":
    main()
