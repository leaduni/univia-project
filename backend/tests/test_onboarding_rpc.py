"""
Tests for GET /api/onboarding/cursos — RPC-optimized onboarding (RED PHASE).

These tests define the expected behavior of the refactored endpoint BEFORE
implementation. They MUST fail initially because:
  1. The RPC function `get_malla_onboarding` does not exist yet
  2. The code still uses the old 3-query + BFS approach

After Phase 3 implementation, these tests will pass (GREEN PHASE).
"""

import pytest
from unittest.mock import MagicMock, patch

from app.main import app


# ═══════════════════════════════════════════════════════════════════════════
# Test fixtures and helpers
# ═══════════════════════════════════════════════════════════════════════════

fake_user = MagicMock()
fake_user.id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


async def _fake_get_current_user():
    return fake_user, "fake-token"


@pytest.fixture(autouse=True)
def override_auth():
    """Bypass real Supabase auth for all tests in this module."""
    from app.core.auth_utils import get_current_user

    app.dependency_overrides[get_current_user] = _fake_get_current_user
    yield
    app.dependency_overrides.clear()


def _ok(data):
    """Return a fake Supabase response with `.data`."""
    resp = MagicMock()
    resp.data = data
    return resp


def _build_rpc_supabase_mock(rpc_data=None, rpc_error=None, malla_id=1):
    """
    Build a MagicMock Supabase client for the RPC-based flow.

    Args:
        rpc_data: List of dicts that `.rpc("get_malla_onboarding", ...)` should return.
        rpc_error: If set, `.rpc().execute()` raises this exception.
        malla_id: ID returned by the fallback mallas query (only used when no
                  malla_id param is passed to the endpoint).
    """
    mock = MagicMock()

    # Table-based queries (only _resolver_malla_id uses them if malla_id is None)
    def table(name: str):
        tbl = MagicMock()
        tbl.select.return_value = tbl
        tbl.eq.return_value = tbl
        tbl.order.return_value = tbl
        tbl.limit.return_value = tbl

        if name == "mallas":
            tbl.execute.return_value = _ok([{"id": malla_id}] if malla_id else [])
        else:
            tbl.execute.return_value = _ok([])

        return tbl

    mock.table.side_effect = table

    # RPC call
    rpc_mock = MagicMock()
    if rpc_error:
        rpc_mock.execute.side_effect = rpc_error
    else:
        rpc_mock.execute.return_value = _ok(rpc_data or [])

    mock.rpc.return_value = rpc_mock

    return mock


# ═══════════════════════════════════════════════════════════════════════════
# RPC response builder — mimics what get_malla_onboarding() will return
# ═══════════════════════════════════════════════════════════════════════════

def _rpc_row(
    curso_id, code, name, credits=4, ciclo=1, tipo="OBLIGATORIO",
    status="available", prerrequisito_ids=None, prerrequisitos_faltantes=None,
):
    return {
        "curso_id": curso_id,
        "code": code,
        "name": name,
        "credits": credits,
        "ciclo": ciclo,
        "tipo": tipo,
        "status": status,
        "prerrequisito_ids": prerrequisito_ids or [],
        "prerrequisitos_faltantes": prerrequisitos_faltantes or [],
    }


# ═══════════════════════════════════════════════════════════════════════════
# EC-1: Alumno nuevo — cero progreso — todos ciclo 1 available
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_new_student_all_cycle_1_available(client):
    """EC-1: New student (no progress) → all cycle-1 courses are 'available'.

    RED PHASE: Will fail because the endpoint doesn't call RPC yet.
    """
    rpc_data = [
        _rpc_row(101, "FB101", "Geometria Analitica", ciclo=1, status="available"),
        _rpc_row(102, "FB102", "Calculo Diferencial", ciclo=1, status="available"),
        _rpc_row(103, "FB103", "Quimica I", ciclo=1, status="available"),
    ]
    supabase = _build_rpc_supabase_mock(rpc_data=rpc_data)

    with patch("app.routers.onboarding.get_supabase", return_value=supabase):
        response = await client.get(
            "/api/onboarding/cursos",
            params={"carrera_id": 1, "ciclo_actual": 1, "malla_id": 1},
        )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    body = response.json()
    assert body["carrera_id"] == 1
    assert len(body["cursos"]) == 3
    for curso in body["cursos"]:
        assert curso["status"] == "available", f"Course {curso['name']} should be available"
        assert curso["prerrequisitos_faltantes"] == []


