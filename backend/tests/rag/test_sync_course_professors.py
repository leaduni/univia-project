import pytest

from scripts.rag.sync_course_professors import validate_snapshot


def test_snapshot_preserves_multiple_professors_for_course_27():
    rows = [
        {"curso_id": 27, "profesor_id": 62, "profesores": {"nombre_completo": "Docente A"}},
        {"curso_id": 27, "profesor_id": 63, "profesores": {"nombre_completo": "Docente B"}},
    ]
    assert validate_snapshot(rows, expected_count=2, course_ids=[27]) == (
        (27, 62, "Docente A"), (27, 63, "Docente B"),
    )


@pytest.mark.parametrize("rows,count,scope", [
    ([], 0, [27]),
    ([{"curso_id": 27, "profesor_id": 62}], 2, [27]),
    ([{"curso_id": 27, "profesor_id": 62}] * 2, 2, [27]),
    ([{"curso_id": 28, "profesor_id": 62}], 1, [27]),
    ([{"curso_id": 27, "profesor_id": None}], 1, [27]),
])
def test_invalid_or_incomplete_snapshot_cannot_replace_existing_associations(rows, count, scope):
    with pytest.raises(ValueError):
        validate_snapshot(rows, expected_count=count, course_ids=scope)


def test_empty_snapshot_requires_explicit_override():
    assert validate_snapshot([], expected_count=0, course_ids=[27], allow_empty=True) == ()
