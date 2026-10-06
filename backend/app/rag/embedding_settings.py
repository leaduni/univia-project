"""Contrato único para el espacio vectorial activo del RAG."""

import os
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class EmbeddingSettings:
    provider: str
    model: str
    dimensions: int
    version: str

    @classmethod
    def from_env(cls) -> "EmbeddingSettings":
        provider = os.getenv("EMBEDDINGS_PROVIDER", "openai").strip().lower()
        if provider not in {"openai", "gemini"}:
            raise ValueError("EMBEDDINGS_PROVIDER debe ser 'openai' o 'gemini'.")

        model_variable = "OPENAI_EMBED_MODEL" if provider == "openai" else "GEMINI_EMBED_MODEL"
        default_model = "text-embedding-3-small" if provider == "openai" else "gemini-embedding-001"
        model = os.getenv(model_variable, default_model).strip()
        try:
            dimensions = int(os.getenv("EMBEDDINGS_DIMENSIONS", "1536"))
        except ValueError as error:
            raise ValueError("EMBEDDINGS_DIMENSIONS debe ser un entero positivo.") from error
        if dimensions < 1:
            raise ValueError("EMBEDDINGS_DIMENSIONS debe ser mayor que cero.")

        version = os.getenv(
            "EMBEDDINGS_VERSION", f"{provider}:{model}:{dimensions}"
        ).strip()
        if not version:
            raise ValueError("EMBEDDINGS_VERSION no puede estar vacío.")
        return cls(provider=provider, model=model, dimensions=dimensions, version=version)
