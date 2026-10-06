import json
from pathlib import Path

import pytest

from scripts.rag.revectorize_chunks_to_postgres import (
    group_records_by_resource,
    pending_resource_ids,
    resource_is_current,
    save_state,
)


def _record(resource_id: int, chunk_index: int, *, curso_id: int = 10) -> dict:
    return {
        "id": f"00000000-0000-0000-0000-{resource_id:012d}",
        "recurso_id": resource_id,
        "curso_id": curso_id,
        "chunk_index": chunk_index,
        "contenido": f"contenido {chunk_index}",
        "metadata": {},
        "curso_nombre": "Cálculo I",
        "titulo_recurso": "Semana 1",
        "tipo_recurso": "Separata",
        "profesor_id": None,
        "profesor_nombre": None,
        "ciclo_recurso": 1,
        "year_recurso": 2026,
    }


def test_groups_and_sorts_chunks_by_resource() -> None:
    grouped = group_records_by_resource([_record(2, 1), _record(1, 0), _record(2, 0)])

    assert list(grouped) == [1, 2]
    assert [row["chunk_index"] for row in grouped[2]] == [0, 1]


def test_grouping_rejects_inconsistent_course_for_a_resource() -> None:
    with pytest.raises(ValueError, match="curso_id"):
        group_records_by_resource([_record(2, 0), _record(2, 1, curso_id=99)])


def test_state_skips_completed_resources(tmp_path: Path) -> None:
    state_path = tmp_path / "import-state.json"
    save_state(state_path, completed_resource_ids={2}, imported_chunks=4)

    assert pending_resource_ids([1, 2, 3], state_path) == [1, 3]
    assert json.loads(state_path.read_text(encoding="utf-8"))["imported_chunks"] == 4


def test_current_resource_requires_matching_count_hash_and_dimension() -> None:
    row = {"chunk_count": 3, "hash_ok": True, "dimensions_ok": True}

    assert resource_is_current(row, expected_chunks=3) is True
    assert resource_is_current(row, expected_chunks=4) is False
    assert resource_is_current({**row, "hash_ok": False}, expected_chunks=3) is False
    assert resource_is_current({**row, "dimensions_ok": False}, expected_chunks=3) is False
