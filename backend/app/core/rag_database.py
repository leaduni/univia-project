"""Pool asyncpg exclusivo para el corpus RAG local.

No sustituye `app.core.database`: ese módulo sigue atendiendo Supabase y no se
debe mezclar con la base local de vectores.
"""

import asyncio
import logging
import os

import asyncpg
from dotenv import load_dotenv

from app.rag.storage.models import EmbeddingContract

load_dotenv()

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None
_pool_lock = asyncio.Lock()


def rag_store_name() -> str:
    return os.getenv("RAG_STORE", "supabase").strip().lower()


def rag_shadow_read_enabled() -> bool:
    return os.getenv("RAG_SHADOW_READ_ENABLED", "false").strip().lower() in {
        "1", "true", "yes", "on"
    }


def rag_database_url() -> str | None:
    value = os.getenv("RAG_DATABASE_URL", "").strip()
    return value or None


def validate_local_rag_embedding_contract() -> None:
    """Evita mezclar consultas 1536-D con el corpus local Matryoshka de 256-D."""
    # En shadow mode el embedder local se construye aparte con 256D; la
    # configuración principal puede seguir usando 1536D para Supabase.
    if rag_store_name() != "postgres":
        return
    from app.rag.embedding_settings import EmbeddingSettings

    dimensions = EmbeddingSettings.from_env().dimensions
    if dimensions != 256:
        raise RuntimeError(
            "PostgreSQL RAG requiere EMBEDDINGS_DIMENSIONS=256 para coincidir "
            "con resource_chunks local."
        )


def validate_local_rag_corpus_contract(contract: EmbeddingContract | None) -> None:
    """Rechaza un modelo/proveedor/versión incompatible antes de servir consultas."""
    from app.rag.embedding_settings import EmbeddingSettings

    if contract is None:
        raise RuntimeError("PostgreSQL RAG no tiene chunks vectorizados.")
    settings = EmbeddingSettings.from_env()
    selected = (
        settings.provider.casefold(), settings.model.casefold(),
        settings.dimensions, settings.version,
    )
    stored = (
        contract.provider.casefold(), contract.model.casefold(),
        contract.dimensions, contract.version,
    )
    if selected != stored:
        raise RuntimeError(
            "El contrato de embeddings configurado no coincide con resource_chunks local. "
            f"Configurado={selected}; almacenado={stored}."
        )


async def init_rag_database() -> asyncpg.Pool | None:
    """Inicializa PostgreSQL como store principal o para shadow reads habilitados."""
    global _pool

    if rag_store_name() != "postgres" and not rag_shadow_read_enabled():
        return None

    validate_local_rag_embedding_contract()
    database_url = rag_database_url()
    if database_url is None:
        raise RuntimeError(
            "RAG_DATABASE_URL es obligatorio cuando PostgreSQL es el store activo "
            "o RAG_SHADOW_READ_ENABLED=true."
        )

    async with _pool_lock:
        if _pool is None:
            new_pool = await asyncpg.create_pool(
                dsn=database_url,
                min_size=int(os.getenv("RAG_DB_POOL_MIN_SIZE", "1")),
                max_size=int(os.getenv("RAG_DB_POOL_MAX_SIZE", "5")),
                command_timeout=float(os.getenv("RAG_DB_COMMAND_TIMEOUT_SECONDS", "30")),
            )
            try:
                if rag_store_name() == "postgres":
                    from app.rag.storage.postgres import PostgresChunkStore

                    contract = await PostgresChunkStore(new_pool).get_embedding_contract()
                    validate_local_rag_corpus_contract(contract)
            except Exception:
                await new_pool.close()
                raise
            _pool = new_pool
            logger.info("Pool PostgreSQL local para RAG inicializado.")

    return _pool


async def get_rag_pool() -> asyncpg.Pool:
    pool = _pool or await init_rag_database()
    if pool is None:
        raise RuntimeError("El store RAG actual no usa PostgreSQL local.")
    return pool


async def close_rag_database() -> None:
    global _pool
    async with _pool_lock:
        if _pool is not None:
            await _pool.close()
            _pool = None
            logger.info("Pool PostgreSQL local para RAG cerrado.")


async def rag_database_healthcheck() -> bool:
    try:
        pool = await get_rag_pool()
        async with pool.acquire() as connection:
            return await connection.fetchval("SELECT 1") == 1
    except Exception:
        logger.exception("Falló el healthcheck de PostgreSQL local para RAG.")
        return False
