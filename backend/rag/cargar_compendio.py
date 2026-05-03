# Endpoint
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

def procesar_compendio(pdf_path: str, titulo: str, curso_id: int):
    print(f"Iniciando procesamiento de RAG para {titulo} ... ")

    tiempo_inicio = time.time()

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)

    try:
        recurso_id = registrar_recurso_bd(supabase, titulo, curso_id)

        extractor = SyllabusExtractor()
        texto_crudo = extractor.extract_text(pdf_path)
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
    
if __name__ == "__main__":
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ruta_pdf = os.path.join(root_dir, "scrapeo", "silabos", "BF101-Fisica.pdf")

    procesar_compendio(ruta_pdf, titulo="Silabo de Física I", curso_id=26)