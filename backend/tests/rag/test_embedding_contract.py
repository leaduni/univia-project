from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest


def test_embedding_settings_reads_the_selected_matryoshka_dimension(monkeypatch) -> None:
    monkeypatch.setenv("EMBEDDINGS_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
    monkeypatch.setenv("EMBEDDINGS_DIMENSIONS", "512")
    monkeypatch.setenv("EMBEDDINGS_VERSION", "mrl-512-v1")

    from app.rag.embedding_settings import EmbeddingSettings

    assert EmbeddingSettings.from_env() == EmbeddingSettings(
        provider="openai",
        model="text-embedding-3-small",
        dimensions=512,
        version="mrl-512-v1",
    )


def test_openai_requests_dimensions_instead_of_truncating_vectors(monkeypatch) -> None:
    import app.rag.embedder as embedder_module

    client = MagicMock()
    client.embeddings.create.return_value = SimpleNamespace(
        usage=SimpleNamespace(prompt_tokens=3),
        data=[SimpleNamespace(index=0, embedding=[0.1] * 512)],
    )
    monkeypatch.setattr(embedder_module, "OpenAI", MagicMock(return_value=client))

    embedder = embedder_module.SyllabusEmbedder(
        proveedor="openai", model_name="text-embedding-3-small", expected_dimensions=512
    )

    assert embedder._llamar_api(["un texto"]) == [[0.1] * 512]
    client.embeddings.create.assert_called_once_with(
        model="text-embedding-3-small", input=["un texto"], dimensions=512
    )


def test_embedder_rejects_a_provider_response_with_wrong_dimension(monkeypatch) -> None:
    import app.rag.embedder as embedder_module

    client = MagicMock()
    client.embeddings.create.return_value = SimpleNamespace(
        usage=SimpleNamespace(prompt_tokens=3),
        data=[SimpleNamespace(index=0, embedding=[0.1] * 1536)],
    )
    monkeypatch.setattr(embedder_module, "OpenAI", MagicMock(return_value=client))
    embedder = embedder_module.SyllabusEmbedder(
        proveedor="openai", model_name="text-embedding-3-small", expected_dimensions=512
    )

    with pytest.raises(ValueError, match="512 dimensiones"):
        embedder._llamar_api(["un texto"])


def test_embedding_cache_key_changes_when_vector_space_changes() -> None:
    from app.rag.embedding_cache import embedding_cache_key

    key_512 = embedding_cache_key("contenido", "openai", "text-embedding-3-small", 512, "RETRIEVAL_DOCUMENT")
    key_1536 = embedding_cache_key("contenido", "openai", "text-embedding-3-small", 1536, "RETRIEVAL_DOCUMENT")

    assert key_512 != key_1536
