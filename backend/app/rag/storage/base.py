from abc import ABC, abstractmethod
from collections.abc import Sequence

from app.rag.storage.models import (
    EmbeddedChunk,
    EmbeddingContract,
    ResourceSnapshot,
    RetrievalCandidate,
    RetrievalQuery,
)


class ChunkStore(ABC):
    """Puerto de persistencia para chunks; no conoce FastAPI ni Supabase."""

    @abstractmethod
    async def replace_resource_chunks(
        self, resource: ResourceSnapshot, chunks: Sequence[EmbeddedChunk]
    ) -> int:
        """Reemplaza transaccionalmente todos los chunks de un recurso."""

    @abstractmethod
    async def delete_resource_chunks(self, recurso_id: int) -> int:
        """Elimina los chunks de un recurso y devuelve la cantidad eliminada."""

    @abstractmethod
    async def count_resource_chunks(self) -> int:
        """Devuelve el total de chunks persistidos."""

    @abstractmethod
    async def get_embedding_contract(self) -> EmbeddingContract | None:
        """Devuelve el contrato único del corpus o falla si hay mezcla de espacios."""

    @abstractmethod
    async def search(self, query: RetrievalQuery) -> list[RetrievalCandidate]:
        """Recupera candidatos por similitud vectorial y filtros opcionales."""

    @abstractmethod
    async def healthcheck(self) -> bool:
        """Verifica que el store acepta consultas."""
