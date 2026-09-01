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
import asyncio
import logging
import os
import random
import shutil
import sys
import tempfile
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.core.database import get_admin_client
from app.rag.extractor import SyllabusExtractor
from app.rag.extraction_checkpoint import ExtractionCheckpoint
from app.rag.chunker import SyllabusChunker
from app.rag.embedder import SyllabusEmbedder
from app.rag.cost_tracker import cost_tracker
from app.rag.ingest import SyllabusIngestor

API_KEY = os.getenv("GOOGLE_DRIVE_API_KEY")
TIPOS_OBJETIVO = ["Silabo", "Libro", "Teoria", "Apunte", "Compendio", "Examen", "Practica", "examen", "practica"]
TIPOS_NATIVOS = {"Silabo", "Libro", "Teoria", "Apunte", "Compendio"}
MAX_FALLOS_SEGUIDOS = 3  # señal heurística de cuota diaria agotada
DOWNLOAD_DIR = Path(tempfile.gettempdir()) / "univia_rag_drive"


class RecursoInaccesible(Exception):
    """El archivo de Drive no es accesible por permisos o ya no existe."""


def descargar_pdf(
    drive_file_id: str,
    connect_timeout: int = 15,
    read_timeout: int = 180,
    max_retries: int = 5,
) -> str:
    """Descarga el PDF a un archivo temporal y devuelve su ruta."""
    url = f"https://www.googleapis.com/drive/v3/files/{drive_file_id}"
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    tmp_path = DOWNLOAD_DIR / f"{drive_file_id}.pdf"

    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.get(
                url,
                params={"alt": "media", "key": API_KEY},
                timeout=(connect_timeout, read_timeout),
            )
            if resp.status_code in (403, 404, 410):
                raise RecursoInaccesible(
                    f"Drive respondió HTTP {resp.status_code} para {drive_file_id}"
                )
            resp.raise_for_status()
            tmp_path.write_bytes(resp.content)
            return str(tmp_path)
        except requests.RequestException as exc:
            status = exc.response.status_code if exc.response is not None else None
            if status not in (429, 500, 502, 503, 504) or attempt == max_retries:
                raise
            retry_after = exc.response.headers.get("Retry-After") if exc.response is not None else None
            delay = float(retry_after) if retry_after and retry_after.isdigit() else min(60, 2 ** attempt)
            time.sleep(delay + random.uniform(0, 1))

    raise RuntimeError(f"No se pudo descargar {drive_file_id}")


def parse_course_ids(value: str) -> list[int]:
    """Convierte uno o varios IDs separados por comas en enteros."""
    try:
        course_ids = [int(item.strip()) for item in value.split(",") if item.strip()]
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            "Los IDs de curso deben ser enteros separados por comas."
        ) from exc
    if not course_ids:
        raise argparse.ArgumentTypeError("Debe indicar al menos un ID de curso.")
    return course_ids


def obtener_candidatos(
    sb, course_ids: list[int] | None = None, force: bool = False
) -> list:
    """Recursos Examen/Practica con curso_id y drive_file_id resueltos,
    deduplicados por drive_file_id (una fila representativa por archivo)."""
    filas = []
    page_size = 1000
    inicio = 0
    while True:
        query = (
            sb.table("recursos")
            .select(
                "id, titulo, tipo, curso_id, drive_file_id, drive_modified_time, "
                "rag_status, rag_processed_modified_time"
            )
            .in_("tipo", TIPOS_OBJETIVO)
            .not_.is_("curso_id", "null")
            .not_.is_("drive_file_id", "null")
        )
        if course_ids:
            query = query.in_("curso_id", course_ids)
        if not force:
            query = query.in_("rag_status", ["pending", "failed"])
        resp = (
            query.order("id")
            .range(inicio, inicio + page_size - 1)
            .execute()
        )
        pagina = resp.data or []
        filas.extend(pagina)
        if len(pagina) < page_size:
            break
        inicio += page_size

    por_archivo = {}
    for row in filas:
        fid = row["drive_file_id"]
        if fid not in por_archivo or row["curso_id"] < por_archivo[fid]["curso_id"]:
            por_archivo[fid] = row
    return sorted(por_archivo.values(), key=lambda row: (row["drive_file_id"], row["id"]))


def ya_procesado(sb, recurso_id: int) -> bool:
    resp = sb.table("resource_chunks").select("id").eq("recurso_id", recurso_id).limit(1).execute()
    return bool(resp.data)


def necesita_procesamiento(sb, recurso: dict, force: bool = False) -> bool:
    if force or recurso.get("rag_status") != "complete":
        return True
    if recurso.get("drive_modified_time") != recurso.get("rag_processed_modified_time"):
        return True
    return not ya_procesado(sb, recurso["id"])


