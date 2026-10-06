"""Regression for ANN post-filtering, using only a connection-local temp corpus."""

import os

import asyncpg
import pytest

from app.rag.storage.models import RetrievalQuery
from app.rag.storage.postgres import PostgresChunkStore


pytestmark = pytest.mark.skipif(
    not os.getenv("RAG_DATABASE_URL"),
    reason="RAG_DATABASE_URL is required for the pgvector integration test.",
)


@pytest.mark.asyncio
async def test_filtered_hnsw_search_fills_limit_without_leaking_session_settings() -> None:
    returned_scan_modes = []

    async def configure_search_session(connection: asyncpg.Connection) -> None:
        await connection.execute("SET enable_seqscan=off")
        await connection.execute("SET hnsw.ef_search=10")
        await connection.execute("SET hnsw.iterative_scan=off")

    async def reset_search_session(connection: asyncpg.Connection) -> None:
        returned_scan_modes.append(await connection.fetchval("SHOW hnsw.iterative_scan"))
        await connection.reset()

    pool = await asyncpg.create_pool(
        os.environ["RAG_DATABASE_URL"], min_size=1, max_size=1,
        setup=configure_search_session, reset=reset_search_session,
    )
    try:
        async with pool.acquire() as connection:
            await connection.execute(
                "CREATE TEMP TABLE resource_chunks "
                "(LIKE public.resource_chunks INCLUDING DEFAULTS)"
            )
            await connection.execute(
                """
                INSERT INTO resource_chunks (
                    id, recurso_id, curso_id, chunk_index, contenido, embedding,
                    content_hash, embedding_provider, embedding_model,
                    embedding_dimensions, embedding_version
                )
                SELECT gen_random_uuid(), n, CASE WHEN n <= 200 THEN 1 ELSE 2 END,
                       0, 'temporary ANN fixture',
                       (ARRAY[CASE WHEN n <= 200 THEN 1.0 ELSE 0.1 END,
                              CASE WHEN n <= 200 THEN 0.1 ELSE 1.0 END]
                        || array_fill(0.0, ARRAY[254]))::vector,
                       'test', 'test', 'test', 256, 'test'
                FROM generate_series(1, 220) AS n
                """
            )
            await connection.execute(
                "CREATE INDEX ON resource_chunks USING hnsw (embedding vector_cosine_ops)"
            )
            await connection.execute("ANALYZE resource_chunks")

        rows = await PostgresChunkStore(pool).search(
            RetrievalQuery(
                query_embedding=[1.0] + [0.0] * 255,
                curso_id=2,
                limit=10,
                min_similarity=0,
            )
        )

        assert len(rows) == 10
        assert all(row.curso_id == 2 for row in rows)
        assert returned_scan_modes == ["off", "off"]
        async with pool.acquire() as connection:
            assert await connection.fetchval("SHOW hnsw.iterative_scan") == "off"
    finally:
        async with pool.acquire() as connection:
            await connection.execute("DROP TABLE IF EXISTS pg_temp.resource_chunks")
        await pool.close()
