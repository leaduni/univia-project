# Endpoint
import argparse
import os
import time
from supabase import Client, create_client
from dotenv import load_dotenv

import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from extractor import SyllabusExtractor
from chunker import SyllabusChunker
from embedder import SyllabusEmbedder
from ingest import SyllabusIngestor

load_dotenv()

def registrar_recurso_bd(supabase: Client, titulo: str, curso_id: int, tipo: str="silabo") -> str:
    print("Registrando documento ...")
    
    respuesta = supabase.table("recursos").insert({
        "curso_id": curso_id,
        "titulo": titulo,
        "tipo": tipo
    }).execute()

    if respuesta.data:
        recurso_id = respuesta.data[0]["id"]
        print(f"Documento registrado con ID: {recurso_id}")
        return recurso_id
    else:
        raise Exception("No se pudo obtener el ID del documento al registrarlo. ")

def procesar_compendio(pdf_path: str, titulo: str, curso_id: int, tipo: str = "silabo", modo: str = "silabo", ollama_url: str = "http://127.0.0.1:11434", modelo_ollama: str = "llava"):
    print(f"Iniciando procesamiento de RAG para {titulo} (modo extracción: {modo}) ... ")

    tiempo_inicio = time.time()

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)

    recurso_id = None
    try:
        recurso_id = registrar_recurso_bd(supabase, titulo, curso_id, tipo=tipo)

        extractor = SyllabusExtractor()
        if modo == "ollama":
            texto_crudo = extractor.extract_text_ollama(pdf_path, ollama_url=ollama_url, modelo=modelo_ollama, modo="examenes")
        else:
            texto_crudo = extractor.extract_text(pdf_path, modo=modo)
        if not texto_crudo:
            raise Exception("La extraccion devolvio texto vacio. ")

        chunker = SyllabusChunker()
        chunks = chunker.chunk_text(texto_crudo)
        if not chunks:
            raise Exception("El chunker no genero fragmentos. ")

        embedder = SyllabusEmbedder()
        embeddings = embedder.embedding_generator(chunks)
        if not embeddings:
            raise Exception("El embedder no logro vectorizar el texto. ")

        ingestor = SyllabusIngestor()
        exito = ingestor.ingest(embeddings, recurso_id=recurso_id, curso_id=curso_id)

        tiempo_total = round(time.time() - tiempo_inicio, 2)
        if exito:
            print(f"Proceso culminado con éxito en {tiempo_total}s")
            print(f"El compendio '{titulo}' ya está listo para ser consultado por la IA.")

    except Exception as e:
        print(f"Error crítico en la ejecución del proceso: {e}")
        # Evitar dejar un recurso huérfano (registrado pero sin chunks) en la BD.
        if recurso_id is not None:
            try:
                supabase.table("recursos").delete().eq("id", recurso_id).execute()
                print(f"Limpieza: se eliminó el recurso huérfano (ID {recurso_id}).")
            except Exception as cleanup_error:
                print(f"Advertencia: no se pudo limpiar el recurso {recurso_id}: {cleanup_error}")
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Procesa un PDF (sílabo, compendio, libro, etc.) y lo ingesta en el sistema RAG."
    )
    parser.add_argument("pdf_path", help="Ruta al archivo PDF a procesar.")
    parser.add_argument("--titulo", required=True, help="Título del documento (se guarda en la tabla 'recursos').")
    parser.add_argument("--curso-id", required=True, type=int, help="ID del curso al que pertenece el documento.")
    parser.add_argument("--tipo", default="silabo", help="Tipo de recurso que se guarda en la tabla 'recursos' (silabo, Examen, compendio, libro, etc.). Default: silabo.")
    parser.add_argument(
        "--modo",
        default="silabo",
        choices=["silabo", "examenes", "ollama"],
        help="Modo de extracción: 'silabo' (Gemini), 'examenes' (Gemini), o 'ollama' (OLLAMA local sin cuota). Default: silabo.",
    )
    parser.add_argument(
        "--ollama-url",
        default="http://127.0.0.1:11434",
        help="URL del servidor OLLAMA (solo si --modo ollama). Default: http://127.0.0.1:11434",
    )
    parser.add_argument(
        "--modelo-ollama",
        default="llava",
        help="Modelo OLLAMA a usar (llava, qwen2-vl, etc). Default: llava",
    )

    args = parser.parse_args()

    if not os.path.exists(args.pdf_path):
        print(f"Error: No se encontró el archivo '{args.pdf_path}'.")
        sys.exit(1)

    procesar_compendio(
        args.pdf_path,
        titulo=args.titulo,
        curso_id=args.curso_id,
        tipo=args.tipo,
        modo=args.modo,
        ollama_url=args.ollama_url,
        modelo_ollama=args.modelo_ollama,
    )