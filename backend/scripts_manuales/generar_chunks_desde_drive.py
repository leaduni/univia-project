"""
Conecta los recursos ya ingeridos desde Drive (tabla `recursos`) con el RAG
del generador de evaluaciones (tabla `resource_chunks`).

WRAPPER DELGADO (Fase 1): toda la orquestación por documento vive en
`app/rag/pipeline.py` (IngestionPipeline). Este script conserva intactos:
  - los flags CLI históricos (--limit, --max-concurrency, --rpm, --resume,
    --force, --dry-run, --course_id, --connect-timeout, --read-timeout,
    --vision-cost-per-call),
  - la selección/deduplicación de candidatos y la regla "necesita_procesamiento",
  - el freno tras MAX_FALLOS_SEGUIDOS y el resumen final de costos.

Deduplicación: cuando el mismo archivo de Drive generó varias filas de
`recursos` (un curso con el mismo código en varias carreras), se procesa una
sola vez (la de menor curso_id) — search_resource_chunks_by_nombre empareja
por NOMBRE de curso, no por curso_id (ver base_de_datos/rag/rag_search_by_nombre.sql).

Reanudable: checkpoints por página en disco + rag_status en `recursos`. Si la
cuota diaria de Gemini se agota, el script se detiene tras unos pocos fallos
seguidos y se puede volver a correr al día siguiente sin flags manuales.
"""
import argparse
import asyncio
import logging
import os
import re
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.core.database import get_admin_client
from app.rag.extractor import SyllabusExtractor
from app.rag.cost_tracker import cost_tracker
from app.rag.pipeline import (
    ESTADO_COMPLETE,
    ESTADO_NETWORK_ERROR,
    ESTADO_RECLAMADO_POR_OTRO,
    ESTADO_SKIPPED_PERMISSIONS,
    ConfigIngesta,
    FuenteDocumento,
    IngestionPipeline,
)

TIPOS_OBJETIVO = ["Silabo", "Libro", "Teoria", "Apunte", "Compendio", "Examen", "Practica", "examen", "practica"]
TIPOS_NATIVOS = {"Silabo", "Libro", "Teoria", "Apunte", "Compendio"}
MAX_FALLOS_SEGUIDOS = 3  # señal heurística de cuota diaria agotada


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


def extraer_drive_file_id(url: str | None) -> str | None:
    """Extrae el ID de archivo desde una URL de visualización de Drive."""
    if not url:
        return None
    match = re.search(r"/d/([A-Za-z0-9_-]+)", url)
    return match.group(1) if match else None


