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
    malla_id: int | None = 1,
    malla_cursos: list | None = None,
    malla_prereqs: list | None = None,
    progreso: list | None = None,
    logros_fail: bool = False,
):
    """Build a MagicMock that mimics the Supabase client for complete_onboarding.

    Post-migración a mallas curriculares: `_resolver_malla_id` lee `mallas`
    (id de la malla vigente) y `complete_onboarding` lee `malla_cursos`
    (curso_id/ciclo/credits + cursos(code,name) embebido) en vez de `cursos`
    directo; los prerrequisitos salen de `malla_curso_prerrequisitos`, no de
    `curso_prerrequisitos`.
    """
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
        tbl.limit.return_value = tbl

        if name == "perfiles":
            tbl.execute.return_value = _ok(perfil)
        elif name == "carreras":
            tbl.execute.return_value = _ok(carrera)
        elif name == "mallas":
            tbl.execute.return_value = _ok([{"id": malla_id}] if malla_id else [])
        elif name == "malla_cursos":
            tbl.execute.return_value = _ok(malla_cursos or [])
        elif name == "malla_curso_prerrequisitos":
            tbl.execute.return_value = _ok(malla_prereqs or [])
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
        malla_cursos=[
            {"id": 901, "curso_id": 101, "ciclo": 1, "credits": 4, "cursos": {"code": "CS101", "name": "Curso A"}},
            {"id": 902, "curso_id": 102, "ciclo": 1, "credits": 3, "cursos": {"code": "CS102", "name": "Curso B"}},
        ],
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
        malla_cursos=[
            {"id": 901, "curso_id": 101, "ciclo": 1, "credits": 4, "cursos": {"code": "CS101", "name": "Curso A"}},
        ],
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


# ═══════════════════════════════════════════════════════════════════════════
# Prerrequisitos — no se puede llevar un curso sin aprobar lo que exige
# ═══════════════════════════════════════════════════════════════════════════

def _mock_con_prereqs(progreso=None, prereqs=None):
    """101 (ciclo 1) es prerrequisito de 201 (ciclo 2)."""
    return _build_supabase_mock(
        perfil={
            "id": "fake-user-id",
            "email": "test@uni.edu.pe",
            "codigo_estudiante": "20240001",
            "nombre_completo": "Test User",
            "carrera_id": 1,
            "ciclo_actual": 1,
        },
        carrera={"id": 1, "codigo": "FIIS-01", "name": "Ing. Sistemas", "duracion_ciclos": 10},
        malla_cursos=[
            {"id": 901, "curso_id": 101, "ciclo": 1, "credits": 4,
             "cursos": {"code": "CS101", "name": "Curso A"}},
            {"id": 902, "curso_id": 201, "ciclo": 2, "credits": 4,
             "cursos": {"code": "CS201", "name": "Curso B"}},
        ],
        malla_prereqs=prereqs if prereqs is not None else [
            {"malla_curso_id": 902, "prerrequisito_malla_curso_id": 901},
        ],
        progreso=progreso or [],
    )


@pytest.mark.anyio
async def test_curso_sin_prerrequisito_aprobado_returns_400(client, mock_get_supabase):
    """Inscribirse en 201 sin aprobar 101 → 400 con error estructurado."""
    mock_get_supabase(_mock_con_prereqs())

    response = await client.post("/api/onboarding/complete", json={
        "carrera_id": 1, "ciclo_actual": 2,
        "cursos_inscritos": [201], "cursos_aprobados": [],
    })

    assert response.status_code == 400, response.text
    body = response.json()
    assert body["errors"][0]["field"] == "cursos_inscritos"
    assert "Curso B" in body["errors"][0]["message"]
    assert "Curso A" in body["errors"][0]["message"]


@pytest.mark.anyio
async def test_prerrequisito_declarado_habilita_el_curso(client, mock_get_supabase):
    """Declarar 101 aprobado en el wizard basta para poder llevar 201."""
    mock_get_supabase(_mock_con_prereqs())

    response = await client.post("/api/onboarding/complete", json={
        "carrera_id": 1, "ciclo_actual": 2,
        "cursos_inscritos": [201], "cursos_aprobados": [101],
    })

    assert response.status_code == 200, response.text


