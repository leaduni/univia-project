"""Los créditos y el avance tienen que seguir lo que el estudiante declara.

Estos tests no miran las escrituras: aplican el efecto sobre una `progreso_cursos`
simulada y calculan el avance con `calcular_avance`, que es la misma función que
alimenta el dashboard. Así se mide lo que el estudiante realmente vería.
"""

import pytest
from unittest.mock import MagicMock, patch

from app.main import app
from app.core.avance import calcular_avance

# Malla de prueba: 7 ciclos × 3 cursos × 3 créditos. 601 requiere 501.
MALLA = [
    {
        "id": 900 + c * 100 + j,
        "curso_id": c * 100 + j,
        "ciclo": c,
        "credits": 3,
        "cursos": {"code": f"C{c}{j}", "name": f"Curso {c * 100 + j}"},
    }
    for c in range(1, 8)
    for j in range(1, 4)
]
PREREQS = [{"malla_curso_id": 900 + 601, "prerrequisito_malla_curso_id": 900 + 501}]
CURSOS = {m["curso_id"]: {"credits": m["credits"]} for m in MALLA}

CICLOS_1_A_5 = [c * 100 + j for c in range(1, 6) for j in range(1, 4)]

PERFIL = {
    "id": "u1", "email": "a@uni.pe", "codigo_estudiante": "20240001",
    "nombre_completo": "A", "carrera_id": 1, "ciclo_actual": 5,
}


def _ok(data):
    r = MagicMock()
    r.data = data
    return r


def _supabase(progreso_inicial: dict):
    """Supabase falso que APLICA las escrituras sobre `progreso`."""
    progreso = dict(progreso_inicial)
    mock = MagicMock()

    def table(name):
        tbl = MagicMock()
        estado: dict = {"ids": None, "update": None}
        for m in ("select", "maybe_single", "order", "limit"):
            getattr(tbl, m).return_value = tbl
        tbl.eq.side_effect = lambda *a, **k: tbl
        tbl.upsert.return_value = tbl

        def in_(_col, vals):
            estado["ids"] = list(vals)
            return tbl
        tbl.in_.side_effect = in_

        def insert(filas, *a, **k):
            if name == "progreso_cursos":
                for f in filas:
                    progreso[f["curso_id"]] = f["status"]
            return tbl
        tbl.insert.side_effect = insert

        def update(campos, *a, **k):
            # El .in_() con los ids llega después del .update(): se aplica en
            # execute(), cuando la cadena ya está armada.
            estado["update"] = campos
            return tbl
        tbl.update.side_effect = update

        def execute():
            if name == "progreso_cursos" and estado["update"] and estado["ids"]:
                for cid in estado["ids"]:
                    progreso[cid] = estado["update"]["status"]
                estado["update"] = None
            return _ok({
                "perfiles": PERFIL,
                "carreras": {"id": 1, "codigo": "C", "name": "Sistemas", "duracion_ciclos": 10},
                "mallas": [{"id": 1}],
                "malla_cursos": MALLA,
                "malla_curso_prerrequisitos": PREREQS,
                "progreso_cursos": [
                    {"curso_id": k, "status": v} for k, v in progreso.items()
                ],
            }.get(name, []))
        tbl.execute.side_effect = execute
        return tbl

    mock.table.side_effect = table
    return mock, progreso


fake_user = MagicMock()
fake_user.id = "u1"


async def _fake_get_current_user():
    return fake_user, "fake-token"


@pytest.fixture(autouse=True)
def override_auth():
    from app.core.auth_utils import get_current_user
    app.dependency_overrides[get_current_user] = _fake_get_current_user
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def estado_inicial():
    """Ciclos 1-4 aprobados (36 créditos) y ciclo 5 en curso."""
    progreso = {c * 100 + j: "completed" for c in range(1, 5) for j in range(1, 4)}
    progreso.update({501: "in_progress", 502: "in_progress", 503: "in_progress"})
    return progreso


async def _actualizar(client, progreso_inicial, payload):
    supabase, progreso = _supabase(progreso_inicial)
    with patch("app.routers.onboarding.get_supabase", return_value=supabase):
        resp = await client.post("/api/onboarding/complete", json=payload)
    return resp, calcular_avance(CURSOS, progreso), progreso


@pytest.mark.anyio
async def test_aprobar_el_ciclo_terminado_sube_los_creditos(client, estado_inicial):
    """Ciclo 5 → 6 aprobando todo: 36 → 45 créditos."""
    resp, avance, _ = await _actualizar(client, estado_inicial, {
        "carrera_id": 1, "ciclo_actual": 6,
        "cursos_inscritos": [601, 602, 603], "cursos_aprobados": CICLOS_1_A_5,
    })

    assert resp.status_code == 200, resp.text
    assert avance.creditos_aprobados == 45
    assert avance.creditos_en_curso == 9


