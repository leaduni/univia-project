from uuid import uuid4
from unittest.mock import ANY

import pytest

from app.rag.local_retriever import LocalChunkRetriever
from app.rag.storage.memory import InMemoryChunkStore
from app.rag.storage.models import EmbeddedChunk, ResourceSnapshot


@pytest.mark.asyncio
async def test_local_retriever_returns_legacy_compatible_context_rows() -> None:
    store = InMemoryChunkStore(expected_dimensions=3)
    resource = ResourceSnapshot(
        recurso_id=7,
        curso_id=20,
        content_hash="hash",
        embedding_provider="openai",
        embedding_model="text-embedding-3-small",
        embedding_dimensions=3,
        embedding_version="test",
        curso_nombre="Cálculo I",
        titulo_recurso="Semana 1",
        tipo_recurso="Separata",
        profesor_id=9,
        profesor_nombre="Ada Lovelace",
        ciclo_recurso=2,
        year_recurso=2026,
    )
    await store.replace_resource_chunks(
        resource,
        [EmbeddedChunk(id=uuid4(), chunk_index=0, contenido="derivadas", embedding=(1.0, 0.0, 0.0))],
    )

    rows = await LocalChunkRetriever(store).search(
        query_embedding=(1.0, 0.0, 0.0), limit=3, min_similarity=0.9, curso_id=20
    )

    assert rows == [
        {
            "id": ANY,
            "recurso_id": 7,
            "curso_id": 20,
            "chunk_index": 0,
            "contenido": "derivadas",
            "similarity": 1.0,
            "metadata": {},
            "curso_nombre": "Cálculo I",
            "titulo_recurso": "Semana 1",
            "tipo_recurso": "Separata",
            "profesor_id": 9,
            "profesor_nombre": "Ada Lovelace",
            "profesor": "Ada Lovelace",
            "ciclo_recurso": 2,
            "year_recurso": 2026,
        }
    ]


@pytest.mark.asyncio
async def test_local_retriever_filters_a_confirmed_resource() -> None:
    store = InMemoryChunkStore(expected_dimensions=3)
    for resource_id in (7, 8):
        await store.replace_resource_chunks(
            ResourceSnapshot(
                recurso_id=resource_id, curso_id=20, content_hash="hash",
                embedding_provider="openai", embedding_model="model",
                embedding_dimensions=3, embedding_version="test",
            ),
            [EmbeddedChunk(chunk_index=0, contenido=f"recurso {resource_id}", embedding=(1.0, 0.0, 0.0))],
        )

    rows = await LocalChunkRetriever(store).search(
        query_embedding=(1.0, 0.0, 0.0), limit=5, min_similarity=0,
        recurso_id=8,
    )

    assert [row["recurso_id"] for row in rows] == [8]


@pytest.mark.asyncio
async def test_syllabus_retriever_uses_local_store_when_postgres_is_selected(monkeypatch) -> None:
    import app.rag.retriever as retriever_module

    store = InMemoryChunkStore(expected_dimensions=3)
    await store.replace_resource_chunks(
        ResourceSnapshot(
            recurso_id=7, curso_id=20, content_hash="hash", embedding_provider="openai",
            embedding_model="text-embedding-3-small", embedding_dimensions=3, embedding_version="test",
        ),
        [EmbeddedChunk(id=uuid4(), chunk_index=0, contenido="derivadas", embedding=(1.0, 0.0, 0.0))],
    )

    class FakeEmbedder:
        model_name = "test-model"

        def vectorizar_consulta(self, pregunta: str, estricto: bool = False) -> list[float]:
            return [1.0, 0.0, 0.0]

    async def fake_get_chunk_store():
        return store

    monkeypatch.setattr(retriever_module, "rag_store_name", lambda: "postgres")
    monkeypatch.setattr(retriever_module, "get_chunk_store", fake_get_chunk_store)
    retriever = retriever_module.SyllabusRetriever(expected_dimensions=3, embedder=FakeEmbedder())

    rows = await retriever.buscar_contexto_async("¿Qué es una derivada?", curso_id=20, umbral_similitud=0.9)

    assert [row["contenido"] for row in rows] == ["derivadas"]