# ═══════════════════════════════════════════════════════════════════════════
# EC-2: Cursos aprobados fuera de la malla — ignorados
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_courses_outside_malla_ignored(client):
    """EC-2: Completed courses outside this malla do not affect status.

    RED PHASE: Will fail because the endpoint doesn't call RPC yet.
    """
    rpc_data = [
        _rpc_row(201, "CS101", "Programacion I", ciclo=1, status="available"),
        _rpc_row(202, "CS102", "Programacion II", ciclo=2, status="locked",
                 prerrequisito_ids=[201],
                 prerrequisitos_faltantes=[{"id": 201, "code": "CS101", "name": "Programacion I"}]),
    ]
    supabase = _build_rpc_supabase_mock(rpc_data=rpc_data)

    with patch("app.routers.onboarding.get_supabase", return_value=supabase):
        response = await client.get(
            "/api/onboarding/cursos",
            params={"carrera_id": 1, "ciclo_actual": 2, "malla_id": 1},
        )

    assert response.status_code == 200
    body = response.json()
    cursos = {c["id"]: c for c in body["cursos"]}
    # CS101 should be available (no prereqs in this malla)
    assert cursos[201]["status"] == "available"
    # CS102 should be locked because CS101 is not completed
    assert cursos[202]["status"] == "locked"


# ═══════════════════════════════════════════════════════════════════════════
# EC-3: Curso sin prerrequisitos — available o completed
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_course_without_prereqs_available_or_completed(client):
    """EC-3: Course with no prerequisites → 'available' (no progress) or 'completed'.

    RED PHASE: Will fail because the endpoint doesn't call RPC yet.
    """
    rpc_data = [
        _rpc_row(301, "FB101", "Etica y Filosofia", ciclo=1, status="available",
                 prerrequisito_ids=[], prerrequisitos_faltantes=[]),
        _rpc_row(302, "FB102", "Redaccion", ciclo=1, status="completed",
                 prerrequisito_ids=[], prerrequisitos_faltantes=[]),
    ]
    supabase = _build_rpc_supabase_mock(rpc_data=rpc_data)

    with patch("app.routers.onboarding.get_supabase", return_value=supabase):
        response = await client.get(
            "/api/onboarding/cursos",
            params={"carrera_id": 1, "ciclo_actual": 1, "malla_id": 1},
        )

    assert response.status_code == 200
    cursos = {c["id"]: c for c in response.json()["cursos"]}
    assert cursos[301]["status"] == "available"
    assert cursos[301]["prerrequisito_ids"] == []
    assert cursos[301]["prerrequisitos_faltantes"] == []
    assert cursos[302]["status"] == "completed"
    assert cursos[302]["prerrequisito_ids"] == []
    assert cursos[302]["prerrequisitos_faltantes"] == []


# ═══════════════════════════════════════════════════════════════════════════
# EC-4: Cadena transitiva de prerrequisitos — locked si falta alguno
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_transitive_prereq_chain_locked(client):
    """EC-4: A requires B, B requires C. C not completed → A is locked.

    RED PHASE: Will fail because the endpoint doesn't call RPC yet.
    """
    rpc_data = [
        _rpc_row(401, "FB101", "Calculo Diferencial", ciclo=1, status="completed"),
        _rpc_row(402, "FB102", "Calculo Integral", ciclo=2, status="completed",
                 prerrequisito_ids=[401]),
        _rpc_row(403, "FB201", "Fisica I", ciclo=3, status="locked",
                 prerrequisito_ids=[402],
                 prerrequisitos_faltantes=[{"id": 402, "code": "FB102", "name": "Calculo Integral"}]),
    ]
    supabase = _build_rpc_supabase_mock(rpc_data=rpc_data)

    with patch("app.routers.onboarding.get_supabase", return_value=supabase):
        response = await client.get(
            "/api/onboarding/cursos",
            params={"carrera_id": 1, "ciclo_actual": 3, "malla_id": 1},
        )

    assert response.status_code == 200
    cursos = {c["id"]: c for c in response.json()["cursos"]}
    assert cursos[401]["status"] == "completed"
    assert cursos[402]["status"] == "completed"
    # Fisica I requires Calculo Integral which is NOT completed in RPC mock
    assert cursos[403]["status"] == "locked"
    assert len(cursos[403]["prerrequisitos_faltantes"]) == 1
    assert cursos[403]["prerrequisitos_faltantes"][0]["id"] == 402


# ═══════════════════════════════════════════════════════════════════════════
# EC-5: RPC falla — HTTP 502
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_rpc_failure_returns_502(client):
    """EC-5: RPC error → HTTP 502 with user-friendly message.

    RED PHASE: Will fail because the endpoint doesn't call RPC yet.
    """
    supabase = _build_rpc_supabase_mock(rpc_error=Exception("connection timeout"))

    with patch("app.routers.onboarding.get_supabase", return_value=supabase):
        response = await client.get(
            "/api/onboarding/cursos",
            params={"carrera_id": 1, "ciclo_actual": 1, "malla_id": 1},
        )

    assert response.status_code == 502, (
        f"Expected 502 for RPC failure, got {response.status_code}: {response.text}"
    )
    body = response.json()
    # The app wraps errors as {"status":"error","errors":[{"field":"...","message":"..."}]}
    error_msg = ""
    if body.get("errors"):
        error_msg = body["errors"][0].get("message", "")
    elif body.get("detail"):
        error_msg = body["detail"]
    assert "no está disponible" in error_msg or "Intenta" in error_msg, (
        f"Expected user-friendly error, got: {error_msg}"
    )


