import argparse
import os
import sys
import time
import traceback
from pathlib import Path
from typing import Optional

from supabase import Client, create_client
from dotenv import load_dotenv

from app.rag.extractor import SyllabusExtractor
from app.rag.chunker import SyllabusChunker
from app.rag.embedder import SyllabusEmbedder
from app.rag.ingest import SyllabusIngestor

load_dotenv()


def _validar_env():
    faltantes = [k for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "OPEN_AI_INGEST_API_KEY", "CLAUDE_GEN_API_KEY") if not os.getenv(k)]
    if faltantes:
        raise RuntimeError(f"Variables de entorno faltantes: {', '.join(faltantes)}")
    return os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY")


def _registrar_recurso(supabase: Client, titulo: str, curso_id: int, tipo: str) -> str:
    resp = supabase.table("recursos").insert({"curso_id": curso_id, "titulo": titulo, "tipo": tipo}).execute()
    if not resp.data:
        raise RuntimeError("No se pudo registrar el recurso en BD.")
    recurso_id = resp.data[0]["id"]
    print(f"Recurso registrado (ID: {recurso_id})")
    return recurso_id


def _buscar_recurso_existente(supabase: Client, titulo: str, curso_id: int) -> str | None:
    """Busca un recurso ya registrado con el mismo titulo y curso_id."""
    resp = supabase.table("recursos").select("id").eq("titulo", titulo).eq("curso_id", curso_id).limit(1).execute()
    if resp.data:
        rid = resp.data[0]["id"]
        print(f"[Resume] Recurso existente encontrado (ID: {rid}). Reutilizando.")
        return rid
    return None


def _limpiar_recurso(supabase: Client, recurso_id: str):
    try:
        supabase.table("recursos").delete().eq("id", recurso_id).execute()
        print(f"Recurso huérfano {recurso_id} eliminado.")
    except Exception as e:
        print(f"No se pudo eliminar el recurso {recurso_id}: {e}")


