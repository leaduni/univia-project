"""Métricas de recuperación calculadas contra IDs revisados, sin juez LLM."""

import math
from dataclasses import dataclass
from collections.abc import Mapping, Sequence
from typing import Any


@dataclass(frozen=True, slots=True)
class EvaluationCase:
    query_id: str
    query: str
    relevant_chunk_ids: frozenset[str]
    relevant_resource_ids: frozenset[int]


def evaluate_retrieval(
    cases: Sequence[EvaluationCase],
    rankings: Mapping[str, Sequence[Mapping[str, Any]]],
    *,
    k: int = 10,
) -> dict[str, float | int]:
    if not cases or k <= 0:
        raise ValueError("Se requieren casos y un k positivo.")
    positives = [case for case in cases if case.relevant_chunk_ids]
    negatives = [case for case in cases if not case.relevant_chunk_ids]
    recall = precision = mrr = ndcg = resource_hit = 0.0
    top_similarities: list[float] = []

    for case in cases:
        rows = list(rankings.get(case.query_id, ()))[:k]
        if rows:
            top_similarities.append(float(rows[0].get("similarity") or 0.0))
        if not case.relevant_chunk_ids:
            continue
        ids = [str(row.get("id")) for row in rows]
        hits = [1 if chunk_id in case.relevant_chunk_ids else 0 for chunk_id in ids]
        recall += len({chunk_id for chunk_id in ids if chunk_id in case.relevant_chunk_ids}) / len(case.relevant_chunk_ids)
        precision += sum(hits) / k
        mrr += next((1 / rank for rank, hit in enumerate(hits, start=1) if hit), 0.0)
        ideal = sum(1 / math.log2(rank + 1) for rank in range(1, min(k, len(case.relevant_chunk_ids)) + 1))
        ndcg += sum(hit / math.log2(rank + 1) for rank, hit in enumerate(hits, start=1)) / ideal
        resource_hit += float(any(row.get("recurso_id") in case.relevant_resource_ids for row in rows))

    size = len(positives)
    return {
        "cases": len(cases),
        "positive_cases": size,
        "unanswerable_cases": len(negatives),
        "k": k,
        "recall_at_k": recall / size if size else 0.0,
        "precision_at_k": precision / size if size else 0.0,
        "mrr_at_k": mrr / size if size else 0.0,
        "ndcg_at_k": ndcg / size if size else 0.0,
        "resource_hit_rate": resource_hit / size if size else 0.0,
        "unanswerable_false_positive_rate": (
            sum(bool(rankings.get(case.query_id)) for case in negatives) / len(negatives)
            if negatives else 0.0
        ),
        "mean_top_similarity": (
            sum(top_similarities) / len(top_similarities) if top_similarities else 0.0
        ),
    }
