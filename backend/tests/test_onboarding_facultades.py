"""Tests de la restricción por facultad activa en el onboarding (RF-EST-01).

Solo las facultades con `activa = true` (hoy FIIS y FIM) pueden matricular
estudiantes. El wizard pinta las demás bloqueadas con "Próximamente", pero el
endpoint es público para cualquier cliente: la regla tiene que vivir también en
`POST /api/onboarding/complete`.
"""

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
    carreras=None,
    facultades: list | None = None,
    malla_id: int | None = 1,
    malla_cursos: list | None = None,
    progreso: list | None = None,
    facultad_error: bool = False,
):
    """MagicMock del cliente Supabase para el catálogo y el cierre del onboarding.

    `carreras` es la fila que devuelve `_obtener_carrera` (dict, ya con o sin el
    embed `facultades(activa)`) o, para el catálogo, la lista completa que
    espera `GET /onboarding/data`. `facultades` alimenta tanto el catálogo como
    el fallback de `_validar_facultad_activa`.
    """
    mock = MagicMock()

    def table(name: str):
        tbl = MagicMock()
        tbl.__name__ = name

        tbl.select.return_value = tbl
        tbl.eq.return_value = tbl
        tbl.maybe_single.return_value = tbl
        tbl.in_.return_value = tbl
        tbl.order.return_value = tbl
        tbl.limit.return_value = tbl

        if name == "perfiles":
            tbl.execute.return_value = _ok(perfil)
        elif name == "carreras":
            tbl.execute.return_value = _ok(carreras)
        elif name == "facultades":
            if facultad_error:
                tbl.execute.side_effect = Exception("facultades-fail")
            else:
                # Admite lista (catálogo con `.order()`) o dict (fallback con
                # `.maybe_single()`), según el camino que pida el test.
                tbl.execute.return_value = _ok(facultades if facultades is not None else [])
        elif name == "mallas":
            tbl.execute.return_value = _ok([{"id": malla_id}] if malla_id else [])
        elif name == "malla_cursos":
            tbl.execute.return_value = _ok(malla_cursos or [])
        elif name == "malla_curso_prerrequisitos":
            tbl.execute.return_value = _ok([])
        elif name == "progreso_cursos":
            tbl.execute.return_value = _ok(progreso or [])
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
fake_user.user_metadata = {}


async def _fake_get_current_user():
    return fake_user, "fake-token"


@pytest.fixture(autouse=True)
def override_auth():
    """Bypass real Supabase auth for all tests in this module."""
    from app.core.auth_utils import get_current_user
    app.dependency_overrides[get_current_user] = _fake_get_current_user
    yield
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def mock_admin_client():
    """Aísla las escrituras del cierre: ningún test toca la base real."""
    admin = MagicMock()

    def table(name: str):
        tbl = MagicMock()
        tbl.update.return_value = tbl
        tbl.insert.return_value = tbl
        tbl.eq.return_value = tbl
        tbl.in_.return_value = tbl
        tbl.execute.return_value = _ok([{"id": "fake-user-id"}])
        return tbl

    admin.table.side_effect = table

    with patch("app.routers.onboarding.get_admin_client", return_value=admin):
        yield admin



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


PERFIL_COMPLETO = {
    "id": "fake-user-id",
    "email": "test@uni.edu.pe",
    "codigo_estudiante": "20240001",
    "nombre_completo": "Test User",
    "carrera_id": None,
    "ciclo_actual": None,
}

CURSOS_MALLA = [
    {"id": 901, "curso_id": 101, "ciclo": 1, "credits": 4, "cursos": {"code": "CS101", "name": "Curso A"}},
]

PAYLOAD_INACTIVA = {"carrera_id": 30, "ciclo_actual": 1, "cursos_inscritos": [101]}
PAYLOAD_ACTIVA = {"carrera_id": 1, "ciclo_actual": 1, "cursos_inscritos": [101]}


# ═══════════════════════════════════════════════════════════════════════════
# T1 — GET /api/onboarding/data expone `activa` y no filtra facultades
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_catalogo_devuelve_activa_y_no_filtra_facultades(client, mock_get_supabase):
    """Spec: el catálogo lista TODAS las facultades con su bandera `activa`.

    No se filtran en el backend: el paso 1 las muestra bloqueadas, y el estado
    vacío del wizard sigue significando "no se pudo cargar".
    """
    supabase = _build_supabase_mock(
        facultades=[
            {"id": 1, "codigo": "FIIS", "nombre": "Facultad de Ingeniería Industrial y de Sistemas", "activa": True},
            {"id": 7, "codigo": "FIC", "nombre": "Facultad de Ingeniería Civil", "activa": False},
        ],
        carreras=[
            {
                "id": 6,
                "codigo": "IND",
                "name": "Ingeniería Industrial",
                "description": None,
                "duracion_ciclos": 10,
                "facultad_id": 1,
            },
            {
                "id": 30,
                "codigo": "CIV",
                "name": "Ingeniería Civil",
                "description": None,
                "duracion_ciclos": 10,
                "facultad_id": 7,
            },
        ],
    )

    mock_get_supabase(supabase)

    response = await client.get("/api/onboarding/data")

    assert response.status_code == 200, f"got {response.status_code}: {response.text}"
    body = response.json()
    facultades = {f["codigo"]: f for f in body["facultades"]}

    assert set(facultades) == {"FIIS", "FIC"}, (
        f"El catálogo debe incluir también las facultades inactivas, got {list(facultades)}"
    )
    assert facultades["FIIS"]["activa"] is True
    assert facultades["FIC"]["activa"] is False

    # La carrera hereda el objeto facultad completo, con su bandera.
    civil = next(c for c in body["carreras"] if c["id"] == 30)
    assert civil["facultad"]["activa"] is False



