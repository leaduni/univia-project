"""Métricas y selección de dimensión para embeddings Matryoshka."""

import math
from dataclasses import dataclass
from typing import Mapping, Sequence


@dataclass(frozen=True, slots=True)
class BenchmarkCase:
    query_id: str
    query: str
    relevant_chunk_ids: frozenset[str]

    def __post_init__(self) -> None:
        if not self.query.strip():
            raise ValueError("Cada caso de evaluación requiere una consulta.")
        if not self.relevant_chunk_ids:
            raise ValueError("Cada caso requiere al menos un chunk relevante.")


@dataclass(frozen=True, slots=True)
class RetrievalMetrics:
    recall_at_5: float
    recall_at_10: float
    mrr_at_10: float
    ndcg_at_10: float


@dataclass(frozen=True, slots=True)
class DimensionResult:
    dimensions: int
    recall_at_10: float
    mrr_at_10: float
    ndcg_at_10: float
    latency_ms: float
    vector_bytes: int


def evaluate_rankings(
    cases: Sequence[BenchmarkCase], rankings_by_query: Mapping[str, Sequence[str]]
) -> RetrievalMetrics:
    if not cases:
        raise ValueError("Se necesita al menos un caso de evaluación.")

    recall_at_5 = recall_at_10 = mrr_at_10 = ndcg_at_10 = 0.0
    for case in cases:
        ranking = rankings_by_query.get(case.query_id, ())
        recall_at_5 += _recall_at(ranking, case.relevant_chunk_ids, 5)
        recall_at_10 += _recall_at(ranking, case.relevant_chunk_ids, 10)
        mrr_at_10 += _mrr_at(ranking, case.relevant_chunk_ids, 10)
        ndcg_at_10 += _ndcg_at(ranking, case.relevant_chunk_ids, 10)

    size = len(cases)
    return RetrievalMetrics(
        recall_at_5=recall_at_5 / size,
        recall_at_10=recall_at_10 / size,
        mrr_at_10=mrr_at_10 / size,
        ndcg_at_10=ndcg_at_10 / size,
    )


def select_dimension(
    results: Sequence[DimensionResult], max_recall_drop: float = 0.02
) -> DimensionResult:
    """Elige la menor dimensión cuya Recall@10 no cae más que el umbral."""
    if not results:
        raise ValueError("No hay resultados de dimensiones para comparar.")
    if not 0 <= max_recall_drop < 1:
        raise ValueError("max_recall_drop debe estar entre 0 y 1.")
    best_recall = max(result.recall_at_10 for result in results)
    candidates = [
        result for result in results if best_recall - result.recall_at_10 <= max_recall_drop
    ]
    return min(candidates, key=lambda result: result.dimensions)


def _recall_at(ranking: Sequence[str], relevant: frozenset[str], limit: int) -> float:
    return len(set(ranking[:limit]) & relevant) / len(relevant)


def _mrr_at(ranking: Sequence[str], relevant: frozenset[str], limit: int) -> float:
    for index, chunk_id in enumerate(ranking[:limit], start=1):
        if chunk_id in relevant:
            return 1 / index
    return 0.0


def _ndcg_at(ranking: Sequence[str], relevant: frozenset[str], limit: int) -> float:
    dcg = sum(
        1 / math.log2(index + 1)
        for index, chunk_id in enumerate(ranking[:limit], start=1)
        if chunk_id in relevant
    )
    ideal_count = min(len(relevant), limit)
    ideal_dcg = sum(1 / math.log2(index + 1) for index in range(1, ideal_count + 1))
    return dcg / ideal_dcg if ideal_dcg else 0.0
