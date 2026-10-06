import json
from pathlib import Path

from scripts.rag.draft_benchmark_queries import draft_queries


def test_draft_queries_fills_pending_cases_and_keeps_them_for_review(tmp_path: Path) -> None:
    path = tmp_path / "benchmark.jsonl"
    path.write_text(
        json.dumps({
            "query_id": "manual-001",
            "query": "",
            "relevant_chunk_ids": ["chunk-1"],
            "review_status": "pending",
            "source": {"curso_nombre": "Física", "titulo_recurso": "Semana 1", "excerpt": "La fuerza es masa por aceleración."},
        }) + "\n",
        encoding="utf-8",
    )

    changed = draft_queries(path, lambda _: "¿Cómo se relacionan fuerza, masa y aceleración?", limit=1)
    row = json.loads(path.read_text(encoding="utf-8"))

    assert changed == 1
    assert row["query"] == "¿Cómo se relacionan fuerza, masa y aceleración?"
    assert row["review_status"] == "draft"
