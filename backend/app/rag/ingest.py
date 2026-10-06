# Ingesta de datos
import hashlib
import logging
import os
from dotenv import load_dotenv
from supabase import Client, create_client

from app.rag.storage.factory import get_chunk_store
from app.rag.storage.models import EmbeddedChunk, ResourceSnapshot

load_dotenv()
logger = logging.getLogger(__name__)


def resource_snapshot_from_remote(
    recurso: dict,
    curso: dict | None,
    profesor: dict | None,
    chunks: list,
    *,
    embedding_provider: str,
    embedding_model: str,
    embedding_dimensions: int,
    embedding_version: str,
) -> ResourceSnapshot:
    """Convierte metadatos de Supabase al snapshot desnormalizado del store local."""
    recurso_id = recurso.get("id")
    curso_id = recurso.get("curso_id")
    if recurso_id is None or curso_id is None:
        raise ValueError("El recurso local requiere id y curso_id.")
    digest = hashlib.sha256()
    for chunk in chunks:
        digest.update((chunk.get("contenido") or "").encode("utf-8"))
        digest.update(b"\x1e")
    return ResourceSnapshot(
        recurso_id=int(recurso_id),
        curso_id=int(curso_id),
        content_hash=digest.hexdigest(),
        embedding_provider=embedding_provider,
        embedding_model=embedding_model,
        embedding_dimensions=embedding_dimensions,
        embedding_version=embedding_version,
        curso_nombre=(curso or {}).get("name"),
        titulo_recurso=recurso.get("titulo"),
        tipo_recurso=recurso.get("tipo"),
        profesor_id=recurso.get("profesor_id"),
        profesor_nombre=(profesor or {}).get("nombre_completo"),
        ciclo_recurso=recurso.get("ciclo"),
        year_recurso=recurso.get("year"),
    )


def _validar_embeddings(chunks: list, expected_dims: int | None = None) -> None:
    """Guarda defensiva: rechaza chunks sin embedding válido.

    Con expected_dims=None (default) solo exige un embedding no vacío, para no
    romper tests/llamadores históricos. El pipeline unificado pasa
    expected_dims=1536 (columna vector(1536) de resource_chunks).
    """
    for i, chunk in enumerate(chunks):
        embedding = chunk.get("embedding")
        if not isinstance(embedding, (list, tuple)) or not embedding:
            raise ValueError(f"Chunk {i} no tiene embedding válido.")
        if expected_dims is not None and len(embedding) != expected_dims:
            raise ValueError(
                f"Chunk {i} con embedding de {len(embedding)} dimensiones; "
                f"se esperaban {expected_dims}."
            )


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
        expected_dims: int | None = None,
    ) -> int:
        """Reemplaza los chunks del recurso en lotes ligeros para evitar el error
        PGRST002/503 por payloads JSON gigantes (~40 MB en una sola RPC).
        El primer lote usa la RPC protegida replace_resource_chunks (borra los
        chunks previos e inserta; los lotes
        siguientes insertan directo a la tabla ya limpia, conservando el
        chunk_index global de cada fragmento (indice unico recurso_id, chunk_index).
        """
        if not chunks:
            raise ValueError("No se encontraron chunks para reemplazar.")

        _validar_embeddings(chunks, expected_dims)

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
                # estos chunks.
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

        if total_insertados != len(chunks):
            raise RuntimeError(
                f"Se insertaron {total_insertados}/{len(chunks)} chunks del recurso {recurso_id}."
            )

        self.supabase.rpc(
            "mark_rag_complete",
            {
                "p_recurso_id": recurso_id,
                "p_drive_modified_time": drive_modified_time,
            },
        ).execute()

        return total_insertados

    async def replace_local(
        self,
        chunks: list,
        resource: ResourceSnapshot,
        expected_dims: int | None = None,
    ) -> int:
        """Reemplaza un recurso en el ChunkStore local de forma transaccional.

        La fila de `recursos` y sus catálogos siguen viviendo en Supabase. Este
        método recibe el snapshot ya desnormalizado para que PostgreSQL local no
        dependa de joins remotos durante la recuperación.
        """
        if not chunks:
            raise ValueError("No se encontraron chunks para reemplazar.")
        _validar_embeddings(chunks, expected_dims or resource.embedding_dimensions)
        if resource.embedding_dimensions != (expected_dims or resource.embedding_dimensions):
            raise ValueError("Las dimensiones del recurso no coinciden con la ingesta.")

        embedded_chunks = [
            EmbeddedChunk(
                chunk_index=index,
                contenido=chunk["contenido"],
                embedding=chunk["embedding"],
                metadata=chunk.get("metadata") or {},
            )
            for index, chunk in enumerate(chunks)
        ]
        store = await get_chunk_store()
        inserted = await store.replace_resource_chunks(resource, embedded_chunks)
        if inserted != len(embedded_chunks):
            raise RuntimeError(
                f"Se insertaron {inserted}/{len(embedded_chunks)} chunks del recurso "
                f"{resource.recurso_id}."
            )
        return inserted

    def ingest(
        self,
        chunks: list,
        recurso_id: int | None = None,
        curso_id: int | None = None,
        table_name: str = "resource_chunks",
        batch_size: int = 50,
        drive_modified_time: str | None = None,
        expected_dims: int | None = None,
    ) -> bool:
        if not chunks:
            logger.warning("No se encontraron chunks para hacer la ingesta.")
            return False

        _validar_embeddings(chunks, expected_dims)

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

        if recurso_id is not None and drive_modified_time is not None:
            self.supabase.rpc(
                "mark_rag_complete",
                {
                    "p_recurso_id": recurso_id,
                    "p_drive_modified_time": drive_modified_time,
                },
            ).execute()

        logger.info(f"[Supabase] Ingesta exitosa. {total_chunks} fragmentos en Supabase.")
        return True
