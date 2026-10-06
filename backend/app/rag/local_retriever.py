"""Adaptador de recuperación local que conserva el formato consumido por el RAG legado."""

from collections.abc import Sequence
from typing import Any

from app.rag.storage.base import ChunkStore
from app.rag.storage.models import RetrievalCandidate, RetrievalQuery


class LocalChunkRetriever:
    """Ejecuta búsquedas locales sin filtrar detalles de asyncpg al resto del RAG."""

    def __init__(self, store: ChunkStore) -> None:
        self._store = store

    async def search(
        self,
        *,
        query_embedding: Sequence[float],
        limit: int,
        min_similarity: float,
        curso_id: int | None = None,
        curso_nombre: str | None = None,
        profesor_id: int | None = None,
        recurso_id: int | None = None,
    ) -> list[dict[str, Any]]:
        candidates = await self._store.search(
            RetrievalQuery(
                query_embedding=query_embedding,
                limit=limit,
                min_similarity=min_similarity,
                curso_id=curso_id,
                curso_nombre=curso_nombre,
                profesor_id=profesor_id,
                recurso_id=recurso_id,
            )
        )
        return [_legacy_row(candidate) for candidate in candidates]


def _legacy_row(candidate: RetrievalCandidate) -> dict[str, Any]:
    """Mantiene las claves que consumen chatbot, foro y evaluaciones."""
    return {
        "id": str(candidate.id),
        "recurso_id": candidate.recurso_id,
        "curso_id": candidate.curso_id,
        "chunk_index": candidate.chunk_index,
        "contenido": candidate.contenido,
        "similarity": candidate.similarity,
        "metadata": dict(candidate.metadata),
        "curso_nombre": candidate.curso_nombre,
        "titulo_recurso": candidate.titulo_recurso,
        "tipo_recurso": candidate.tipo_recurso,
        "profesor_id": candidate.profesor_id,
        "profesor_nombre": candidate.profesor_nombre,
        "profesor": candidate.profesor_nombre,
        "ciclo_recurso": candidate.ciclo_recurso,
        "year_recurso": candidate.year_recurso,
    }
