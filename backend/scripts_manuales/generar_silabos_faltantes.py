"""
Genera `learning_path_steps` para los cursos que no lo tienen, a partir del
recurso tipo Silabo ya ingerido desde Drive (ver
scripts_manuales/ingestar_recursos_drive.py).

A diferencia de base_de_datos/semillas/generate_learning_paths_sql.py (que
solo cubría 10 códigos de curso hardcodeados a partir de CSVs manuales),
este script parte de cualquier curso que tenga un recurso tipo Silabo real
en Drive: extrae el sílabo con Gemini Vision (modo "silabo", el mismo que
usa app/rag/cargar_compendio.py), lo estructura en unidades semanales con
OpenAI (mismo patrón de generación JSON que app/routers/evaluaciones.py), e
inserta las filas en learning_path_steps.

Deduplicación: cuando el mismo PDF de sílabo aparece en varios cursos (un
código compartido entre carreras, ej. FB303_SIS/_SOFT/_IND), se extrae y
estructura UNA sola vez, y el mismo resultado se inserta para cada curso_id
real que lo necesita — evita triplicar el costo de la ingesta.

Alcance: solo cursos que hoy no tienen NINGUNA fila en learning_path_steps
Y que tienen un recurso tipo Silabo con drive_file_id. Los demás (sin
sílabo disponible en Drive) quedan fuera — no hay de dónde generar su ruta.
"""
import argparse
import json
import os
import sys
import tempfile
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.core.database import get_admin_client
from app.core.llm import generar_ingesta, texto_ingesta
from app.rag.extractor import SyllabusExtractor

API_KEY_DRIVE = os.getenv("GOOGLE_DRIVE_API_KEY")


PROMPT_ESTRUCTURAR = """Eres un asistente que convierte el contenido de un sílabo universitario (en Markdown) en una ruta de aprendizaje semana a semana.

Devuelve ÚNICAMENTE un JSON con esta forma exacta:
{
  "unidades": [
    {"title": "Unidad 1: <nombre del tema>", "description": "<1-2 frases>", "duration": "4h", "topics": ["tema 1", "tema 2", "tema 3"]}
  ]
}

REGLAS:
- Una unidad por cada bloque temático real del sílabo (normalmente entre 4 y 10 unidades). No inventes contenido que no esté en el sílabo.
- "title" siempre con el formato "Unidad N: <nombre>".
- "topics": 3 a 6 subtemas concretos, en minúscula, sin numerar.
- "duration": estimado en horas, formato corto como "4h".
- Si el sílabo no tiene suficiente contenido reconocible, devuelve {"unidades": []}.

SÍLABO:
"""


def descargar_pdf(drive_file_id: str) -> str:
    url = f"https://www.googleapis.com/drive/v3/files/{drive_file_id}"
    resp = requests.get(url, params={"alt": "media", "key": API_KEY_DRIVE}, timeout=60)
    resp.raise_for_status()
    fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
    with os.fdopen(fd, "wb") as f:
        f.write(resp.content)
    return tmp_path


def estructurar_silabo(markdown: str) -> list:
    crudo = texto_ingesta(generar_ingesta(
        prompt=PROMPT_ESTRUCTURAR + markdown[:12000],
        system="Responde ÚNICAMENTE con JSON válido, sin texto adicional ni bloques de código.",
        max_tokens=8000,
    ))
    data = json.loads(crudo)
    return data.get("unidades", [])


def obtener_cursos_sin_ruta(sb) -> list:
    cursos = sb.table("cursos").select("id, code, name").execute().data
    steps = sb.table("learning_path_steps").select("curso_id").execute().data
    con_ruta = set(x["curso_id"] for x in steps)
    return [c for c in cursos if c["id"] not in con_ruta]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None, help="Procesa como máximo N archivos de sílabo únicos en esta corrida.")
    args = parser.parse_args()

    if not API_KEY_DRIVE:
        print("Falta GOOGLE_DRIVE_API_KEY en el .env")
        return

    sb = get_admin_client()
    extractor = SyllabusExtractor(rpm=8)

    sin_ruta = obtener_cursos_sin_ruta(sb)
    sin_ruta_ids = [c["id"] for c in sin_ruta]
    print(f"Cursos sin ruta de aprendizaje: {len(sin_ruta)}")

    silabos = (
        sb.table("recursos")
        .select("id, curso_id, titulo, drive_file_id")
        .eq("tipo", "Silabo")
        .in_("curso_id", sin_ruta_ids)
        .not_.is_("drive_file_id", "null")
        .execute()
        .data
    )

    por_archivo = defaultdict(list)
    titulo_por_archivo = {}
    for s in silabos:
        por_archivo[s["drive_file_id"]].append(s["curso_id"])
        titulo_por_archivo[s["drive_file_id"]] = s["titulo"]

    items = list(por_archivo.items())
    if args.limit is not None:
        items = items[: args.limit]

    print(f"Archivos de sílabo únicos a procesar: {len(items)} de {len(por_archivo)} "
          f"(cubren {sum(len(v) for _, v in items)} cursos)\n")

    procesados = 0
    fallidos = 0

    for i, (drive_file_id, curso_ids) in enumerate(items, 1):
        print(f"[{i}/{len(items)}] {titulo_por_archivo[drive_file_id]} -> cursos {curso_ids}")
        tmp_path = None
        try:
            tmp_path = descargar_pdf(drive_file_id)
            texto = extractor.extract_text(tmp_path, modo="silabo")
            if not texto or not texto.strip():
                print("  Sin texto extraído. Se salta.")
                fallidos += 1
                continue

            unidades = estructurar_silabo(texto)
            if not unidades:
                print("  El modelo no devolvió unidades. Se salta.")
                fallidos += 1
                continue

            filas = []
            for cid in curso_ids:
                for idx, u in enumerate(unidades, 1):
                    filas.append({
                        "curso_id": cid,
                        "title": u.get("title", f"Unidad {idx}"),
                        "description": u.get("description", ""),
                        "duration": u.get("duration", "4h"),
                        "order_index": idx,
                        "topics": u.get("topics", []),
                        "icon": "book",
                    })

            sb.table("learning_path_steps").insert(filas).execute()
            procesados += 1
            print(f"  OK: {len(unidades)} unidades x {len(curso_ids)} curso(s) = {len(filas)} filas insertadas.")

        except Exception as e:
            print(f"  Error: {e}")
            fallidos += 1
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)

    print("\n=== Resumen ===")
    print(f"Archivos procesados: {procesados}")
    print(f"Fallidos/saltados: {fallidos}")


if __name__ == "__main__":
    main()
