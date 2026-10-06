from uuid import UUID

import pytest

from app.rag.ingest import SyllabusIngestor, resource_snapshot_from_remote
from app.rag.storage.memory import InMemoryChunkStore
from app.rag.storage.models import ResourceSnapshot


@pytest.mark.asyncio
async def test_local_ingestor_replaces_a_resource_through_chunk_store(monkeypatch) -> None:
    import app.rag.ingest as ingest_module

    store = InMemoryChunkStore(expected_dimensions=3)

    async def fake_get_chunk_store():
        return store

    monkeypatch.setattr(ingest_module, "get_chunk_store", fake_get_chunk_store)
    resource = ResourceSnapshot(
        recurso_id=7,
        curso_id=20,
        content_hash="content-hash",
        embedding_provider="openai",
        embedding_model="text-embedding-3-small",
        embedding_dimensions=3,
        embedding_version="test-v1",
        curso_nombre="Cálculo I",
    )

    inserted = await SyllabusIngestor(client=object()).replace_local(
        [
            {"contenido": "derivadas", "embedding": [1.0, 0.0, 0.0], "metadata": {"pagina": 1}},
            {"contenido": "integrales", "embedding": [0.0, 1.0, 0.0]},
        ],
        resource,
        expected_dims=3,
    )

    assert inserted == 2
    rows = await store.search(
        __import__("app.rag.storage.models", fromlist=["RetrievalQuery"]).RetrievalQuery(
            query_embedding=[1.0, 0.0, 0.0], limit=2, min_similarity=0
        )
    )
    assert [(row.contenido, row.metadata) for row in rows] == [
        ("derivadas", {"pagina": 1}),
        ("integrales", {}),
    ]
    assert all(isinstance(row.id, UUID) for row in rows)


def test_resource_snapshot_keeps_retrieval_metadata_and_content_hash() -> None:
    snapshot = resource_snapshot_from_remote(
        {"id": 7, "curso_id": 20, "titulo": "Semana 1", "tipo": "Separata", "ciclo": 2, "year": 2026, "profesor_id": 9},
        {"name": "Cálculo I"},
        {"nombre_completo": "Ada Lovelace"},
        [{"contenido": "derivadas"}, {"contenido": "integrales"}],
        embedding_provider="openai",
        embedding_model="text-embedding-3-small",
        embedding_dimensions=256,
        embedding_version="mrl-256-v1",
    )

    assert snapshot.recurso_id == 7
    assert snapshot.curso_nombre == "Cálculo I"
    assert snapshot.profesor_nombre == "Ada Lovelace"
    assert snapshot.ciclo_recurso == 2
    assert snapshot.year_recurso == 2026
    assert len(snapshot.content_hash) == 64


def test_pipeline_builds_local_snapshot_from_supabase_catalogs() -> None:
    from app.rag.pipeline import IngestionPipeline

    rows = {
        "recursos": {"id": 7, "curso_id": 20, "titulo": "Semana 1", "tipo": "Separata", "profesor_id": 9, "ciclo": 2, "year": 2026},
        "cursos": {"name": "Cálculo I"},
        "profesores": {"nombre_completo": "Ada Lovelace"},
    }

    class Query:
        def __init__(self, table: str) -> None:
            self.table = table

        def select(self, _columns: str):
            return self

        def eq(self, _column: str, _value: int):
            return self

        def maybe_single(self):
            return self

        def execute(self):
            return type("Response", (), {"data": rows[self.table]})()

    class FakeSupabase:
        def table(self, table: str):
            return Query(table)

    embedder = type(
        "Embedder",
        (),
        {
            "proveedor": "openai",
            "model_name": "text-embedding-3-small",
            "expected_dimensions": 256,
            "embedding_version": "mrl-256-v1",
        },
    )()
    snapshot = IngestionPipeline(FakeSupabase())._snapshot_local_del_recurso(
        7, [{"contenido": "derivadas"}], embedder
    )

    assert snapshot.curso_nombre == "Cálculo I"
    assert snapshot.profesor_nombre == "Ada Lovelace"
