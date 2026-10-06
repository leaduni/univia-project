import pytest

from app.core.rag_database import (
    validate_local_rag_corpus_contract,
    validate_local_rag_embedding_contract,
)
from app.rag.storage.models import EmbeddingContract


def test_postgres_store_requires_the_selected_256_dimension(monkeypatch) -> None:
    monkeypatch.setenv("RAG_STORE", "postgres")
    monkeypatch.setenv("EMBEDDINGS_DIMENSIONS", "1536")

    with pytest.raises(RuntimeError, match="EMBEDDINGS_DIMENSIONS=256"):
        validate_local_rag_embedding_contract()


def test_postgres_store_accepts_the_selected_256_dimension(monkeypatch) -> None:
    monkeypatch.setenv("RAG_STORE", "postgres")
    monkeypatch.setenv("EMBEDDINGS_DIMENSIONS", "256")

    validate_local_rag_embedding_contract()


def test_postgres_store_rejects_wrong_provider_even_with_256_dimensions(monkeypatch) -> None:
    monkeypatch.setenv("EMBEDDINGS_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")
    monkeypatch.setenv("EMBEDDINGS_DIMENSIONS", "256")
    monkeypatch.setenv("EMBEDDINGS_VERSION", "mrl-256-v1")
    stored = EmbeddingContract("openai", "text-embedding-3-small", 256, "mrl-256-v1")

    with pytest.raises(RuntimeError, match="no coincide"):
        validate_local_rag_corpus_contract(stored)


def test_postgres_store_accepts_matching_corpus_contract(monkeypatch) -> None:
    monkeypatch.setenv("EMBEDDINGS_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
    monkeypatch.setenv("EMBEDDINGS_DIMENSIONS", "256")
    monkeypatch.setenv("EMBEDDINGS_VERSION", "mrl-256-v1")
    stored = EmbeddingContract("openai", "text-embedding-3-small", 256, "mrl-256-v1")

    validate_local_rag_corpus_contract(stored)
