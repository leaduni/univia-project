"""Compara ranking vectorial y reranking local sobre consultas etiquetadas."""

import argparse
import asyncio
import json
import statistics
import time
from pathlib import Path

from dotenv import load_dotenv

from app.core.rag_database import close_rag_database, init_rag_database, rag_store_name
from app.rag.evaluation.dataset import validate_human_case
from app.rag.evaluation.retrieval import EvaluationCase, evaluate_retrieval
from app.rag.local_retriever import LocalChunkRetriever
from app.rag.reranking.lexical import LexicalReranker
from app.rag.retriever import SyllabusRetriever
from app.rag.storage.factory import get_chunk_store


def load_cases(path: Path, *, allow_ai_reviewed: bool = False) -> list[EvaluationCase]:
    allowed = {"human_approved"}
    if allow_ai_reviewed:
        allowed.add("ai_approved")
    cases = []
    seen = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("review_status") not in allowed:
            continue
        if row["review_status"] == "human_approved":
            validate_human_case(row)
            if row["split"] != "evaluation":
                continue
        query_id = str(row["query_id"])
        if query_id in seen:
            raise ValueError(f"query_id duplicado: {query_id}")
        seen.add(query_id)
        source = row.get("source") or {}
        resource_ids = row.get("relevant_resource_ids")
        if resource_ids is None:
            resource_ids = [source["recurso_id"]] if source.get("recurso_id") is not None else []
        cases.append(EvaluationCase(
            query_id=query_id,
            query=str(row["query"]),
            relevant_chunk_ids=frozenset(map(str, row.get("relevant_chunk_ids") or [])),
            relevant_resource_ids=frozenset(map(int, resource_ids)),
        ))
    if not cases:
        raise ValueError("No hay casos revisados para evaluar.")
    return cases


def _percentile_ms(values: list[float], fraction: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int((len(ordered) - 1) * fraction))]


async def run(cases: list[EvaluationCase]) -> dict:
    if rag_store_name() != "postgres":
        raise RuntimeError("La evaluación requiere RAG_STORE=postgres.")
    await init_rag_database()
    try:
        store = await get_chunk_store()
        retriever = SyllabusRetriever()
        local = LocalChunkRetriever(store)
        reranker = LexicalReranker()
        vector_rankings = {}
        reranked_rankings = {}
        latency_ms = []
        for index, case in enumerate(cases, start=1):
            started = time.perf_counter()
            vector = await asyncio.to_thread(retriever.vectorizar_pregunta, case.query, True)
            candidates = await local.search(
                query_embedding=vector, limit=40, min_similarity=0.0
            )
            vector_rankings[case.query_id] = candidates[:10]
            reranked_rankings[case.query_id] = await reranker.rerank(case.query, candidates, 10)
            latency_ms.append((time.perf_counter() - started) * 1000)
            print(f"Evaluado {index}/{len(cases)}: {case.query_id}", flush=True)
        return {
            "vector": {f"at_{k}": evaluate_retrieval(cases, vector_rankings, k=k) for k in (3, 5, 10)},
            "lexical_rerank": {f"at_{k}": evaluate_retrieval(cases, reranked_rankings, k=k) for k in (3, 5, 10)},
            "latency_ms": {
                "p50": statistics.median(latency_ms),
                "p95": _percentile_ms(latency_ms, 0.95),
            },
        }
    finally:
        await close_rag_database()


def main() -> None:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", type=Path, default=Path("data/rag_exports/benchmark_reviewed.jsonl"))
    parser.add_argument("--output", type=Path, default=Path("data/rag_exports/retrieval_evaluation.json"))
    parser.add_argument("--allow-ai-reviewed", action="store_true")
    args = parser.parse_args()
    cases = load_cases(args.cases, allow_ai_reviewed=args.allow_ai_reviewed)
    report = asyncio.run(run(cases))
    report["label_quality"] = (
        "provisional_ai_reviewed" if args.allow_ai_reviewed else "human_approved"
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Reporte: {args.output}")
    for name in ("vector", "lexical_rerank"):
        scores = report[name]["at_10"]
        print(f"{name}: Recall@10={scores['recall_at_k']:.3f}, MRR@10={scores['mrr_at_k']:.3f}, nDCG@10={scores['ndcg_at_k']:.3f}")


if __name__ == "__main__":
    main()
