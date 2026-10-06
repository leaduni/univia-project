from app.rag.evaluation.dimension_benchmark import (
    BenchmarkCase,
    DimensionResult,
    evaluate_rankings,
    select_dimension,
)


def test_evaluate_rankings_reports_perfect_retrieval_metrics() -> None:
    case = BenchmarkCase(query_id="q1", query="ley de ohm", relevant_chunk_ids=frozenset({"a", "b"}))

    metrics = evaluate_rankings([case], {"q1": ["a", "b", "x"]})

    assert metrics.recall_at_5 == 1.0
    assert metrics.recall_at_10 == 1.0
    assert metrics.mrr_at_10 == 1.0
    assert metrics.ndcg_at_10 == 1.0


def test_select_dimension_chooses_the_smallest_option_within_recall_tolerance() -> None:
    results = [
        DimensionResult(dimensions=256, recall_at_10=0.92, mrr_at_10=0.80, ndcg_at_10=0.81, latency_ms=25, vector_bytes=1024),
        DimensionResult(dimensions=512, recall_at_10=0.95, mrr_at_10=0.83, ndcg_at_10=0.84, latency_ms=28, vector_bytes=2048),
        DimensionResult(dimensions=768, recall_at_10=0.96, mrr_at_10=0.84, ndcg_at_10=0.85, latency_ms=31, vector_bytes=3072),
    ]

    selected = select_dimension(results, max_recall_drop=0.02)

    assert selected.dimensions == 512
