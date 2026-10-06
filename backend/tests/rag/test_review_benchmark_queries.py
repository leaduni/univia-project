import json
from pathlib import Path

from scripts.rag.review_benchmark_queries import review_cases


def test_review_cases_marks_only_supported_questions_as_ai_approved(tmp_path: Path) -> None:
    path = tmp_path / "benchmark.jsonl"
    path.write_text(
        json.dumps({
            "query_id": "manual-001", "query": "¿Qué relación hay entre fuerza y aceleración?",
            "review_status": "draft", "source": {"excerpt": "La fuerza es masa por aceleración."},
        }) + "\n",
        encoding="utf-8",
    )

    changed = review_cases(path, lambda _: "APPROVE", limit=1)
    row = json.loads(path.read_text(encoding="utf-8"))

    assert changed == 1
    assert row["review_status"] == "ai_approved"
    assert row["reviewed_by"] == "gpt-4o-mini"
