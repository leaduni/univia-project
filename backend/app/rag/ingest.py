# Ingesta de datos
import logging
import os
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()
logger = logging.getLogger(__name__)

class SyllabusIngestor:
    def __init__(self):
        url_supabase = os.getenv("SUPABASE_URL")
        anon_supabase = os.getenv("SUPABASE_ANON_KEY")

        if not url_supabase or not anon_supabase:
            print("Hubo un error estableciendo la conexion con el cliente de Supabase. ")
            raise ValueError("Faltan credenciales de Supabase")
        
        self.supabase: Client = create_client(url_supabase, anon_supabase)
    
    def ingest(self, chunks: list, recurso_id: str, curso_id: int, table_name: str = "resource_chunks", batch_size: int = 50) -> bool:
        if not chunks:
            logger.warning("No se encontraron chunks para hacer la ingesta.")
            return False

        total_chunks = len(chunks)
        logger.info(f"[Supabase] Iniciando ingesta de {total_chunks} fragmentos en {table_name}...")

        for i in range(0, total_chunks, batch_size):
            lote = chunks[i: i + batch_size]
            datos_insertar = []
            for chunk in lote:
                datos_insertar.append({
                    "recurso_id": recurso_id,
                    "curso_id": curso_id,
                    "contenido": chunk["contenido"],
                    "embedding": chunk["embedding"]
                })

            logger.info(f"[Supabase] Insertando lote {(i//batch_size)+1} (fragmentos {i+1}-{min(i+batch_size, total_chunks)})...")

            try:
                respuesta = self.supabase.table(table_name).insert(datos_insertar).execute()
                if not respuesta.data:
                    logger.warning("[Supabase] Inserción ejecutada pero sin confirmación de datos.")
                else:
                    logger.info("[Supabase] Éxito.")

            except Exception as e:
                logger.error(f"[Supabase] Error crítico al insertar lote: {e}")
                return False

        logger.info(f"[Supabase] Ingesta exitosa. {total_chunks} fragmentos en Supabase.")
        return True
