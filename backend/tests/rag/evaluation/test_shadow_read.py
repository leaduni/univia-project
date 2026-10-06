from app.rag.evaluation.shadow_read import compare_rankings


def test_shadow_read_reports_overlap_and_top_result_agreement() -> None:
    result = compare_rankings(
        query_id="q-1",
        supabase_ids=["a", "b", "c"],
        postgres_ids=["a", "c", "d"],
    )

    assert result.query_id == "q-1"
    assert result.overlap_at_k == 0.5
    assert result.top_1_agrees is True
