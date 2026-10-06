from pathlib import Path


def test_fresh_local_schema_uses_the_selected_256_dimension() -> None:
    schema = (Path(__file__).resolve().parents[3] / "base_de_datos" / "rag_local" / "001_resource_chunks.sql").read_text(encoding="utf-8")

    assert "embedding vector(256) NOT NULL" in schema
    assert "CHECK (embedding_dimensions = 256)" in schema


def test_vector_index_migration_uses_cosine_hnsw_after_bulk_load() -> None:
    migration = (Path(__file__).resolve().parents[3] / "base_de_datos" / "rag_local" / "003_add_resource_chunks_hnsw.sql").read_text(encoding="utf-8")

    assert "USING hnsw (embedding vector_cosine_ops)" in migration
    assert "ANALYZE resource_chunks" in migration
