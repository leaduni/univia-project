from uuid import uuid4

import pytest

from app.rag.storage.memory import InMemoryChunkStore
from app.rag.storage.models import EmbeddedChunk, ResourceSnapshot, RetrievalQuery
from app.rag.storage.postgres import PostgresChunkStore


def test_postgres_store_defaults_to_the_selected_local_dimension() -> None:
    store = PostgresChunkStore(pool=None)  # type: ignore[arg-type]

    assert store._expected_dimensions == 256


def _resource() -> ResourceSnapshot:
    return ResourceSnapshot(
        recurso_id=10,
        curso_id=20,
        titulo_recurso="Semana 1",
        curso_nombre="Cálculo I",
        content_hash="hash-v1",
        embedding_provider="openai",
        embedding_model="text-embedding-3-small",
        embedding_dimensions=3,
        embedding_version="test-v1",
    )


def _chunk(index: int, embedding: tuple[float, ...]) -> EmbeddedChunk:
    return EmbeddedChunk(
        id=uuid4(),
        chunk_index=index,
        contenido=f"Contenido {index}",
        embedding=embedding,
    )


@pytest.mark.asyncio
async def test_replace_replaces_only_the_resource_chunks() -> None:
    store = InMemoryChunkStore(expected_dimensions=3)
    resource = _resource()

    assert await store.replace_resource_chunks(
        resource, [_chunk(0, (1.0, 0.0, 0.0)), _chunk(1, (0.0, 1.0, 0.0))]
    ) == 2
    assert await store.replace_resource_chunks(resource, [_chunk(0, (0.0, 0.0, 1.0))]) == 1

    assert await store.count_resource_chunks() == 1
    results = await store.search(RetrievalQuery(query_embedding=(0.0, 0.0, 1.0)))
    assert [result.contenido for result in results] == ["Contenido 0"]


@pytest.mark.asyncio
async def test_replace_rejects_an_embedding_with_wrong_dimension() -> None:
    store = InMemoryChunkStore(expected_dimensions=3)

    with pytest.raises(ValueError, match="se esperaban 3"):
        await store.replace_resource_chunks(_resource(), [_chunk(0, (1.0, 0.0))])


@pytest.mark.asyncio
async def test_search_applies_course_and_similarity_filters() -> None:
    store = InMemoryChunkStore(expected_dimensions=3)
    resource = _resource()
    await store.replace_resource_chunks(
        resource, [_chunk(0, (1.0, 0.0, 0.0)), _chunk(1, (0.0, 1.0, 0.0))]
    )

    results = await store.search(
        RetrievalQuery(
            query_embedding=(1.0, 0.0, 0.0),
            curso_id=20,
            min_similarity=0.9,
        )
    )

    assert len(results) == 1
    assert results[0].chunk_index == 0