# ═══════════════════════════════════════════════════════════════════════════
# EC-6: Malla sin cursos — array vacío
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_empty_malla_returns_empty_array(client):
    """EC-6: Malla exists but has no visible courses → empty array, not error.

    RED PHASE: Will fail because the endpoint doesn't call RPC yet.
    """
    supabase = _build_rpc_supabase_mock(rpc_data=[])

    with patch("app.routers.onboarding.get_supabase", return_value=supabase):
        response = await client.get(
            "/api/onboarding/cursos",
            params={"carrera_id": 1, "ciclo_actual": 1, "malla_id": 1},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["carrera_id"] == 1
    assert body["cursos"] == []


# ═══════════════════════════════════════════════════════════════════════════
# EC-7: Perfil sin malla — fallback a malla vigente
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_fallback_to_vigente_when_no_malla_id_param(client):
    """EC-7: No malla_id param → resolver via _resolver_malla_id (vigente).

    RED PHASE: Will fail because the endpoint doesn't call RPC yet.
    """
    rpc_data = [
        _rpc_row(501, "FB101", "Curso Vigente", ciclo=1, status="available"),
    ]
    # malla_id=5 means the fallback query returns malla 5
    supabase = _build_rpc_supabase_mock(rpc_data=rpc_data, malla_id=5)

    with patch("app.routers.onboarding.get_supabase", return_value=supabase):
        response = await client.get(
            "/api/onboarding/cursos",
            params={"carrera_id": 1, "ciclo_actual": 1},  # no malla_id
        )

    assert response.status_code == 200
    body = response.json()
    assert len(body["cursos"]) == 1
    assert body["cursos"][0]["name"] == "Curso Vigente"


# ═══════════════════════════════════════════════════════════════════════════
# Bonus: mixed statuses — completed, in_progress, available, locked
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_mixed_statuses_all_present_in_response(client):
    """All four statuses appear correctly in the response.

    RED PHASE: Will fail because the endpoint doesn't call RPC yet.
    """
    rpc_data = [
        _rpc_row(601, "C01", "Completed Course", ciclo=1, status="completed"),
        _rpc_row(602, "C02", "In Progress Course", ciclo=2, status="in_progress"),
        _rpc_row(603, "C03", "Available Course", ciclo=3, status="available"),
        _rpc_row(604, "C04", "Locked Course", ciclo=4, status="locked",
                 prerrequisito_ids=[603],
                 prerrequisitos_faltantes=[{"id": 603, "code": "C03", "name": "Available Course"}]),
    ]
    supabase = _build_rpc_supabase_mock(rpc_data=rpc_data)

    with patch("app.routers.onboarding.get_supabase", return_value=supabase):
        response = await client.get(
            "/api/onboarding/cursos",
            params={"carrera_id": 1, "ciclo_actual": 4, "malla_id": 1},
        )

    assert response.status_code == 200
    statuses = {c["id"]: c["status"] for c in response.json()["cursos"]}
    assert statuses[601] == "completed"
    assert statuses[602] == "in_progress"
    assert statuses[603] == "available"
    assert statuses[604] == "locked"


# ═══════════════════════════════════════════════════════════════════════════
# Bonus: response model fields — all mandatory fields present
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_response_contains_all_mandatory_fields(client):
    """Every course in the response has all CursoPrereqItem fields.

    RED PHASE: Will fail because the endpoint doesn't call RPC yet.
    """
    rpc_data = [
        _rpc_row(701, "T01", "Test Course", credits=3, ciclo=2, tipo="ELECTIVO",
                 status="available"),
    ]
    supabase = _build_rpc_supabase_mock(rpc_data=rpc_data)

    with patch("app.routers.onboarding.get_supabase", return_value=supabase):
        response = await client.get(
            "/api/onboarding/cursos",
            params={"carrera_id": 1, "ciclo_actual": 2, "malla_id": 1},
        )

    assert response.status_code == 200
    curso = response.json()["cursos"][0]
    required_fields = {"id", "code", "name", "credits", "ciclo", "carrera_id",
                       "prerrequisito_ids", "status", "prerrequisitos_faltantes"}
    for field in required_fields:
        assert field in curso, f"Missing field '{field}' in response"
    assert curso["credits"] == 3
    assert curso["ciclo"] == 2
    assert curso["carrera_id"] == 1
