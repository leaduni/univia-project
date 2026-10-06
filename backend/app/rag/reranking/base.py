"""Contrato del reranker, independiente del almacén de chunks."""

from collections.abc import Mapping, Sequence
from typing import Any, Protocol


class Reranker(Protocol):
    async def rerank(
        self, query: str, candidates: Sequence[Mapping[str, Any]], top_k: int
    ) -> list[dict[str, Any]]: ...