def test_syllabus_retriever_keeps_the_legacy_supabase_path(monkeypatch) -> None:
    import app.rag.retriever as retriever_module

    class FakeEmbedder:
        model_name = "test-model"
        expected_dimensions = 3

        def vectorizar_consulta(self, pregunta: str, estricto: bool = False) -> list[float]:
            return [1.0, 0.0, 0.0]

    class FakeSupabase:
        def rpc(self, name: str, params: dict):
            assert name == "search_resource_chunks"
            assert params["filter_curso_id"] == 20
            return self

        def execute(self):
            return type("Response", (), {"data": [{"contenido": "resultado legado"}]})()

    monkeypatch.setattr(retriever_module, "rag_store_name", lambda: "supabase")
    retriever = retriever_module.SyllabusRetriever(
        expected_dimensions=3, embedder=FakeEmbedder(), supabase_client=FakeSupabase()
    )

    assert retriever.buscar_contexto("derivadas", curso_id=20) == [{"contenido": "resultado legado"}]


@pytest.mark.asyncio
async def test_supabase_async_retrieval_keeps_professor_filter(monkeypatch) -> None:
    import app.rag.retriever as retriever_module

    class FakeEmbedder:
        model_name = "test-model"
        expected_dimensions = 3

        def vectorizar_consulta(self, pregunta: str, estricto: bool = False) -> list[float]:
            return [1.0, 0.0, 0.0]

    class FakeSupabase:
        def rpc(self, name: str, params: dict):
            assert name == "search_chatbot_resource_chunks"
            assert params["filter_curso_id"] == 27
            assert params["filter_profesor_id"] == 62
            assert params["query_text"] == "punteros"
            return self

        def execute(self):
            return type("Response", (), {"data": [{"contenido": "material docente"}]})()

    monkeypatch.setenv("RAG_SHADOW_READ_ENABLED", "false")
    monkeypatch.setattr(retriever_module, "rag_store_name", lambda: "supabase")
    retriever = retriever_module.SyllabusRetriever(
        embedder=FakeEmbedder(), supabase_client=FakeSupabase()
    )

    rows = await retriever.buscar_contexto_async(
        "punteros", curso_id=27, profesor_id=62, limit=6
    )

    assert rows == [{"contenido": "material docente"}]


@pytest.mark.asyncio
async def test_local_retriever_reranks_a_larger_pool_then_returns_requested_count(monkeypatch) -> None:
    import app.rag.retriever as retriever_module
    from app.rag.storage.models import RetrievalCandidate

    class FakeStore:
        async def search(self, query):
            assert query.limit == 20
            return [
                RetrievalCandidate(id=uuid4(), recurso_id=1, curso_id=20, chunk_index=0,
                                   contenido="contenido general", similarity=0.82, metadata={}),
                RetrievalCandidate(id=uuid4(), recurso_id=2, curso_id=20, chunk_index=0,
                                   contenido="regla de la cadena para derivar", similarity=0.76, metadata={}),
            ]

    class FakeEmbedder:
        model_name = "test"
        expected_dimensions = 3

        def vectorizar_consulta(self, pregunta, estricto=False):
            return [1.0, 0.0, 0.0]

    async def fake_store():
        return FakeStore()

    monkeypatch.setenv("RAG_RERANKER", "lexical")
    monkeypatch.setattr(retriever_module, "rag_store_name", lambda: "postgres")
    monkeypatch.setattr(retriever_module, "get_chunk_store", fake_store)
    retriever = retriever_module.SyllabusRetriever(embedder=FakeEmbedder(), supabase_client=object())

    rows = await retriever.buscar_contexto_async("regla de la cadena", limit=1, curso_id=20)

    assert [row["recurso_id"] for row in rows] == [2]
    assert rows[0]["similarity"] == 0.76
