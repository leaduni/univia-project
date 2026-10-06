import os
from uuid import uuid4

import asyncpg
import pytest

from app.rag.storage.models import EmbeddedChunk, ResourceSnapshot, RetrievalQuery
from app.rag.storage.postgres import PostgresChunkStore


pytestmark = pytest.mark.skipif(
    not os.getenv("RAG_DATABASE_URL"),
    reason="RAG_DATABASE_URL no está configurada para la prueba de integración.",
)


@pytest.mark.asyncio
async def test_postgres_store_replaces_searches_and_deletes_chunks() -> None:
    pool = await asyncpg.create_pool(os.environ["RAG_DATABASE_URL"], min_size=1, max_size=1)
    store = PostgresChunkStore(pool)
    resource_id = 2_000_000_001
    vector = (1.0,) + (0.0,) * 255
    resource = ResourceSnapshot(
        recurso_id=resource_id,
        curso_id=987,
        curso_nombre="Prueba integración",
        titulo_recurso="Temporal",
        content_hash="test-hash",
        embedding_provider="test",
        embedding_model="test-model",
        embedding_dimensions=256,
        embedding_version="test-v1",
    )

    try:
        assert await store.replace_resource_chunks(
            resource,
            [EmbeddedChunk(id=uuid4(), chunk_index=0, contenido="contenido temporal", embedding=vector)],
        ) == 1

        results = await store.search(
            RetrievalQuery(query_embedding=vector, curso_id=987, min_similarity=0.99)
        )
        assert len(results) == 1
        assert results[0].recurso_id == resource_id
        assert await store.search(
            RetrievalQuery(query_embedding=vector, recurso_id=resource_id + 1, min_similarity=0)
        ) == []
        exact = await store.search(
            RetrievalQuery(query_embedding=vector, recurso_id=resource_id, min_similarity=0)
        )
        assert [row.recurso_id for row in exact] == [resource_id]
        assert await store.delete_resource_chunks(resource_id) == 1
    finally:
        await store.delete_resource_chunks(resource_id)
        await pool.close()
