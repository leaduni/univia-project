"""Módulo de donaciones (Fase 12).

El aporte se hace por QR de Yape personal, que no expone API ni webhooks. Para
poder emparejar cada abono con quien lo hizo, a cada donación se le reserva un
CENTAVO ÚNICO: el estudiante elige S/10 y se le pide yapear S/10.01. Cuando ese
monto aparece en el historial de Yape hay una sola donación activa que lo
reclama, así que la asociación es inequívoca sin pedir capturas.

Estados de una donación:
    iniciada   → tiene el centavo reservado, espera que el estudiante yapee.
                 Vence a los 30 min y libera el monto.
    reportada  → el estudiante pulsó "Ya yapeé". Cuenta para el ranking.
    confirmada → alguien verificó el abono real contra el historial de Yape.
    expirada   → nunca se reportó.

IMPORTANTE — sobre qué se considera recaudado:
    `ESTADOS_QUE_SUMAN` decide qué entra en el total público y en el ranking.
    Hoy incluye 'reportada', es decir, montos AUTODECLARADOS que nadie verificó.
    Cuando exista el flujo de confirmación, basta con dejar solo 'confirmada'
    para que el total pase a reflejar dinero verificado. Es el único punto que
    hay que tocar.
"""

import asyncio
import logging
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator

from app.core.auth_utils import get_current_user
from app.core.database import get_admin_client, get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/donaciones", tags=["donaciones"])

# Qué estados cuentan como dinero recaudado. Ver nota del docstring.
ESTADOS_QUE_SUMAN = ("reportada", "confirmada")

MINUTOS_RESERVA = 30
MONTO_MINIMO = Decimal("0.10")
MONTO_MAXIMO = Decimal("5000")
MAX_CARACTERES_NOMBRE = 60
MAX_CARACTERES_MENSAJE = 180
TIPOS_DONANTE = {"estudiante", "egresado"}

