"""Modelos independientes de la base de datos para el corpus RAG."""

from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence
from uuid import UUID, uuid4


@dataclass(frozen=True, slots=True)
class ResourceSnapshot:
    recurso_id: int
    curso_id: int
    content_hash: str
    embedding_provider: str
    embedding_model: str
    embedding_dimensions: int
    embedding_version: str
    curso_nombre: str | None = None
    titulo_recurso: str | None = None
    tipo_recurso: str | None = None
    profesor_id: int | None = None
    profesor_nombre: str | None = None
    ciclo_recurso: int | None = None
    year_recurso: int | None = None


@dataclass(frozen=True, slots=True)
class EmbeddingContract:
    provider: str
    model: str
    dimensions: int
    version: str


@dataclass(frozen=True, slots=True)
class EmbeddedChunk:
    chunk_index: int
    contenido: str
    embedding: Sequence[float]
    id: UUID = field(default_factory=uuid4)
    metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class RetrievalQuery:
    query_embedding: Sequence[float]
    limit: int = 5
    min_similarity: float = 0.5
    curso_id: int | None = None
    curso_nombre: str | None = None
    profesor_id: int | None = None
    recurso_id: int | None = None


@dataclass(frozen=True, slots=True)
class RetrievalCandidate:
    id: UUID
    recurso_id: int
    curso_id: int
    chunk_index: int
    contenido: str
    similarity: float
    metadata: Mapping[str, Any]
    curso_nombre: str | None = None
    titulo_recurso: str | None = None
    tipo_recurso: str | None = None
    profesor_id: int | None = None
    profesor_nombre: str | None = None
    ciclo_recurso: int | None = None
    year_recurso: int | None = None