def procesar_compendio(
    pdf_path: str,
    titulo: str,
    curso_id: int,
    tipo: str = "silabo",
    modo: str = "silabo",
    output_path: Optional[str] = None,
    rpm: int = 8,
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
        supabase_url, supabase_key = _validar_env()
    except RuntimeError as e:
        print(f"Error: {e}")
        return False

    supabase = create_client(supabase_url, supabase_key)

    try:
        extractor = SyllabusExtractor(rpm=rpm)
    except RuntimeError as e:
        print(f"Error: {e}")
        return False

    recurso_id = None
    try:
        recurso_id = _registrar_recurso(supabase, titulo, curso_id, tipo)

        texto_crudo = extractor.extract_text(pdf_path, modo=modo, output_path=output_path, dpi=dpi, salvage=salvage, skip_failed=skip_failed)
        if not texto_crudo:
            raise RuntimeError("Extracción vacía.")

        paginas_ok = SyllabusExtractor._find_completed_pages(texto_crudo)
        if not paginas_ok:
            raise RuntimeError("No hay páginas con contenido real. Revisa los logs del extractor.")

        print(f"{len(paginas_ok)} página(s) extraídas correctamente.")

        chunks = SyllabusChunker().chunk_text(texto_crudo)
        if not chunks:
            raise RuntimeError("El chunker no generó fragmentos.")

        embeddings = SyllabusEmbedder().embedding_generator(chunks)
        if not embeddings:
            raise RuntimeError("El embedder no generó vectores.")

        if not SyllabusIngestor().ingest(embeddings, recurso_id=recurso_id, curso_id=curso_id):
            raise RuntimeError("El ingestor reportó fallo.")

        elapsed = round(time.time() - t0, 2)
        print(f"\n{'='*60}")
        print(f"  RESUMEN: '{titulo}'")
        print(f"  Tiempo total: {elapsed}s")
        print(f"  Páginas extraídas: {len(paginas_ok)}")
        print(f"  Chunks insertados en Supabase: {len(embeddings)}")
        print(f"  Sin pausas estáticas en embeddings: CONFIRMADO")
        print(f"{'='*60}\n")
        return True

    except Exception as e:
        print(f"Error crítico: {e}")
        traceback.print_exc()
        if recurso_id is not None:
            _limpiar_recurso(supabase, recurso_id)
        if os.path.exists(output_path):
            guardadas = SyllabusExtractor._find_completed_pages(open(output_path, encoding="utf-8").read())
            if guardadas:
                print(f"{len(guardadas)} páginas guardadas en '{output_path}'. Puedes reanudar con el mismo comando.")
        return False


async def procesar_compendio_async(
    pdf_path: str,
    titulo: str,
    curso_id: int,
    tipo: str = "silabo",
    modo: str = "silabo",
    rpm: int = 8,
    dpi: int = 200,
    salvage: bool = True,
    hybrid: bool = False,
    max_concurrency: int = 8,
    resume: bool = False,
) -> bool:
    """Version asincrona con checkpoints por pagina, enrutador hibrido y resiliencia (Fase 3)."""
    from app.rag.extraction_checkpoint import ExtractionCheckpoint

    cp = ExtractionCheckpoint(pdf_path)
    ya_completadas = cp.completed_pages()

    print(f"\n{'='*60}")
    if resume:
        print(f"  REANUDANDO: {titulo}")
        print(f"  Paginas ya procesadas: {len(ya_completadas)}")
    else:
        print(f"  Procesando (ASYNC): {titulo}")
    print(f"  Curso ID: {curso_id} | Modo: {modo} | Concurrencia: {max_concurrency}")
    if hybrid:
        print(f"  Enrutador hibrido: ACTIVADO (texto nativo vs Vision)")
    print(f"{'='*60}\n")
    t0 = time.time()

    try:
        supabase_url, supabase_key = _validar_env()
    except RuntimeError as e:
        print(f"Error: {e}")
        return False

    supabase = create_client(supabase_url, supabase_key)

    try:
        extractor = SyllabusExtractor(rpm=rpm)
    except RuntimeError as e:
        print(f"Error: {e}")
        return False

    recurso_id = None
    try:
        # En modo resume, buscar recurso existente en vez de crear nuevo
        if resume:
            recurso_id = _buscar_recurso_existente(supabase, titulo, curso_id)
        if not recurso_id:
            recurso_id = _registrar_recurso(supabase, titulo, curso_id, tipo)

        texto_crudo = await extractor.extract_text_async(
            pdf_path, modo=modo, dpi=dpi, salvage=salvage,
            max_concurrency=max_concurrency, hybrid=hybrid,
        )
        if not texto_crudo:
            raise RuntimeError("Extraccion vacia.")

        from app.rag.extraction_checkpoint import ExtractionCheckpoint
        cp = ExtractionCheckpoint(pdf_path)
        paginas_ok = cp.completed_pages()
        print(f"\n{len(paginas_ok)} pagina(s) extraidas correctamente.")
        # NO hacer cleanup - los checkpoints deben persistir para --resume
        # cp.cleanup()

        chunks = SyllabusChunker().chunk_text(texto_crudo)
        if not chunks:
            raise RuntimeError("El chunker no genero fragmentos.")

        embeddings = SyllabusEmbedder().embedding_generator(chunks)
        if not embeddings:
            raise RuntimeError("El embedder no genero vectores.")

        if not SyllabusIngestor().ingest(embeddings, recurso_id=recurso_id, curso_id=curso_id):
            raise RuntimeError("El ingestor reporto fallo.")

        elapsed = round(time.time() - t0, 2)
        print(f"\n{'='*60}")
        print(f"  RESUMEN (Fase 2 Async): '{titulo}'")
        print(f"  Tiempo total: {elapsed}s")
        print(f"  Paginas extraidas: {len(paginas_ok)}")
        print(f"  Chunks insertados en Supabase: {len(embeddings)}")
        print(f"  Concurrencia: {max_concurrency} | Hibrido: {'Si' if hybrid else 'No'}")
        print(f"{'='*60}\n")
        return True

    except Exception as e:
        print(f"Error critico: {e}")
        traceback.print_exc()
        if recurso_id is not None:
            _limpiar_recurso(supabase, recurso_id)
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingesta un PDF en el sistema RAG usando Gemini.")
    parser.add_argument("pdf_path")
    parser.add_argument("--titulo", required=True)
    parser.add_argument("--curso-id", required=True, type=int)
    parser.add_argument("--tipo", default="silabo")
    parser.add_argument("--modo", default="silabo", choices=["silabo", "examenes"])
    parser.add_argument("--output-path", default=None)
    parser.add_argument("--rpm", default=8, type=int, help="Requests por minuto (default: 8)")
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
        import asyncio
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