# Facultades de la UNI. Se guarda la sigla; el nombre largo vive en el frontend
# para no duplicar el catálogo en dos sitios que se desincronizan.
FACULTADES = {
    "FC", "FIA", "FIC", "FIEE", "FIGMM", "FIIS", "FIM", "FIP", "FAUA", "FIQT", "FIEECS",
}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class NuevaIntencion(BaseModel):
    """Lo que el estudiante eligió antes de irse a Yape."""

    monto: Decimal
    tipo_donante: str = "estudiante"
    facultad: Optional[str] = None
    nombre_mostrar: Optional[str] = None
    es_anonimo: bool = False
    mensaje_muro: Optional[str] = None

    @field_validator("monto")
    @classmethod
    def validar_monto(cls, v: Decimal) -> Decimal:
        if v is None:
            raise ValueError("Elige un monto para tu aporte.")
        # Se trabaja a dos decimales: el centavo identificador ocupa el último.
        valor = Decimal(v).quantize(Decimal("0.01"))
        if valor < MONTO_MINIMO:
            raise ValueError(f"El monto mínimo es S/{MONTO_MINIMO}.")
        if valor > MONTO_MAXIMO:
            raise ValueError(f"El monto máximo es S/{MONTO_MAXIMO}.")
        return valor

    @field_validator("tipo_donante")
    @classmethod
    def validar_tipo(cls, v: str) -> str:
        valor = (v or "estudiante").strip().lower()
        if valor not in TIPOS_DONANTE:
            raise ValueError("Tipo de donante no válido.")
        return valor

    @field_validator("facultad")
    @classmethod
    def validar_facultad(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        valor = v.strip().upper()
        if valor not in FACULTADES:
            raise ValueError("Facultad no válida.")
        return valor

    @field_validator("nombre_mostrar")
    @classmethod
    def validar_nombre(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        texto = " ".join(v.split())
        return texto[:MAX_CARACTERES_NOMBRE] or None

    @field_validator("mensaje_muro")
    @classmethod
    def validar_mensaje(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        texto = " ".join(v.split())
        return texto[:MAX_CARACTERES_MENSAJE] or None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run(fn):
    """Ejecuta una llamada bloqueante de Supabase en un hilo aparte.

    Espejo de feedback.py::_run: el cliente supabase-py es síncrono.
    """
    return asyncio.to_thread(fn)


def _soles(valor) -> float:
    """Normaliza a float con 2 decimales para la respuesta JSON."""
    try:
        return float(Decimal(str(valor or 0)).quantize(Decimal("0.01")))
    except Exception:  # noqa: BLE001
        return 0.0


def _nombre_publico(fila: dict) -> str:
    """Nombre que puede mostrarse sin romper el anonimato solicitado."""
    if fila.get("es_anonimo"):
        return "Anónimo"
    return (fila.get("nombre_mostrar") or "").strip() or "Anónimo"


async def _expirar_reservas_vencidas(admin) -> None:
    """Libera los centavos de las donaciones que nunca volvieron del Yape.

    Se ejecuta antes de reservar un monto nuevo: el índice único parcial
    (`estado = 'iniciada'`) seguiría bloqueando un monto vencido si nadie lo
    barre, y ese monto quedaría inutilizable para siempre.
    """
    ahora = datetime.now(timezone.utc).isoformat()
    try:
        await _run(
            lambda: admin.table("donaciones")
            .update({"estado": "expirada"})
            .eq("estado", "iniciada")
            .lt("expira_en", ahora)
            .execute()
        )
    except Exception as e:  # noqa: BLE001
        # No es fatal: si el barrido falla, la reserva simplemente encontrará
        # menos centavos libres.
        logger.warning("[DONACIONES] No se pudieron expirar reservas vencidas: %s", e)


async def _centavos_ocupados(admin, monto_base: Decimal) -> set:
    """Centavos ya reservados para este monto base por donaciones activas."""
    inferior = float(monto_base)
    superior = float(monto_base + Decimal("1"))
    resp = await _run(
        lambda: admin.table("donaciones")
        .select("centavo")
        .eq("estado", "iniciada")
        .gte("monto_exacto", inferior)
        .lt("monto_exacto", superior)
        .execute()
    )
    return {fila["centavo"] for fila in (getattr(resp, "data", None) or [])}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/intencion", status_code=201)
async def crear_intencion(
    data: NuevaIntencion,
    user_data=Depends(get_current_user),
):
    """Reserva un centavo único y devuelve el monto exacto a yapear.

    La escritura va con la llave de servicio porque la asignación del centavo
    necesita leer las reservas de OTROS usuarios (la política RLS solo deja
    ver las propias). `perfil_id` se fija desde el token, nunca desde el
    cuerpo de la petición.
    """
    user, _token = user_data
    admin = get_admin_client()

    await _expirar_reservas_vencidas(admin)

    ocupados = await _centavos_ocupados(admin, data.monto)
    libres = [c for c in range(1, 100) if c not in ocupados]
    if not libres:
        raise HTTPException(
            status_code=409,
            detail="Hay demasiadas donaciones de este monto en curso. Prueba con otro monto o espera unos minutos.",
        )

    # Al azar y no el primero libre: con montos populares (S/10) el .01 se
    # reasignaría una y otra vez, y dos personas que yapean casi a la vez
    # tendrían más chance de confundirse al leer el historial.
    centavo = random.choice(libres)
    monto_exacto = (data.monto + Decimal(centavo) / Decimal(100)).quantize(Decimal("0.01"))
    expira_en = datetime.now(timezone.utc) + timedelta(minutes=MINUTOS_RESERVA)

    fila = {
        "perfil_id": str(user.id),
        "monto_base": float(data.monto),
        "centavo": centavo,
        "monto_exacto": float(monto_exacto),
        "tipo_donante": data.tipo_donante,
        "facultad": data.facultad,
        "nombre_mostrar": None if data.es_anonimo else data.nombre_mostrar,
        "es_anonimo": data.es_anonimo,
        "mensaje_muro": data.mensaje_muro,
        "estado": "iniciada",
        "expira_en": expira_en.isoformat(),
    }

    try:
        resp = await _run(lambda: admin.table("donaciones").insert(fila).execute())
    except Exception as e:  # noqa: BLE001
        logger.error("[DONACIONES] Error creando intención de %s: %s", user.id, e)
        raise HTTPException(status_code=500, detail="No se pudo iniciar tu donación.")

    creada = (getattr(resp, "data", None) or [None])[0]
    if not creada:
        raise HTTPException(status_code=500, detail="No se pudo iniciar tu donación.")

    return {
        "id": creada["id"],
        "monto_base": _soles(data.monto),
        "monto_exacto": _soles(monto_exacto),
        "centavo": centavo,
        "expira_en": expira_en.isoformat(),
        "minutos_reserva": MINUTOS_RESERVA,
    }


@router.post("/{donacion_id}/reportar")
async def reportar_envio(
    donacion_id: int,
    user_data=Depends(get_current_user),
):
    """Marca "ya yapeé": la donación pasa a contar y libera su centavo.

    No prueba que el dinero llegara — eso solo puede verificarlo una persona
    contra el historial de Yape. Por eso el estado es 'reportada' y no
    'confirmada'.
    """
    user, token = user_data
    supabase = get_supabase(token)

    try:
        resp = await _run(
            lambda: supabase.table("donaciones")
            .update({
                "estado": "reportada",
                "reportado_en": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", donacion_id)
            .eq("estado", "iniciada")
            .execute()
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[DONACIONES] Error reportando donación %s: %s", donacion_id, e)
        raise HTTPException(status_code=500, detail="No se pudo registrar tu aporte.")

    actualizada = getattr(resp, "data", None) or []
    if not actualizada:
        # La política RLS solo deja tocar las propias, así que llegar aquí
        # significa que no existe, no es suya, o ya venció.
        raise HTTPException(
            status_code=404,
            detail="Esa donación ya no está activa. Vuelve a generar el monto.",
        )

    return actualizada[0]


@router.get("/resumen")
async def obtener_resumen():
    """Meta, recaudado, gastado y caja neta para el panel de transparencia.

    Público: no exige sesión. No devuelve ningún dato personal, solo importes
    agregados y conteos.
    """
    admin = get_admin_client()

    try:
        donaciones_resp, gastos_resp, config_resp = await asyncio.gather(
            _run(
                lambda: admin.table("donaciones")
                .select("monto_base, perfil_id")
                .in_("estado", list(ESTADOS_QUE_SUMAN))
                .execute()
            ),
            _run(lambda: admin.table("donaciones_gastos").select("monto").execute()),
            _run(lambda: admin.table("donaciones_config").select("clave, valor").execute()),
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[DONACIONES] Error calculando el resumen: %s", e)
        raise HTTPException(status_code=500, detail="No se pudo cargar el resumen de donaciones.")

    filas = getattr(donaciones_resp, "data", None) or []
    gastos = getattr(gastos_resp, "data", None) or []
    config = {
        item["clave"]: item["valor"]
        for item in (getattr(config_resp, "data", None) or [])
    }

    recaudado = sum(Decimal(str(f.get("monto_base") or 0)) for f in filas)
    gastado = sum(Decimal(str(g.get("monto") or 0)) for g in gastos)

    try:
        meta = Decimal(config.get("meta_soles", "1000"))
    except Exception:  # noqa: BLE001
        meta = Decimal("1000")

    porcentaje = float(recaudado / meta * 100) if meta > 0 else 0.0

    return {
        "meta": _soles(meta),
        "recaudado": _soles(recaudado),
        "gastado": _soles(gastado),
        "caja_neto": _soles(recaudado - gastado),
        "porcentaje": round(min(porcentaje, 100.0), 1),
        "total_donaciones": len(filas),
        "total_donantes": len({f.get("perfil_id") for f in filas}),
        "destino_aporte": config.get("destino_aporte", ""),
        "actualizado_en": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/top")
async def top_donantes(limite: int = Query(10, ge=1, le=50)):
    """Cuadro de honor: mayores aportes acumulados por persona.

    Público. Se agrupa por perfil pero el perfil_id nunca sale en la respuesta,
    y quien pidió anonimato aparece como "Anónimo".
    """
    admin = get_admin_client()

    try:
        resp = await _run(
            lambda: admin.table("donaciones")
            .select("perfil_id, monto_base, nombre_mostrar, es_anonimo, facultad, creado_en")
            .in_("estado", list(ESTADOS_QUE_SUMAN))
            .execute()
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[DONACIONES] Error cargando el top: %s", e)
        raise HTTPException(status_code=500, detail="No se pudo cargar el cuadro de honor.")

    acumulado: dict = {}
    for fila in (getattr(resp, "data", None) or []):
        # Cada aporte anónimo se muestra suelto: agrupar por perfil delataría
        # que varias donaciones "Anónimo" son de la misma persona.
        clave = f"anon:{fila.get('creado_en')}" if fila.get("es_anonimo") else f"perfil:{fila.get('perfil_id')}"
        entrada = acumulado.setdefault(clave, {
            "nombre": _nombre_publico(fila),
            "facultad": fila.get("facultad"),
            "total": Decimal("0"),
            "aportes": 0,
        })
        entrada["total"] += Decimal(str(fila.get("monto_base") or 0))
        entrada["aportes"] += 1

    ordenado = sorted(acumulado.values(), key=lambda e: e["total"], reverse=True)

    return [
        {
            "puesto": indice + 1,
            "nombre": entrada["nombre"],
            "facultad": entrada["facultad"],
            "total": _soles(entrada["total"]),
            "aportes": entrada["aportes"],
        }
        for indice, entrada in enumerate(ordenado[:limite])
    ]


@router.get("/muro")
async def muro_mensajes(limite: int = Query(20, ge=1, le=100)):
    """Mensajes públicos que dejaron los donantes, más reciente primero."""
    admin = get_admin_client()

    try:
        resp = await _run(
            lambda: admin.table("donaciones")
            .select("nombre_mostrar, es_anonimo, facultad, mensaje_muro, monto_base, creado_en")
            .in_("estado", list(ESTADOS_QUE_SUMAN))
            .not_.is_("mensaje_muro", "null")
            .order("creado_en", desc=True)
            .limit(limite)
            .execute()
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[DONACIONES] Error cargando el muro: %s", e)
        raise HTTPException(status_code=500, detail="No se pudo cargar el muro.")

    return [
        {
            "nombre": _nombre_publico(fila),
            "facultad": fila.get("facultad"),
            "mensaje": fila.get("mensaje_muro"),
            "monto": _soles(fila.get("monto_base")),
            "creado_en": fila.get("creado_en"),
        }
        for fila in (getattr(resp, "data", None) or [])
        if (fila.get("mensaje_muro") or "").strip()
    ]
