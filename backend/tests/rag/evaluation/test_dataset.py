import json

import pytest

from app.rag.evaluation.dataset import dataset_readiness, validate_human_case
from scripts.rag.build_review_queue import build_review_queue
from scripts.rag.audit_benchmark_dataset import audit_dataset


def _human_case(**overrides):
    row = {
        "query_id": "q-1",
        "query": "¿Qué explica el texto?",
        "review_status": "human_approved",
        "reviewed_by": "revisor-uni",
        "category": "teoria",
        "split": "evaluation",
        "answerable": True,
        "relevant_chunk_ids": ["chunk-1"],
        "relevant_resource_ids": [10],
    }
    row.update(overrides)
    return row


def test_human_positive_requires_reviewer_and_relevance() -> None:
    with pytest.raises(ValueError, match="reviewed_by"):
        validate_human_case(_human_case(reviewed_by=""))
    with pytest.raises(ValueError, match="relevant_chunk_ids"):
        validate_human_case(_human_case(relevant_chunk_ids=[]))


def test_human_negative_must_not_carry_positive_labels() -> None:
    with pytest.raises(ValueError, match="relevant_chunk_ids"):
        validate_human_case(_human_case(answerable=False))
    validate_human_case(_human_case(
        answerable=False, relevant_chunk_ids=[], relevant_resource_ids=[]
    ))


def test_readiness_requires_human_coverage_and_negatives() -> None:
    rows = [_human_case(), _human_case(
        query_id="q-2", query="¿Hay un tema inexistente?", answerable=False,
        relevant_chunk_ids=[], relevant_resource_ids=[],
    )]
    report = dataset_readiness(rows, minimum=2)
    assert report["human_approved"] == 2
    assert report["unanswerable"] == 1
    assert report["ready"] is False  # Faltan categorías y calibración.


def test_review_queue_preserves_existing_and_adds_distinct_pending_cases(tmp_path) -> None:
    export = tmp_path / "chunks.jsonl"
    rows = [
        {"id": f"chunk-{i}", "curso_id": i % 2, "recurso_id": i + 10,
         "contenido": f"Contenido {i}", "curso_nombre": "Curso",
         "titulo_recurso": f"Recurso {i}"}
        for i in range(6)
    ]
    export.write_text("\n".join(json.dumps(row) for row in rows) + "\n", encoding="utf-8")
    prior = tmp_path / "prior.jsonl"
    prior.write_text(json.dumps({
        "query_id": "manual-001", "query": "Pregunta anterior",
        "review_status": "ai_approved", "relevant_chunk_ids": ["chunk-0"],
        "source": {"chunk_id": "chunk-0"},
    }) + "\n", encoding="utf-8")
    output = tmp_path / "queue.jsonl"

    result = build_review_queue(export, prior, output, positives=3, negatives=1, seed=42)
    queue = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]

    assert result == {"existing": 1, "new_positive": 3, "new_negative": 1}
    assert queue[0]["query"] == "Pregunta anterior"
    assert len({row["source"]["chunk_id"] for row in queue[1:4]}) == 3
    assert all(row["source"]["chunk_id"] != "chunk-0" for row in queue[1:4])
    assert all(row["review_status"] == "pending" for row in queue[1:])
    assert all(not row["relevant_chunk_ids"] for row in queue[1:])
    assert queue[-1]["answerable"] is False


def test_audit_reports_review_progress_without_promoting_ai_labels(tmp_path) -> None:
    path = tmp_path / "queue.jsonl"
    path.write_text("\n".join([
        json.dumps(_human_case()),
        json.dumps(_human_case(query_id="q-2", review_status="ai_approved")),
        json.dumps({"query_id": "q-3", "review_status": "pending"}),
    ]) + "\n", encoding="utf-8")

    report = audit_dataset(path)

    assert report["human_approved"] == 1
    assert report["ai_approved"] == 1
    assert report["pending_or_needs_review"] == 1
    assert report["ready"] is False
