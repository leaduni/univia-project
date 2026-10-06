from app.rag.storage.postgres import _SEARCH_SQL


def test_postgres_search_orders_candidates_by_cosine_distance_before_thresholding() -> None:
    assert "ORDER BY embedding <=> $1::vector" in _SEARCH_SQL
    assert "ORDER BY similarity DESC" not in _SEARCH_SQL