def obtener_candidatos(
    sb,
    course_ids: list[int] | None = None,
    force: bool = False,
    dry_run: bool = False,
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
                "id, titulo, tipo, curso_id, drive_file_id, preview_url, url_drive, "
                "drive_modified_time, "
                "rag_status, rag_processed_modified_time"
            )
            .in_("tipo", TIPOS_OBJETIVO)
            .not_.is_("curso_id", "null")
        )
        if course_ids:
            query = query.in_("curso_id", course_ids)
        if not force:
            query = query.in_(
                "rag_status", ["pending", "failed", "skipped_permissions"]
            )
        resp = (
            query.order("id")
            .range(inicio, inicio + page_size - 1)
            .execute()
        )
        pagina = resp.data or []
        for recurso in pagina:
            drive_file_id = recurso.get("drive_file_id") or extraer_drive_file_id(
                recurso.get("preview_url")
            ) or extraer_drive_file_id(recurso.get("url_drive"))
            if not drive_file_id:
                logging.warning(
                    "Recurso %s sin drive_file_id ni URL de Drive utilizable.",
                    recurso["id"],
                )
                continue
            if not recurso.get("drive_file_id"):
                recurso["drive_file_id"] = drive_file_id
                if not dry_run:
                    (
                        sb.table("recursos")
                        .update({"drive_file_id": drive_file_id})
                        .eq("id", recurso["id"])
                        .execute()
                    )
            filas.append(recurso)
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--limit", "--limite", type=int, default=None,
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

    sb = get_admin_client()
    extractor = SyllabusExtractor(rpm=args.rpm)
    pipeline = IngestionPipeline(sb, extractor=extractor)

    candidatos = obtener_candidatos(sb, args.course_id, args.force, args.dry_run)
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
        inicio_doc = time.perf_counter()
        config = ConfigIngesta(
            recurso_id=recurso["id"],
            curso_id=recurso["curso_id"],
            tipo_recurso=recurso.get("tipo") or "Examen",
            modo_ocr="examenes",
            modo_extraccion="async",
            rpm=args.rpm,
            hybrid=True,
            forzar_nativo=recurso["tipo"] in TIPOS_NATIVOS,
            max_concurrency=args.max_concurrency,
            resume=args.resume,
            preparar_checkpoints_drive=True,
            metodo_ingesta="replace",
            reclamar=True,
            force=args.force,
            al_fallar="marcar_fallido",
            connect_timeout=args.connect_timeout,
            read_timeout=args.read_timeout,
        )
        fuente = FuenteDocumento(
            tipo="drive",
            drive_file_id=recurso["drive_file_id"],
            drive_modified_time=recurso.get("drive_modified_time"),
        )
        resultado = asyncio.run(pipeline.procesar_documento(fuente, config))
        tiempo_doc = time.perf_counter() - inicio_doc

        paginas_nativas += resultado.paginas_nativas
        paginas_vision += resultado.paginas_vision
        llamadas_vision += resultado.llamadas_vision

        if resultado.estado == ESTADO_COMPLETE:
            procesados += 1
            fallos_seguidos = 0
            print(
                f"  OK: {resultado.chunks_insertados} chunks | páginas native/vision: "
                f"{resultado.paginas_nativas}/{resultado.paginas_vision} | "
                f"tiempo documento: {tiempo_doc:.1f}s | "
                f"tokens input/output/embeddings: {cost_tracker.tokens_vision_input}/"
                f"{cost_tracker.tokens_vision_output}/{cost_tracker.tokens_embeddings} | "
                f"costo acumulado: ${cost_tracker.obtener_costo_total_usd():.4f} USD"
            )
            continue

        if resultado.estado == ESTADO_SKIPPED_PERMISSIONS:
            print(f"  [OMITIDO] Archivo privado o sin permisos en Drive: {resultado.detalle}")
            omitidos += 1
            continue

        if resultado.estado == ESTADO_RECLAMADO_POR_OTRO:
            print("  [OMITIDO] El recurso fue reclamado por otro worker.")
            omitidos_reclamo += 1
            continue

        if resultado.estado == ESTADO_NETWORK_ERROR:
            print(f"  [RED] No se pudo descargar el recurso {recurso['id']}: {resultado.detalle}")
            fallidos += 1
            # Los errores de red no rompen la racha de cuota (igual que antes).
            continue

        # Resto: fallos reales.
        if resultado.causa_fallo == "empty_extraction":
            print("  Sin texto extraído (posible cuota agotada o página no legible). Se salta.")
        elif resultado.causa_fallo == "paginas_incompletas":
            print(f"  [ERROR] {resultado.detalle}")
        elif resultado.causa_fallo == "no_chunks":
            print("  El chunker no generó fragmentos. Se salta.")
        elif resultado.causa_fallo == "no_embeddings":
            print("  El embedder no generó vectores. Se salta.")
        else:
            print(f"  Error procesando recurso {recurso['id']}: {resultado.detalle}")
        fallidos += 1
        fallos_seguidos += 1
        if fallos_seguidos >= MAX_FALLOS_SEGUIDOS:
            if resultado.causa_fallo == "empty_extraction":
                print(f"\n{MAX_FALLOS_SEGUIDOS} fallos seguidos — probable cuota diaria de Gemini agotada.")
                print("Deteniendo la corrida. Progreso guardado: vuelve a correr este script mañana.")
            else:
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