# ═══════════════════════════════════════════════════════════════════════════
# T2 — Facultad inactiva: 400 en /onboarding/complete (vía embed)
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_matricula_en_facultad_inactiva_returns_400(client, mock_get_supabase):
    """Spec: carrera cuya facultad embebida tiene activa=false → 400."""
    supabase = _build_supabase_mock(
        perfil=PERFIL_COMPLETO,
        carreras={
            "id": 30,
            "codigo": "CIV",
            "name": "Ingeniería Civil",
            "duracion_ciclos": 10,
            "facultad_id": 7,
            "facultades": {"activa": False},
        },
        malla_cursos=CURSOS_MALLA,
    )

    mock_get_supabase(supabase)

    response = await client.post("/api/onboarding/complete", json=PAYLOAD_INACTIVA)

    assert response.status_code == 400, (
        f"Expected 400 para facultad inactiva, got {response.status_code}: {response.text}"
    )
    body = response.json()
    assert body.get("status") == "error", f"Expected status=error, got {body}"
    assert body["errors"][0]["field"] == "carrera_id"
    assert "habilitada" in body["errors"][0]["message"]


# ═══════════════════════════════════════════════════════════════════════════
# T3 — Facultad inactiva sin embed: se resuelve por consulta aparte
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_facultad_inactiva_sin_embed_tambien_se_bloquea(client, mock_get_supabase):
    """Spec: si el embed no viene, se consulta `facultades` y se aplica la regla."""
    supabase = _build_supabase_mock(
        perfil=PERFIL_COMPLETO,
        carreras={
            "id": 30,
            "codigo": "CIV",
            "name": "Ingeniería Civil",
            "duracion_ciclos": 10,
            "facultad_id": 7,
        },
        facultades={"activa": False},
        malla_cursos=CURSOS_MALLA,
    )

    mock_get_supabase(supabase)

    response = await client.post("/api/onboarding/complete", json=PAYLOAD_INACTIVA)

    assert response.status_code == 400, f"got {response.status_code}: {response.text}"
    assert response.json()["errors"][0]["field"] == "carrera_id"


# ═══════════════════════════════════════════════════════════════════════════
# T4 — Regresión: facultad activa sigue matriculando (200)
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_facultad_activa_sigue_matriculando(client, mock_get_supabase):
    """Spec: con activa=true la validación no interviene y el cierre da 200."""
    supabase = _build_supabase_mock(
        perfil=PERFIL_COMPLETO,
        carreras={
            "id": 1,
            "codigo": "FIIS-01",
            "name": "Ing. Sistemas",
            "duracion_ciclos": 10,
            "facultad_id": 1,
            "facultades": {"activa": True},
        },
        malla_cursos=CURSOS_MALLA,
        progreso=[{"curso_id": 101, "status": "in_progress"}],
    )

    mock_get_supabase(supabase)

    response = await client.post("/api/onboarding/complete", json=PAYLOAD_ACTIVA)

    assert response.status_code == 200, (
        f"Una facultad activa no debe verse afectada, got {response.status_code}: {response.text}"
    )


# ═══════════════════════════════════════════════════════════════════════════
# T5 — Fail-open: un fallo al leer la facultad no bloquea la matrícula
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_fallo_al_leer_facultad_no_bloquea(client, mock_get_supabase):
    """Spec: negar la matrícula por un error de red sería peor que el riesgo."""
    supabase = _build_supabase_mock(
        perfil=PERFIL_COMPLETO,
        carreras={
            "id": 1,
            "codigo": "FIIS-01",
            "name": "Ing. Sistemas",
            "duracion_ciclos": 10,
            "facultad_id": 1,
        },
        facultad_error=True,
        malla_cursos=CURSOS_MALLA,
        progreso=[{"curso_id": 101, "status": "in_progress"}],
    )

    mock_get_supabase(supabase)

    response = await client.post("/api/onboarding/complete", json=PAYLOAD_ACTIVA)

    assert response.status_code == 200, (
        f"Un error de lectura no debe bloquear la matrícula, got {response.status_code}: {response.text}"
    )

