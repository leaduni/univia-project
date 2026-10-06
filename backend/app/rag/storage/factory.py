from app.core.rag_database import get_rag_pool, rag_store_name
from app.rag.evaluation.shadow_read import shadow_read_enabled
from app.rag.storage.base import ChunkStore
from app.rag.storage.postgres import PostgresChunkStore


async def get_chunk_store() -> ChunkStore:
    """Construye el store seleccionado sin alterar el flujo legado todavía."""
    if rag_store_name() == "postgres" or shadow_read_enabled():
        return PostgresChunkStore(await get_rag_pool())
    raise RuntimeError(
        "El adaptador Supabase se mantiene en el flujo legado durante la migración. "
        "Configura RAG_STORE=postgres cuando se active el nuevo retriever."
    )
