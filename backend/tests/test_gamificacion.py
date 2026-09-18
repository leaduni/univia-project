"""Pruebas unitarias de la lógica pura de gamificación y ranking (Fase 10).

Cubren helpers sin Red: cursor de paginación keyset, validación de periodo,
fórmula de bono de racha y umbrales de nivel. La corrección SQL y el flujo
completo contra Supabase se validan en la migración.
"""

import math

import pytest
from fastapi import HTTPException

from app.routers import gamificacion as gami
from app.routers.gamificacion import (
    _bono_racha,
    _codificar_cursor,
    _decodificar_cursor,
    _validar_periodo,
)


def test_cursor_roundtrip():
    """Un cursor codificado se decodifica al par (xp, perfil_id) original."""
    perfil = "12345678-0000-4000-8000-000000000000"
    for xp in (0, 50, 100, 999999):
        cursor = _codificar_cursor(xp, perfil)
        xp2, pid2 = _decodificar_cursor(cursor)
        assert (xp2, pid2) == (xp, perfil)


def test_cursor_roundtrip_con_padding():
    """Longitudes variadas de la parte UUID requieren relleno base64."""
    cursor = _codificar_cursor(120, "a1b2c3d4-1111-2222-3333-444455556666")
    partes = cursor.rstrip("=")
    assert "=" not in partes
    assert _decodificar_cursor(partes) == (120, "a1b2c3d4-1111-2222-3333-444455556666")


def test_cursor_invalido_lanza_422():
    with pytest.raises(HTTPException) as exc:
        _decodificar_cursor("!!!no-es-base64!!!")
    assert exc.value.status_code == 422


def test_validar_periodo():
    assert _validar_periodo("global") == "global"
    assert _validar_periodo("SEMANAL") == "semanal"
    with pytest.raises(HTTPException) as exc:
        _validar_periodo("mensual")
    assert exc.value.status_code == 422


def test_bono_racha_mismo_que_sql():
    """5 + racha, tope 20 (misma fórmula de fase10_checkin)."""
    assert _bono_racha(1) == 6
    assert _bono_racha(2) == 7
    assert _bono_racha(15) == 20
    assert _bono_racha(50) == 20


def test_umbrales_nivel_coinciden_con_trigger_sql():
    """nivel = 1 + floor(sqrt(xp/100)) como en fase10_actualizar_xp."""
    def nivel_sql(xp: int) -> int:
        return max(1, int(math.floor((xp / 100.0) ** 0.5)) + 1)

    casos = {0: 1, 50: 1, 99: 1, 100: 2, 399: 2, 400: 3, 899: 3, 900: 4}
    for xp, esperado in casos.items():
        assert nivel_sql(xp) == esperado
        # Coherencia con el cálculo de progreso del router
        nivel = nivel_sql(xp)
        piso = gami.XP_BASE_NIVEL * (nivel - 1) ** 2
        techo = gami.XP_BASE_NIVEL * nivel**2
        assert piso <= xp <= techo
        assert xp - piso >= 0
        assert techo - piso >= 1