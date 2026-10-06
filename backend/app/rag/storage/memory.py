"""Adaptador en memoria para pruebas del puerto ChunkStore."""

import math
from collections.abc import Sequence

from app.rag.storage.base import ChunkStore
from app.rag.storage.models import (
    EmbeddedChunk,
    EmbeddingContract,
    ResourceSnapshot,
    RetrievalCandidate,
    RetrievalQuery,
)


class InMemoryChunkStore(ChunkStore):
    def __init__(self, expected_dimensions: int) -> None:
        self.expected_dimensions = expected_dimensions
        self._chunks: dict[int, tuple[ResourceSnapshot, list[EmbeddedChunk]]] = {}

    async def replace_resource_chunks(
        self, resource: ResourceSnapshot, chunks: Sequence[EmbeddedChunk]
    ) -> int:
        self._validate(resource, chunks)
        self._chunks[resource.recurso_id] = (resource, list(chunks))
        return len(chunks)

    async def delete_resource_chunks(self, recurso_id: int) -> int:
        previous = self._chunks.pop(recurso_id, None)
        return len(previous[1]) if previous else 0

    async def count_resource_chunks(self) -> int:
        return sum(len(chunks) for _, chunks in self._chunks.values())

    async def get_embedding_contract(self) -> EmbeddingContract | None:
        contracts = {
            (
                resource.embedding_provider,
                resource.embedding_model,
                resource.embedding_dimensions,
                resource.embedding_version,
            )
            for resource, _ in self._chunks.values()
        }
        if not contracts:
            return None
        if len(contracts) != 1:
            raise ValueError("El corpus en memoria contiene contratos de embeddings mezclados.")
        provider, model, dimensions, version = next(iter(contracts))
        return EmbeddingContract(provider, model, dimensions, version)

    async def search(self, query: RetrievalQuery) -> list[RetrievalCandidate]:
        self._validate_embedding(query.query_embedding)
        candidates: list[RetrievalCandidate] = []
        for resource, chunks in self._chunks.values():
            if query.recurso_id is not None and resource.recurso_id != query.recurso_id:
                continue
            if query.curso_id is not None and resource.curso_id != query.curso_id:
                continue
            if query.curso_nombre is not None and resource.curso_nombre != query.curso_nombre:
                continue
            if query.profesor_id is not None and resource.profesor_id != query.profesor_id:
                continue
            for chunk in chunks:
                similarity = _cosine_similarity(query.query_embedding, chunk.embedding)
                if similarity >= query.min_similarity:
                    candidates.append(
                        RetrievalCandidate(
                            id=chunk.id,
                            recurso_id=resource.recurso_id,
                            curso_id=resource.curso_id,
                            chunk_index=chunk.chunk_index,
                            contenido=chunk.contenido,
                            similarity=similarity,
                            metadata=chunk.metadata,
                            curso_nombre=resource.curso_nombre,
                            titulo_recurso=resource.titulo_recurso,
                            tipo_recurso=resource.tipo_recurso,
                            profesor_id=resource.profesor_id,
                            profesor_nombre=resource.profesor_nombre,
                            ciclo_recurso=resource.ciclo_recurso,
                            year_recurso=resource.year_recurso,
                        )
                    )
        return sorted(candidates, key=lambda candidate: candidate.similarity, reverse=True)[: query.limit]

    async def healthcheck(self) -> bool:
        return True

    def _validate(self, resource: ResourceSnapshot, chunks: Sequence[EmbeddedChunk]) -> None:
        if not chunks:
            raise ValueError("No se encontraron chunks para reemplazar.")
        if resource.embedding_dimensions != self.expected_dimensions:
            raise ValueError(f"El recurso declara {resource.embedding_dimensions} dimensiones; se esperaban {self.expected_dimensions}.")
        indexes = [chunk.chunk_index for chunk in chunks]
        if len(indexes) != len(set(indexes)):
            raise ValueError("Cada chunk debe tener un chunk_index único.")
        for chunk in chunks:
            self._validate_embedding(chunk.embedding)

    def _validate_embedding(self, embedding: Sequence[float]) -> None:
        if len(embedding) != self.expected_dimensions:
            raise ValueError(f"Embedding con {len(embedding)} dimensiones; se esperaban {self.expected_dimensions}.")
        if not all(math.isfinite(value) for value in embedding):
            raise ValueError("El embedding contiene valores no finitos.")


def _cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    numerator = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)
