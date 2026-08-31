# Ingesta de datos
import logging
import os
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()
logger = logging.getLogger(__name__)

class SyllabusIngestor:
    def __init__(self, client: Client | None = None):
        if client is not None:
            self.supabase = client
            return

        url_supabase = os.getenv("SUPABASE_URL")
        anon_supabase = os.getenv("SUPABASE_ANON_KEY")

        if not url_supabase or not anon_supabase:
            print("Hubo un error estableciendo la conexion con el cliente de Supabase. ")
            raise ValueError("Faltan credenciales de Supabase")
        
        self.supabase: Client = create_client(url_supabase, anon_supabase)

    def replace(
        self,
        chunks: list,
        recurso_id: int,
        curso_id: int,
        drive_modified_time: str | None = None,
        batch_size: int = 100,
    ) -> int:
        """Reemplaza los chunks del recurso en lotes ligeros para evitar el error
        PGRST002/503 por payloads JSON gigantes (~40 MB en una sola RPC).
        El primer lote usa la RPC protegida replace_resource_chunks (borra los
        chunks previos, inserta y actualiza los metadatos del recurso); los lotes
        siguientes insertan directo a la tabla ya limpia, conservando el
        chunk_index global de cada fragmento (indice unico recurso_id, chunk_index).
        """
        if not chunks:
            raise ValueError("No se encontraron chunks para reemplazar.")

        total_insertados = 0

        for inicio in range(0, len(chunks), batch_size):
            lote = chunks[inicio : inicio + batch_size]
            payload = [
                {
                    "chunk_index": inicio + index,
                    "contenido": chunk["contenido"],
                    "embedding": chunk["embedding"],
                }
                for index, chunk in enumerate(lote)
            ]

            if inicio == 0:
                # Primer lote: RPC transaccional que borra lo anterior, inserta
                # estos chunks y actualiza los metadatos del recurso.
                respuesta = self.supabase.rpc(
                    "replace_resource_chunks",
                    {
                        "p_recurso_id": recurso_id,
                        "p_curso_id": curso_id,
                        "p_chunks": payload,
                        "p_drive_modified_time": drive_modified_time,
                    },
                ).execute()
                total_insertados += int(respuesta.data or 0)
            else:
                # Lotes restantes: el delete ya ocurrió en el primer lote; solo
                # se inserta sin volver a borrar ni duplicar (chunk_index global
                # + indice unico recurso_id, chunk_index).
                filas = [
                    {
                        "recurso_id": recurso_id,
                        "curso_id": curso_id,
                        "chunk_index": inicio + index,
                        "contenido": chunk["contenido"],
                        "embedding": chunk["embedding"],
                    }
                    for index, chunk in enumerate(lote)
                ]
                respuesta = self.supabase.table("resource_chunks").insert(filas).execute()
                total_insertados += len(respuesta.data or [])

        return total_insertados

    def ingest(self, chunks: list, recurso_id: str, curso_id: int, table_name: str = "resource_chunks", batch_size: int = 50) -> bool:
        if not chunks:
            logger.warning("No se encontraron chunks para hacer la ingesta.")
            return False

        total_chunks = len(chunks)
        logger.info(f"[Supabase] Iniciando ingesta de {total_chunks} fragmentos en {table_name}...")

        for i in range(0, total_chunks, batch_size):
            lote = chunks[i: i + batch_size]
            datos_insertar = []
            for offset, chunk in enumerate(lote):
                datos_insertar.append({
                    "recurso_id": recurso_id,
                    "curso_id": curso_id,
                    "chunk_index": i + offset,
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