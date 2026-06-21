import argparse
import os
import sys
import time
import traceback
from pathlib import Path
from typing import Optional

from supabase import Client, create_client
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from extractor import SyllabusExtractor
from chunker import SyllabusChunker
from embedder import SyllabusEmbedder
from ingest import SyllabusIngestor

load_dotenv()


def _validar_env():
    faltantes = [k for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "GEMINI_API_KEY") if not os.getenv(k)]
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
    print(f"\nProcesando: {titulo} | modo={modo} | curso_id={curso_id}")
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

        print(f"Proceso completado en {round(time.time() - t0, 2)}s — '{titulo}' listo para consultas.")
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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingesta un PDF en el sistema RAG usando Gemini.")
    parser.add_argument("pdf_path")
    parser.add_argument("--titulo", required=True)
    parser.add_argument("--curso-id", required=True, type=int)
    parser.add_argument("--tipo", default="silabo")
    parser.add_argument("--modo", default="silabo", choices=["silabo", "examenes"])
    parser.add_argument("--output-path", default=None)
    parser.add_argument("--rpm", default=8, type=int, help="Requests por minuto (default: 8)")
    parser.add_argument("--dpi", default=200, type=int, help="Resolución imagen (default: 200)")
    parser.add_argument("--no-salvage", action="store_true", default=False)
    parser.add_argument("--skip-failed", action="store_true", default=False)
    args = parser.parse_args()

    if not os.path.exists(args.pdf_path):
        print(f"Archivo no encontrado: '{args.pdf_path}'")
        sys.exit(1)

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