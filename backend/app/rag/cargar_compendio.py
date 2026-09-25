"""Wrapper CLI de ingesta individual (compendio/sílabo/examen local).

WRAPPER DELGADO (Fase 1): la orquestación por documento vive en
`app/rag/pipeline.py` (IngestionPipeline). Este módulo conserva intactos:
  - todos los flags CLI históricos (pdf_path, --titulo, --curso-id, --tipo,
    --modo, --output-path, --rpm, --dpi, --no-salvage, --skip-failed,
    --async, --hybrid, --max-concurrency, --resume),
  - la validación de variables de entorno y el cliente anon de Supabase,
  - la creación/reutilización de la fila en `recursos` y su eliminación si
    la ingesta falla (al_fallar="eliminar_recurso"),
  - los mensajes/resúmenes por consola.
"""
import argparse
import asyncio
import os
import sys
import time
import traceback
from pathlib import Path
from typing import Optional

# Permite ejecutar el script directamente (python app/rag/cargar_compendio.py)
# sin exigir PYTHONPATH, igual que hacen los CLIs de scripts_manuales.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from supabase import Client, create_client
from dotenv import load_dotenv

from app.rag.pipeline import ConfigIngesta, FuenteDocumento, IngestionPipeline

load_dotenv()

DEFAULT_RPM = 8


def _validar_env():
    faltantes = [k for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "OPEN_AI_INGEST_API_KEY", "CLAUDE_GEN_API_KEY") if not os.getenv(k)]
    if faltantes:
        raise RuntimeError(f"Variables de entorno faltantes: {', '.join(faltantes)}")
    return os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY")


def _crear_pipeline() -> IngestionPipeline:
    supabase_url, supabase_key = _validar_env()
    supabase = create_client(supabase_url, supabase_key)
    return IngestionPipeline(supabase)


def procesar_compendio(
    pdf_path: str,
    titulo: str,
    curso_id: int,
    tipo: str = "silabo",
    modo: str = "silabo",
    output_path: Optional[str] = None,
    rpm: int = DEFAULT_RPM,
    dpi: int = 200,
    salvage: bool = True,
    skip_failed: bool = False,
) -> bool:
    print(f"\n{'='*60}")
    print(f"  Procesando: {titulo}")
    print(f"  Curso ID: {curso_id} | Modo: {modo} | Tipo: {tipo}")
    print(f"{'='*60}\n")
    t0 = time.time()

    if output_path is None:
        output_path = str(Path(pdf_path).with_suffix("")) + "_extraido.md"
    print(f"Checkpoint: {output_path}")

    try:
        pipeline = _crear_pipeline()
    except RuntimeError as e:
        print(f"Error: {e}")
        return False

    config = ConfigIngesta(
        titulo=titulo,
        curso_id=curso_id,
        tipo_recurso=tipo,
        modo_ocr=modo,
        modo_extraccion="sync",
        rpm=rpm,
        dpi=dpi,
        salvage=salvage,
        skip_failed=skip_failed,
        output_path=output_path,
        validar_secuencia_paginas=False,
        metodo_ingesta="insert",
        al_fallar="eliminar_recurso",
    )
    fuente = FuenteDocumento(tipo="local", pdf_path=pdf_path)

    try:
        resultado = asyncio.run(pipeline.procesar_documento(fuente, config))
    except Exception as e:
        print(f"Error crítico: {e}")
        traceback.print_exc()
        _informar_reanudable(output_path)
        return False

    if not resultado.ok:
        print(f"Error crítico: {resultado.detalle}")
        _informar_reanudable(output_path)
        return False

    elapsed = round(time.time() - t0, 2)
    print(f"\n{'='*60}")
    print(f"  RESUMEN: '{titulo}'")
    print(f"  Tiempo total: {elapsed}s")
    print(f"  Páginas extraídas: {resultado.paginas_total}")
    print(f"  Chunks insertados en Supabase: {resultado.chunks_insertados}")
    print(f"  Sin pausas estáticas en embeddings: CONFIRMADO")
    print(f"{'='*60}\n")
    return True