@pytest.mark.anyio
async def test_prerrequisito_ya_completado_en_bd_habilita_el_curso(client, mock_get_supabase):
    """Un 101 ya 'completed' en progreso_cursos también habilita 201."""
    mock_get_supabase(_mock_con_prereqs(progreso=[{"curso_id": 101, "status": "completed"}]))

    response = await client.post("/api/onboarding/complete", json={
        "carrera_id": 1, "ciclo_actual": 2,
        "cursos_inscritos": [201], "cursos_aprobados": [],
    })

    assert response.status_code == 200, response.text


@pytest.mark.anyio
async def test_prerrequisito_solo_en_curso_no_habilita(client, mock_get_supabase):
    """101 'in_progress' no cuenta: aún no está aprobado."""
    mock_get_supabase(_mock_con_prereqs(progreso=[{"curso_id": 101, "status": "in_progress"}]))

    response = await client.post("/api/onboarding/complete", json={
        "carrera_id": 1, "ciclo_actual": 2,
        "cursos_inscritos": [201], "cursos_aprobados": [],
    })

    assert response.status_code == 400, response.text


@pytest.mark.anyio
async def test_curso_sin_prerrequisitos_no_se_bloquea(client, mock_get_supabase):
    """Sin relaciones de prerrequisito, la matrícula pasa como antes."""
    mock_get_supabase(_mock_con_prereqs(prereqs=[]))

    response = await client.post("/api/onboarding/complete", json={
        "carrera_id": 1, "ciclo_actual": 2,
        "cursos_inscritos": [201], "cursos_aprobados": [],
    })

    assert response.status_code == 200, response.text


# ═══════════════════════════════════════════════════════════════════════════
# El ciclo solo avanza — no se puede retroceder a un ciclo ya cursado
# ═══════════════════════════════════════════════════════════════════════════

def _mock_en_ciclo(ciclo_previo, carrera_id=1):
    return _build_supabase_mock(
        perfil={
            "id": "fake-user-id",
            "email": "test@uni.edu.pe",
            "codigo_estudiante": "20240001",
            "nombre_completo": "Test User",
            "carrera_id": carrera_id,
            "ciclo_actual": ciclo_previo,
        },
        carrera={"id": 1, "codigo": "FIIS-01", "name": "Ing. Sistemas", "duracion_ciclos": 10},
        malla_cursos=[
            {"id": 901, "curso_id": 101, "ciclo": 1, "credits": 4,
             "cursos": {"code": "CS101", "name": "Curso A"}},
            {"id": 907, "curso_id": 701, "ciclo": 7, "credits": 4,
             "cursos": {"code": "CS701", "name": "Curso G"}},
        ],
        progreso=[],
    )


@pytest.mark.anyio
async def test_retroceder_de_ciclo_returns_400(client, mock_get_supabase):
    """Cuenta en ciclo 5 que declara ciclo 1 → 400, no un guardado incoherente."""
    mock_get_supabase(_mock_en_ciclo(5))

    response = await client.post("/api/onboarding/complete", json={
        "carrera_id": 1, "ciclo_actual": 1, "cursos_inscritos": [101],
    })

    assert response.status_code == 400, response.text
    body = response.json()
    assert body["errors"][0]["field"] == "ciclo_actual"
    assert "solo avanza" in body["errors"][0]["message"]


@pytest.mark.anyio
async def test_quedarse_en_el_mismo_ciclo_es_valido(client, mock_get_supabase):
    """Actualizar sin cambiar de ciclo (p. ej. declarar arrastres) sigue pasando."""
    mock_get_supabase(_mock_en_ciclo(1))

    response = await client.post("/api/onboarding/complete", json={
        "carrera_id": 1, "ciclo_actual": 1, "cursos_inscritos": [101],
    })

    assert response.status_code == 200, response.text


@pytest.mark.anyio
async def test_avanzar_de_ciclo_es_valido(client, mock_get_supabase):
    """Pasar de ciclo 5 a 7 es el caso normal de 'actualizar situación'."""
    mock_get_supabase(_mock_en_ciclo(5))

    response = await client.post("/api/onboarding/complete", json={
        "carrera_id": 1, "ciclo_actual": 7, "cursos_inscritos": [701],
    })

    assert response.status_code == 200, response.text


@pytest.mark.anyio
async def test_registro_inicial_puede_elegir_cualquier_ciclo(client, mock_get_supabase):
    """Sin carrera registrada no hay ciclo previo: se puede declarar el que sea."""
    mock_get_supabase(_mock_en_ciclo(5, carrera_id=None))

    response = await client.post("/api/onboarding/complete", json={
        "carrera_id": 1, "ciclo_actual": 1, "cursos_inscritos": [101],
    })

    assert response.status_code == 200, response.text
