"""
Tests de resiliencia de GET /api/dashboard/cursos-activos.

Cubren la causa raíz del mensaje "No se pudieron cargar tus cursos activos.":
el backend reutiliza UNA instancia de cliente Supabase por token (pool LRU de
app/core/database.py) y el dashboard lanza cuatro peticiones en paralelo al
iniciar sesión. Cuando la conexión HTTP/2 compartida se corrompe, el RPC caía
en 500. `_run_rpc` ahora reintenta con un cliente recién creado
(`ejecutar_con_reintento`), y estos tests fijan ese comportamiento, además del
contrato de "usuario sin matrícula responde 200 con lista vacía".
"""

import httpx
import pytest
from unittest.mock import MagicMock, patch

from app.main import app


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


def _resp(data):
    """Fake Supabase response with `.data`."""
    resp = MagicMock()
    resp.data = data
    return resp


# Payload de la RPC `get_cursos_activos_datos` para un estudiante sin malla.
DATOS_SIN_MALLA = {"malla_id": None, "cursos": [], "steps": [], "unidades": []}

# Estudiante con malla asignada pero sin cursos en progreso todavía.
DATOS_SIN_CURSOS = {"malla_id": 21, "cursos": [], "steps": [], "unidades": []}

# Estudiante con un curso en progreso y 1 de 2 temas completados.
DATOS_CON_CURSOS = {
    "malla_id": 21,
    "cursos": [
        {"curso_id": 29, "code": "BRN01", "name": "Realidad Nacional", "credits": 3, "ciclo": 6}
    ],
    "steps": [
        {"id": 101, "curso_id": 29, "title": "Unidad 1", "order_index": 1},
        {"id": 102, "curso_id": 29, "title": "Unidad 2", "order_index": 2},
    ],
    "unidades": [{"step_id": 101, "completado": True}],
}


def _cliente_supabase(secuencia):
    """Cliente Supabase falso: cada `.rpc().execute()` consume un paso.

    Un paso puede ser el payload a devolver o una excepción a lanzar, de modo
    que se puede simular "la conexión se corta y el reintento funciona".
    """
    pasos = list(secuencia)

    def _execute():
        paso = pasos.pop(0)
        if isinstance(paso, Exception):
            raise paso
        return _resp(paso)

    mock = MagicMock()
    mock.rpc.return_value.execute.side_effect = _execute
    return mock


# ═══════════════════════════════════════════════════════════════════════════
# Causa raíz: la conexión HTTP/2 caída se reintenta en vez de devolver 500
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_reintenta_tras_caida_de_conexion_y_devuelve_200(client):
    """Un `Server disconnected` transitorio ya no rompe el dashboard.

    Antes el endpoint respondía 500 con "No se pudieron cargar tus cursos
    activos."; ahora el reintento recupera la sesión y llegan los datos.
    """
    cliente = _cliente_supabase([
        httpx.RemoteProtocolError("Server disconnected"),
        DATOS_CON_CURSOS,
    ])

    with patch("app.core.database.get_supabase", return_value=cliente):
        response = await client.get("/api/dashboard/cursos-activos")

    assert response.status_code == 200
    cursos = response.json()["cursos"]
    assert len(cursos) == 1
    assert cursos[0]["code"] == "BRN01"
    assert cursos[0]["temas_completados"] == 1
    assert cursos[0]["temas_totales"] == 2
    assert cursos[0]["siguiente_tema"] == "Unidad 2"
    assert cursos[0]["progreso"] == 50


@pytest.mark.anyio
async def test_caida_persistente_sigue_devolviendo_500_con_mensaje_amigable(client):
    """Si la conexión no se recupera se mantiene el 500: no se silencian fallos."""
    cliente = _cliente_supabase([
        httpx.RemoteProtocolError("Server disconnected"),
        httpx.RemoteProtocolError("Server disconnected"),
    ])

    with patch("app.core.database.get_supabase", return_value=cliente):
        response = await client.get("/api/dashboard/cursos-activos")

    assert response.status_code == 500
    body = response.json()
    assert body["errors"][0]["field"] == "general"
    assert body["errors"][0]["message"] == "No se pudieron cargar tus cursos activos."


# ═══════════════════════════════════════════════════════════════════════════
# Contrato: usuario recién registrado / sin matrícula responde 200 con []
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_estudiante_sin_malla_responde_200_con_lista_vacia(client):
    """Onboarding pendiente es un estado normal de la cuenta, no un error."""
    cliente = _cliente_supabase([DATOS_SIN_MALLA])

    with patch("app.core.database.get_supabase", return_value=cliente):
        response = await client.get("/api/dashboard/cursos-activos")

    assert response.status_code == 200
    assert response.json() == {"cursos": []}


@pytest.mark.anyio
async def test_estudiante_sin_cursos_en_progreso_responde_200_con_lista_vacia(client):
    """Con malla asignada pero sin matrícula vigente tampoco se lanza error."""
    cliente = _cliente_supabase([DATOS_SIN_CURSOS])

    with patch("app.core.database.get_supabase", return_value=cliente):
        response = await client.get("/api/dashboard/cursos-activos")

    assert response.status_code == 200
    assert response.json() == {"cursos": []}
