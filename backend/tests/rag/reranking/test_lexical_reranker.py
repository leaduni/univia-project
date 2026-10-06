import pytest

from app.rag.reranking.lexical import LexicalReranker


@pytest.mark.asyncio
async def test_reranker_promotes_a_relevant_span_without_losing_vector_score() -> None:
    rows = [
        {"id": "a", "contenido": "Contenido general del curso.", "similarity": 0.82},
        {"id": "b", "contenido": "La regla de la cadena permite derivar funciones compuestas.", "similarity": 0.76},
    ]

    ranked = await LexicalReranker().rerank("regla de la cadena", rows, top_k=2)

    assert [row["id"] for row in ranked] == ["b", "a"]
    assert ranked[0]["similarity"] == 0.76
    assert ranked[0]["rerank_score"] > ranked[1]["rerank_score"]
    assert "rerank_score" not in rows[1]


@pytest.mark.asyncio
async def test_reranker_keeps_vector_order_for_empty_query() -> None:
    rows = [
        {"id": "a", "contenido": "Primero", "similarity": 0.9},
        {"id": "b", "contenido": "Segundo", "similarity": 0.8},
    ]

    ranked = await LexicalReranker().rerank("  ", rows, top_k=1)

    assert [row["id"] for row in ranked] == ["a"]
