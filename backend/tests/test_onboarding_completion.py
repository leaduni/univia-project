"""Tests for POST /api/onboarding/complete — idempotency and validation guards."""

import pytest
from unittest.mock import MagicMock, patch

from app.main import app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ok(data):
    """Return a fake Supabase response with `.data`."""
    resp = MagicMock()
    resp.data = data
    return resp


def _build_supabase_mock(
    perfil: dict | None = None,
    carrera: dict | None = None,
    cursos_carrera: list | None = None,
    prereqs: list | None = None,
    progreso: list | None = None,
    logros_fail: bool = False,
):
    """Build a MagicMock that mimics the Supabase client for complete_onboarding."""
    mock = MagicMock()

    def table(name: str):
        tbl = MagicMock()
        tbl.__name__ = name

        # Builder chain — everything returns self
        tbl.select.return_value = tbl
        tbl.eq.return_value = tbl
        tbl.maybe_single.return_value = tbl
        tbl.in_.return_value = tbl
        tbl.order.return_value = tbl

        if name == "perfiles":
            tbl.execute.return_value = _ok(perfil)
        elif name == "carreras":
            tbl.execute.return_value = _ok(carrera)
        elif name == "cursos":
            tbl.execute.return_value = _ok(cursos_carrera or [])
        elif name == "curso_prerrequisitos":
            tbl.execute.return_value = _ok(prereqs or [])
        elif name == "progreso_cursos":
            tbl.execute.return_value = _ok(progreso or [])
        elif name == "logros_usuarios":
            if logros_fail:
                tbl.execute.side_effect = Exception("logros-fail")
            else:
                tbl.execute.return_value = _ok([])
        else:
            tbl.execute.return_value = _ok([])

        tbl.insert.return_value = tbl
        tbl.update.return_value = tbl
        tbl.upsert.return_value = tbl

        return tbl

    mock.table.side_effect = table
    return mock


# ---------------------------------------------------------------------------
# Auth override — FastAPI dependency_overrides
# ---------------------------------------------------------------------------

fake_user = MagicMock()
fake_user.id = "fake-user-id"


async def _fake_get_current_user():
    return fake_user, "fake-token"


@pytest.fixture(autouse=True)
def override_auth():
    """Bypass real Supabase auth for all tests in this module."""
    from app.core.auth_utils import get_current_user
    app.dependency_overrides[get_current_user] = _fake_get_current_user
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def mock_get_supabase():
    """Context-manager fixture that patches get_supabase with a builder."""
    active_patches = []

    def _patch(supabase_mock):
        patcher = patch("app.routers.onboarding.get_supabase", return_value=supabase_mock)
        patcher.start()
        active_patches.append(patcher)
        return patcher

    yield _patch
    for p in active_patches:
        p.stop()


# ═══════════════════════════════════════════════════════════════════════════
# T3 — Re-submission with already-persisted courses returns 200 OK
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_re_submission_all_courses_already_persisted_returns_200(
    client, mock_get_supabase,
):
    """Spec: re-submit identical cursos_inscritos → 200 OK, no duplicates."""
    supabase = _build_supabase_mock(
        perfil={
            "id": "fake-user-id",
            "email": "test@uni.edu.pe",
            "codigo_estudiante": "20240001",
            "nombre_completo": "Test User",
            "carrera_id": None,
            "ciclo_actual": None,
        },
        carrera={"id": 1, "codigo": "FIIS-01", "name": "Ing. Sistemas", "duracion_ciclos": 10},
        cursos_carrera=[
            {"id": 101, "code": "CS101", "name": "Curso A", "credits": 4, "ciclo": 1, "carrera_id": 1},
            {"id": 102, "code": "CS102", "name": "Curso B", "credits": 3, "ciclo": 1, "carrera_id": 1},
        ],
        prereqs=[],
        progreso=[
            {"curso_id": 101, "status": "in_progress"},
            {"curso_id": 102, "status": "in_progress"},
        ],
    )

    mock_get_supabase(supabase)

    payload = {"carrera_id": 1, "ciclo_actual": 1, "cursos_inscritos": [101, 102]}

    response = await client.post("/api/onboarding/complete", json=payload)

    # CURRENT (RED): returns 400 "Debes inscribirte en al menos 1 curso nuevo."
    # EXPECTED (GREEN): returns 200 OK
    assert response.status_code == 200, (
        f"Expected 200 OK for idempotent re-submission, got {response.status_code}: {response.text}"
    )


# ═══════════════════════════════════════════════════════════════════════════
# T4 — Invalid carrera_id still returns 400 with structured error
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_invalid_carrera_id_returns_400(client, mock_get_supabase):
    """Spec: non-existent carrera_id → 400 with structured field error."""
    supabase = _build_supabase_mock(
        perfil={
            "id": "fake-user-id",
            "email": "test@uni.edu.pe",
            "codigo_estudiante": "20240001",
            "nombre_completo": "Test User",
        },
        carrera=None,  # not found
        cursos_carrera=[],
        prereqs=[],
        progreso=[],
    )

    mock_get_supabase(supabase)

    payload = {"carrera_id": 999, "ciclo_actual": 1, "cursos_inscritos": [101]}

    response = await client.post("/api/onboarding/complete", json=payload)

    assert response.status_code == 400, (
        f"Expected 400 for invalid carrera_id, got {response.status_code}"
    )
    body = response.json()
    assert body.get("status") == "error", f"Expected status=error, got {body}"
    errors = body.get("errors", [])
    assert len(errors) >= 1, f"Expected at least one structured error, got {errors}"
    assert errors[0]["field"] == "carrera_id", (
        f"Expected field=carrera_id, got {errors[0]}"
    )


# ═══════════════════════════════════════════════════════════════════════════
# T4 (additional) — Invalid curso_id still returns 400
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_invalid_curso_id_returns_400(client, mock_get_supabase):
    """Spec: curso_id not belonging to carrera → 400 with structured error."""
    supabase = _build_supabase_mock(
        perfil={
            "id": "fake-user-id",
            "email": "test@uni.edu.pe",
            "codigo_estudiante": "20240001",
            "nombre_completo": "Test User",
        },
        carrera={"id": 1, "codigo": "FIIS-01", "name": "Ing. Sistemas", "duracion_ciclos": 10},
        cursos_carrera=[
            {"id": 101, "code": "CS101", "name": "Curso A", "credits": 4, "ciclo": 1, "carrera_id": 1},
        ],
        prereqs=[],
        progreso=[],
    )

    mock_get_supabase(supabase)

    payload = {"carrera_id": 1, "ciclo_actual": 1, "cursos_inscritos": [999]}

    response = await client.post("/api/onboarding/complete", json=payload)

    assert response.status_code == 400, (
        f"Expected 400 for invalid curso_id, got {response.status_code}"
    )
    body = response.json()
    assert body.get("status") == "error"
    errors = body.get("errors", [])
    assert len(errors) >= 1
    assert errors[0]["field"] == "cursos_inscritos", (
        f"Expected field=cursos_inscritos, got {errors[0]}"
    )
