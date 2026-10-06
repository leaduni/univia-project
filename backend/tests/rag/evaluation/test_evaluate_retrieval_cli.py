import json

import pytest

from scripts.rag.evaluate_retrieval import load_cases


def test_cli_requires_explicit_opt_in_for_ai_reviewed_labels(tmp_path) -> None:
    source = tmp_path / "cases.jsonl"
    source.write_text(
        json.dumps({
            "query_id": "q1", "query": "derivadas", "review_status": "ai_approved",
            "relevant_chunk_ids": ["chunk-1"], "source": {"recurso_id": 7},
        }) + "\n", encoding="utf-8",
    )

    with pytest.raises(ValueError, match="No hay casos"):
        load_cases(source, allow_ai_reviewed=False)

    cases = load_cases(source, allow_ai_reviewed=True)
    assert cases[0].relevant_chunk_ids == frozenset({"chunk-1"})
    assert cases[0].relevant_resource_ids == frozenset({7})


def test_cli_rejects_incomplete_human_labels_and_excludes_calibration(tmp_path) -> None:
    source = tmp_path / "cases.jsonl"
    base = {
        "query_id": "q1", "query": "¿Qué indica la ley?", "review_status": "human_approved",
        "reviewed_by": "revisor-uni", "category": "teoria", "split": "evaluation",
        "answerable": True, "relevant_chunk_ids": ["chunk-1"],
        "relevant_resource_ids": [7],
    }
    source.write_text(json.dumps(base | {"reviewed_by": ""}) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="reviewed_by"):
        load_cases(source)

    source.write_text("\n".join([
        json.dumps(base),
        json.dumps(base | {"query_id": "q2", "split": "calibration"}),
    ]) + "\n", encoding="utf-8")
    assert [case.query_id for case in load_cases(source)] == ["q1"]