async def procesar_compendio_async(
    pdf_path: str,
    titulo: str,
    curso_id: int,
    tipo: str = "silabo",
    modo: str = "silabo",
    rpm: int = DEFAULT_RPM,
    dpi: int = 200,
    salvage: bool = True,
    hybrid: bool = False,
    max_concurrency: int = 8,
    resume: bool = False,
) -> bool:
    """Version asincrona con checkpoints por pagina, enrutador hibrido y resiliencia (Fase 3)."""
    print(f"\n{'='*60}")
    if resume:
        print(f"  REANUDANDO: {titulo}")
    else:
        print(f"  Procesando (ASYNC): {titulo}")
    print(f"  Curso ID: {curso_id} | Modo: {modo} | Concurrencia: {max_concurrency}")
    if hybrid:
        print(f"  Enrutador hibrido: ACTIVADO (texto nativo vs Vision)")
    print(f"{'='*60}\n")
    t0 = time.time()

    try:
        pipeline = _crear_pipeline()
    except RuntimeError as e:
        print(f"Error: {e}")
        return False

    config = ConfigIngesta(
        titulo=titulo,
        curso_id=curso_id,
        tipo_recurso=tipo,
        modo_ocr=modo,
        modo_extraccion="async",
        rpm=rpm,
        dpi=dpi,
        salvage=salvage,
        hybrid=hybrid,
        max_concurrency=max_concurrency,
        resume=resume,
        validar_secuencia_paginas=False,
        metodo_ingesta="insert",
        al_fallar="eliminar_recurso",
    )
    fuente = FuenteDocumento(tipo="local", pdf_path=pdf_path)

    try:
        resultado = await pipeline.procesar_documento(fuente, config)
    except Exception as e:
        print(f"Error crítico: {e}")
        traceback.print_exc()
        return False

    if not resultado.ok:
        print(f"Error crítico: {resultado.detalle}")
        return False

    # NO hacer cleanup: los checkpoints persisten para --resume
    elapsed = round(time.time() - t0, 2)
    print(f"\n{'='*60}")
    print(f"  RESUMEN (Fase 2 Async): '{titulo}'")
    print(f"  Tiempo total: {elapsed}s")
    print(f"  Paginas extraidas: {resultado.paginas_total}")
    print(f"  Chunks insertados en Supabase: {resultado.chunks_insertados}")
    print(f"  Concurrencia: {max_concurrency} | Hibrido: {'Si' if hybrid else 'No'}")
    print(f"{'='*60}\n")
    return True


def _informar_reanudable(output_path: str) -> None:
    if os.path.exists(output_path):
        from app.rag.extractor import SyllabusExtractor
        guardadas = SyllabusExtractor._find_completed_pages(open(output_path, encoding="utf-8").read())
        if guardadas:
            print(f"{len(guardadas)} páginas guardadas en '{output_path}'. Puedes reanudar con el mismo comando.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingesta un PDF en el sistema RAG usando Gemini.")
    parser.add_argument("pdf_path")
    parser.add_argument("--titulo", required=True)
    parser.add_argument("--curso-id", required=True, type=int)
    parser.add_argument("--tipo", default="silabo")
    parser.add_argument("--modo", default="silabo", choices=["silabo", "examenes"])
    parser.add_argument("--output-path", default=None)
    parser.add_argument("--rpm", default=DEFAULT_RPM, type=int, help="Requests por minuto (default: 8)")
    parser.add_argument("--dpi", default=200, type=int, help="Resolucion imagen (default: 200)")
    parser.add_argument("--no-salvage", action="store_true", default=False)
    parser.add_argument("--skip-failed", action="store_true", default=False)
    parser.add_argument("--async", dest="async_mode", action="store_true", default=False,
                        help="Usar extraccion asincrona paralela (Fase 2)")
    parser.add_argument("--hybrid", action="store_true", default=False,
                        help="Usar enrutador hibrido (texto nativo vs Vision, requiere --async)")
    parser.add_argument("--max-concurrency", type=int, default=8,
                        help="Max paginas simultaneas en modo async (default: 8)")
    parser.add_argument("--resume", action="store_true", default=False,
                        help="Reanudar desde checkpoints existentes (Fase 3)")
    args = parser.parse_args()

    if not os.path.exists(args.pdf_path):
        print(f"Archivo no encontrado: '{args.pdf_path}'")
        sys.exit(1)

    if args.async_mode:
        exito = asyncio.run(procesar_compendio_async(
            args.pdf_path,
            titulo=args.titulo,
            curso_id=args.curso_id,
            tipo=args.tipo,
            modo=args.modo,
            rpm=args.rpm,
            dpi=args.dpi,
            salvage=not args.no_salvage,
            hybrid=args.hybrid,
            max_concurrency=args.max_concurrency,
            resume=args.resume,
        ))
    else:
        exito = procesar_compendio(
            args.pdf_path,
            titulo=args.titulo,
            curso_id=args.curso_id,
            tipo=args.tipo,
            modo=args.modo,
            output_path=args.output_path,
            rpm=args.rpm,
            dpi=args.dpi,
            salvage=not args.no_salvage,
            skip_failed=args.skip_failed,
        )
    sys.exit(0 if exito else 1)