@pytest.mark.anyio
async def test_un_curso_jalado_no_suma_creditos(client, estado_inicial):
    """Desmarcar 501 (jalado) deja los créditos en 42, no en 45."""
    resp, avance, progreso = await _actualizar(client, estado_inicial, {
        "carrera_id": 1, "ciclo_actual": 6,
        "cursos_inscritos": [602, 603],
        "cursos_aprobados": [c for c in CICLOS_1_A_5 if c != 501],
    })

    assert resp.status_code == 200, resp.text
    assert avance.creditos_aprobados == 42
    assert progreso[501] != "completed"


@pytest.mark.anyio
async def test_un_curso_ya_aprobado_que_se_desmarca_baja_los_creditos(client, estado_inicial):
    """El caso que faltaba: 501 constaba 'completed' y ahora se desaprueba.

    Antes esta declaración se ignoraba y el avance quedaba inflado para siempre.
    """
    inicial = {**estado_inicial, 501: "completed"}

    resp, avance, progreso = await _actualizar(client, inicial, {
        "carrera_id": 1, "ciclo_actual": 6,
        "cursos_inscritos": [602],
        "cursos_aprobados": [c for c in CICLOS_1_A_5 if c != 501],
    })

    assert resp.status_code == 200, resp.text
    assert progreso[501] == "available", "501 debía dejar de contar como aprobado"
    assert avance.creditos_aprobados == 42


@pytest.mark.anyio
async def test_arrastre_se_puede_rellevar_con_los_cursos_del_ciclo(client, estado_inicial):
    """501 jalado y re-inscrito junto al ciclo 6: no suma créditos, sí cuenta en curso."""
    resp, avance, progreso = await _actualizar(client, estado_inicial, {
        "carrera_id": 1, "ciclo_actual": 6,
        "cursos_inscritos": [501, 602, 603],
        "cursos_aprobados": [c for c in CICLOS_1_A_5 if c != 501],
    })

    assert resp.status_code == 200, resp.text
    assert avance.creditos_aprobados == 42
    assert progreso[501] == "in_progress"


@pytest.mark.anyio
async def test_arrastre_bloquea_el_curso_que_lo_requiere(client, estado_inicial):
    """601 requiere 501: con 501 jalado, inscribirse en 601 se rechaza."""
    resp, _, _ = await _actualizar(client, estado_inicial, {
        "carrera_id": 1, "ciclo_actual": 6,
        "cursos_inscritos": [601],
        "cursos_aprobados": [c for c in CICLOS_1_A_5 if c != 501],
    })

    assert resp.status_code == 400, resp.text
    assert resp.json()["errors"][0]["field"] == "cursos_inscritos"


@pytest.mark.anyio
async def test_sin_declarar_historial_no_se_toca_lo_aprobado(client, estado_inicial):
    """Omitir `cursos_aprobados` no puede borrar el avance del estudiante."""
    inicial = {**estado_inicial, 501: "completed"}

    resp, avance, progreso = await _actualizar(client, inicial, {
        "carrera_id": 1, "ciclo_actual": 6, "cursos_inscritos": [602],
    })

    assert resp.status_code == 200, resp.text
    assert progreso[501] == "completed"
    assert avance.creditos_aprobados == 39


@pytest.mark.anyio
async def test_no_se_degradan_cursos_del_ciclo_declarado_ni_superiores(client, estado_inicial):
    """La declaración solo habla de ciclos anteriores; un adelanto no se toca."""
    # 701 es un adelanto ya aprobado, muy por encima del ciclo declarado.
    inicial = {**estado_inicial, 701: "completed"}

    resp, _, progreso = await _actualizar(client, inicial, {
        "carrera_id": 1, "ciclo_actual": 6,
        "cursos_inscritos": [602], "cursos_aprobados": CICLOS_1_A_5,
    })

    assert resp.status_code == 200, resp.text
    assert progreso[701] == "completed"


# ═══════════════════════════════════════════════════════════════════════════
# La matrícula del ciclo también es una declaración: lo que ya no llevas
# tiene que dejar de aparecer como "En curso" en el dashboard.
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.anyio
async def test_curso_que_se_deja_de_llevar_sale_de_en_curso(client):
    """Jalo 501, eso bloquea 601, y lo cambio por 501 en mi matrícula.

    601 tiene que dejar de figurar 'in_progress': si no, el dashboard sigue
    mostrándolo como curso activo del ciclo aunque ya no lo lleve.
    """
    # Ciclos 1-4 aprobados, ciclo 5 aprobado, y el ciclo 6 entero en curso.
    inicial = {c * 100 + j: "completed" for c in range(1, 6) for j in range(1, 4)}
    inicial.update({601: "in_progress", 602: "in_progress", 603: "in_progress"})

    resp, _, progreso = await _actualizar(client, inicial, {
        "carrera_id": 1, "ciclo_actual": 6,
        # 601 requiere 501; al declarar 501 jalado, 601 queda fuera y en su
        # lugar se re-lleva 501 como arrastre.
        "cursos_inscritos": [501, 602, 603],
        "cursos_aprobados": [c for c in CICLOS_1_A_5 if c != 501],
    })

    assert resp.status_code == 200, resp.text
    assert progreso[601] != "in_progress", "601 debía dejar de ser un curso activo"
    assert progreso[501] == "in_progress", "501 debía quedar como curso que se está llevando"
    assert progreso[602] == "in_progress"
