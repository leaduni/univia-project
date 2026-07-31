"""
Conecta los recursos ya ingeridos desde Drive (tabla `recursos`) con el RAG
del generador de evaluaciones (tabla `resource_chunks`).

A diferencia de app/rag/cargar_compendio.py (que crea una fila nueva en
`recursos` por cada PDF procesado), este script REUTILIZA los `recurso_id`
que ya existen: descarga el PDF real desde Drive, lo transcribe con
SyllabusExtractor, lo trocea y embebe, e inserta los fragmentos apuntando al
recurso existente.

Alcance de esta corrida: solo tipo Examen/Practica con curso_id resuelto
(son los que el prompt de evaluaciones usa como "ejercicios reales de
referencia"; Libro/Compendio/Apunte/Silabo quedan para una fase posterior).

Deduplicación: cuando el mismo archivo de Drive generó varias filas de
`recursos` (un curso con el mismo código en varias carreras), se procesa una
sola vez (la de menor curso_id) — search_resource_chunks_by_nombre empareja
por NOMBRE de curso, no por curso_id, así que un solo recurso embebido ya
sirve para todas las variantes de carrera que comparten nombre
(ver base_de_datos/rag/rag_search_by_nombre.sql).

Reanudable: antes de procesar, se salta cualquier recurso que ya tenga filas
en resource_chunks. Si la cuota diaria de Gemini se agota, el script deja de
avanzar (la extracción empieza a devolver texto vacío) y se detiene solo tras
unos pocos fallos seguidos — se puede volver a correr al día siguiente sin
flags manuales.
"""
import argparse
import os
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.core.database import get_admin_client
from app.rag.extractor import SyllabusExtractor
from app.rag.chunker import SyllabusChunker
from app.rag.embedder import SyllabusEmbedder
from app.rag.ingest import SyllabusIngestor

API_KEY = os.getenv("GOOGLE_DRIVE_API_KEY")
TIPOS_OBJETIVO = ["Examen", "Practica"]
MAX_FALLOS_SEGUIDOS = 3  # señal heurística de cuota diaria agotada


def descargar_pdf(drive_file_id: str) -> str:
    """Descarga el PDF a un archivo temporal y devuelve su ruta."""
    url = f"https://www.googleapis.com/drive/v3/files/{drive_file_id}"
    resp = requests.get(url, params={"alt": "media", "key": API_KEY}, timeout=60)
    resp.raise_for_status()
    fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
    with os.fdopen(fd, "wb") as f:
        f.write(resp.content)
    return tmp_path


def obtener_candidatos(sb) -> list:
    """Recursos Examen/Practica con curso_id y drive_file_id resueltos,
    deduplicados por drive_file_id (una fila representativa por archivo)."""
    resp = (
        sb.table("recursos")
        .select("id, titulo, curso_id, drive_file_id")
        .in_("tipo", TIPOS_OBJETIVO)
        .not_.is_("curso_id", "null")
        .not_.is_("drive_file_id", "null")
        .execute()
    )
    por_archivo = {}
    for row in resp.data or []:
        fid = row["drive_file_id"]
        if fid not in por_archivo or row["curso_id"] < por_archivo[fid]["curso_id"]:
            por_archivo[fid] = row
    return list(por_archivo.values())


def ya_procesado(sb, recurso_id: int) -> bool:
    resp = sb.table("resource_chunks").select("id").eq("recurso_id", recurso_id).limit(1).execute()
    return bool(resp.data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Procesa como máximo N recursos en esta corrida (para pilotos chicos antes de soltar el lote completo).",
    )
    args = parser.parse_args()

    if not API_KEY:
        print("Falta GOOGLE_DRIVE_API_KEY en el .env")
        return

    sb = get_admin_client()
    extractor = SyllabusExtractor(rpm=8)
    chunker = SyllabusChunker()
    embedder = SyllabusEmbedder()
    ingestor = SyllabusIngestor()

    candidatos = obtener_candidatos(sb)
    print(f"Candidatos únicos (Examen/Practica, curso emparejado): {len(candidatos)}")

    pendientes = [c for c in candidatos if not ya_procesado(sb, c["id"])]
    print(f"Ya procesados anteriormente (se saltan): {len(candidatos) - len(pendientes)}")
    if args.limit is not None:
        pendientes = pendientes[:args.limit]
        print(f"Limitado a {args.limit} para esta corrida.")
    print(f"Pendientes en esta corrida: {len(pendientes)}\n")

    procesados = 0
    fallidos = 0
    fallos_seguidos = 0

    for i, recurso in enumerate(pendientes, 1):
        print(f"[{i}/{len(pendientes)}] {recurso['titulo']} (recurso_id={recurso['id']}, curso_id={recurso['curso_id']})")
        tmp_path = None
        try:
            tmp_path = descargar_pdf(recurso["drive_file_id"])
            texto = extractor.extract_text(tmp_path, modo="examenes")

            if not texto or not texto.strip():
                print("  Sin texto extraído (posible cuota agotada o página no legible). Se salta.")
                fallidos += 1
                fallos_seguidos += 1
                if fallos_seguidos >= MAX_FALLOS_SEGUIDOS:
                    print(f"\n{MAX_FALLOS_SEGUIDOS} fallos seguidos — probable cuota diaria de Gemini agotada.")
                    print("Deteniendo la corrida. Progreso guardado: vuelve a correr este script mañana.")
                    break
                continue

            chunks = chunker.chunk_text(texto)
            if not chunks:
                print("  El chunker no generó fragmentos. Se salta.")
                fallidos += 1
                continue

            embeddings = embedder.embedding_generator(chunks)
            if not embeddings:
                print("  El embedder no generó vectores. Se salta.")
                fallidos += 1
                continue

            if not ingestor.ingest(embeddings, recurso_id=recurso["id"], curso_id=recurso["curso_id"]):
                print("  El ingestor reportó fallo. Se salta.")
                fallidos += 1
                continue

            procesados += 1
            fallos_seguidos = 0
            print(f"  OK: {len(embeddings)} fragmentos insertados.")

        except Exception as e:
            print(f"  Error procesando recurso {recurso['id']}: {e}")
            fallidos += 1
            fallos_seguidos += 1
            if fallos_seguidos >= MAX_FALLOS_SEGUIDOS:
                print(f"\n{MAX_FALLOS_SEGUIDOS} fallos seguidos — deteniendo la corrida.")
                break
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)

    print("\n=== Resumen ===")
    print(f"Candidatos totales: {len(candidatos)}")
    print(f"Procesados en esta corrida: {procesados}")
    print(f"Fallidos/saltados: {fallidos}")


if __name__ == "__main__":
    main()