def actualizar_estado(sb, recurso_id: int, estado: str, max_intentos: int = 3) -> None:
    """Actualiza el rag_status del recurso con reintentos frente a microcortes
    de red o fallos de conexión SSL con Supabase."""
    for intento in range(1, max_intentos + 1):
        try:
            sb.table("recursos").update({"rag_status": estado}).eq("id", recurso_id).execute()
            return
        except Exception as e:
            logging.error(
                f"Error actualizando estado del recurso {recurso_id} a '{estado}' "
                f"(intento {intento}/{max_intentos}): {e}."
            )
            if intento < max_intentos:
                time.sleep(2)


def reclamar_recurso(sb, recurso_id: int, force: bool = False) -> bool:
    """Reclama atómicamente una fila antes de iniciar su procesamiento."""
    query = sb.table("recursos").update({"rag_status": "processing"}).eq(
        "id", recurso_id
    )
    if not force:
        query = query.in_("rag_status", ["pending", "failed"])
    resp = query.execute()
    return bool(resp.data)


def preparar_checkpoints(pdf_path: str, modified_time: str | None, resume: bool) -> None:
    checkpoint_dir = Path(pdf_path).parent / f"{Path(pdf_path).stem}_checkpoints"
    marker = checkpoint_dir / ".drive_modified_time"
    version_anterior = marker.read_text(encoding="utf-8") if marker.exists() else None
    version_actual = modified_time or ""
    if checkpoint_dir.exists() and (not resume or version_anterior != version_actual):
        shutil.rmtree(checkpoint_dir)
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    marker.write_text(version_actual, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Procesa como máximo N recursos en esta corrida (para pilotos chicos antes de soltar el lote completo).",
    )
    parser.add_argument("--max-concurrency", type=int, default=4)
    parser.add_argument("--rpm", type=int, default=8)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--course_id",
        "--curso_id",
        dest="course_id",
        type=parse_course_ids,
        default=None,
        help="ID de curso o lista separada por comas (ej. 12,15).",
    )
    parser.add_argument("--connect-timeout", type=int, default=15)
    parser.add_argument("--read-timeout", type=int, default=180)
    parser.add_argument(
        "--vision-cost-per-call",
        type=float,
        default=float(os.getenv("VISION_COST_PER_CALL", "0")),
    )
    args = parser.parse_args()

    if not API_KEY:
        print("Falta GOOGLE_DRIVE_API_KEY en el .env")
        return

    sb = get_admin_client()
    extractor = SyllabusExtractor(rpm=args.rpm)
    chunker = SyllabusChunker()
    embedder = SyllabusEmbedder()
    ingestor = SyllabusIngestor(client=sb)

    candidatos = obtener_candidatos(sb, args.course_id, args.force)
    print(f"Candidatos únicos (Examen/Practica, curso emparejado): {len(candidatos)}")

    pendientes = [c for c in candidatos if necesita_procesamiento(sb, c, args.force)]
    print(f"Ya procesados anteriormente (se saltan): {len(candidatos) - len(pendientes)}")
    if args.limit is not None:
        pendientes = pendientes[:args.limit]
        print(f"Limitado a {args.limit} para esta corrida.")
    print(f"Pendientes en esta corrida: {len(pendientes)}\n")

    if args.dry_run:
        for recurso in pendientes:
            print(
                f"[DRY-RUN] {recurso['id']} | {recurso['drive_file_id']} | "
                f"{recurso['titulo']}"
            )
        return

    procesados = 0
    fallidos = 0
    omitidos = 0
    omitidos_reclamo = 0
    fallos_seguidos = 0
    paginas_nativas = 0
    paginas_vision = 0
    llamadas_vision = 0
    inicio_corrida = time.perf_counter()

    for i, recurso in enumerate(pendientes, 1):
        print(f"[{i}/{len(pendientes)}] {recurso['titulo']} (recurso_id={recurso['id']}, curso_id={recurso['curso_id']})")
        try:
            if not reclamar_recurso(sb, recurso["id"], args.force):
                print("  [OMITIDO] El recurso fue reclamado por otro worker.")
                omitidos_reclamo += 1
                continue
            inicio_descarga = time.perf_counter()
            tmp_path = descargar_pdf(
                recurso["drive_file_id"],
                connect_timeout=args.connect_timeout,
                read_timeout=args.read_timeout,
            )
            tiempo_descarga = time.perf_counter() - inicio_descarga
            preparar_checkpoints(
                tmp_path, recurso.get("drive_modified_time"), args.resume
            )

            inicio_extraccion = time.perf_counter()
            texto = asyncio.run(extractor.extract_text_async(
                tmp_path,
                modo="examenes",
                hybrid=True,
                forzar_nativo=recurso["tipo"] in TIPOS_NATIVOS,
                max_concurrency=args.max_concurrency,
            ))
            tiempo_extraccion = time.perf_counter() - inicio_extraccion
            metricas = extractor.last_run_stats
            paginas_nativas += metricas.get("native_pages", 0)
            paginas_vision += metricas.get("vision_pages", 0)
            llamadas_vision += metricas.get("vision_calls", 0)

            if not texto or not texto.strip():
                print("  Sin texto extraído (posible cuota agotada o página no legible). Se salta.")
                actualizar_estado(sb, recurso["id"], "failed")
                fallidos += 1
                fallos_seguidos += 1
                if fallos_seguidos >= MAX_FALLOS_SEGUIDOS:
                    print(f"\n{MAX_FALLOS_SEGUIDOS} fallos seguidos — probable cuota diaria de Gemini agotada.")
                    print("Deteniendo la corrida. Progreso guardado: vuelve a correr este script mañana.")
                    break
                continue

            total_paginas = int(metricas.get("total_pages", 0))
            paginas_completadas = ExtractionCheckpoint(tmp_path).completed_pages()
            paginas_esperadas = set(range(1, total_paginas + 1))
            if paginas_completadas != paginas_esperadas:
                faltantes = sorted(paginas_esperadas - paginas_completadas)
                inesperadas = sorted(paginas_completadas - paginas_esperadas)
                print(
                    "  [ERROR] Secuencia de páginas inconsistente. "
                    f"Faltantes: {faltantes}; inesperadas: {inesperadas}. "
                    "No se generarán embeddings ni se llamará a la RPC."
                )
                actualizar_estado(sb, recurso["id"], "failed")
                fallidos += 1
                fallos_seguidos += 1
                continue

            chunks = chunker.chunk_text(texto)
            if not chunks:
                print("  El chunker no generó fragmentos. Se salta.")
                actualizar_estado(sb, recurso["id"], "failed")
                fallidos += 1
                continue

            inicio_embeddings = time.perf_counter()
            embeddings = embedder.embedding_generator(chunks)
            tiempo_embeddings = time.perf_counter() - inicio_embeddings
            if not embeddings:
                print("  El embedder no generó vectores. Se salta.")
                actualizar_estado(sb, recurso["id"], "failed")
                fallidos += 1
                continue

            inicio_insercion = time.perf_counter()
            insertados = ingestor.replace(
                embeddings,
                recurso_id=recurso["id"],
                curso_id=recurso["curso_id"],
                drive_modified_time=recurso.get("drive_modified_time"),
            )
            tiempo_insercion = time.perf_counter() - inicio_insercion
            if insertados != len(embeddings):
                raise RuntimeError(
                    f"La RPC confirmó {insertados}/{len(embeddings)} chunks"
                )

            procesados += 1
            fallos_seguidos = 0
            print(
                f"  OK: {insertados} chunks | páginas native/vision: "
                f"{metricas.get('native_pages', 0)}/{metricas.get('vision_pages', 0)} | "
                f"tiempos descarga/extracción/embedding/BD: {tiempo_descarga:.1f}s/"
                f"{tiempo_extraccion:.1f}s/{tiempo_embeddings:.1f}s/{tiempo_insercion:.1f}s | "
                f"tokens input/output/embeddings: {cost_tracker.tokens_vision_input}/"
                f"{cost_tracker.tokens_vision_output}/{cost_tracker.tokens_embeddings} | "
                f"costo acumulado: ${cost_tracker.obtener_costo_total_usd():.4f} USD"
            )

        except RecursoInaccesible as e:
            print(f"  [OMITIDO] Archivo privado o sin permisos en Drive: {e}")
            actualizar_estado(sb, recurso["id"], "skipped_permissions")
            omitidos += 1
        except Exception as e:
            print(f"  Error procesando recurso {recurso['id']}: {e}")
            actualizar_estado(sb, recurso["id"], "failed")
            fallidos += 1
            fallos_seguidos += 1
            if fallos_seguidos >= MAX_FALLOS_SEGUIDOS:
                print(f"\n{MAX_FALLOS_SEGUIDOS} fallos seguidos — deteniendo la corrida.")
                break
    print("\n=== Resumen ===")
    print(f"Candidatos totales: {len(candidatos)}")
    print(f"Recursos complete: {procesados}")
    print(f"Recursos failed: {fallidos}")
    print(f"Recursos skipped_permissions: {omitidos}")
    print(f"Recursos omitidos por reclamo de otro worker: {omitidos_reclamo}")
    print(f"Páginas pypdf_nativo: {paginas_nativas}")
    print(f"Páginas gpt-4.1-mini: {paginas_vision}")
    print(f"Llamadas Vision: {llamadas_vision}")
    print(f"Tokens Vision input: {cost_tracker.tokens_vision_input}")
    print(f"Tokens Vision output: {cost_tracker.tokens_vision_output}")
    print(f"Tokens embeddings: {cost_tracker.tokens_embeddings}")
    print(f"Costo total acumulado: ${cost_tracker.obtener_costo_total_usd():.4f} USD")
    print(f"Tiempo total: {time.perf_counter() - inicio_corrida:.1f}s")


if __name__ == "__main__":
    main()
