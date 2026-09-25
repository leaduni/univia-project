"""Panel de administración de donaciones: verificación manual asistida.

Como Yape personal no expone API ni webhooks, el único que puede afirmar que
un abono entró es una persona mirando el historial de la app. Estos endpoints
son la herramienta de esa persona:

    GET  /admin/donaciones/pendientes   donaciones 'reportada' por verificar.
    POST /admin/donaciones/{id}/confirmar   el abono SÍ apareció en el Yape.
    POST /admin/donaciones/{id}/rechazar    no apareció (o el monto no cuadra).

Seguridad:
    La autenticación la resuelve `get_current_user` (token de Supabase Auth).
    La AUTORIZACIÓN es por lista blanca de correos: el email del token debe
    estar en ADMIN_EMAILS (o, como respaldo operativo, DEV_NOTIFICATION_EMAILS)
    del .env. Cualquier otro usuario recibe 403 Forbidden. Toda la lectura y
    escritura va con la llave de servicio SOLO después de pasar esa barrera.

    El rechazo marca la donación como 'rechazada' (estado agregado al CHECK en
    migracion_fase13_admin_donaciones.sql): nunca suma a los totales, pero
    queda auditada en la tabla en lugar de borrarse.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth_utils import get_current_user
from app.core.database import get_admin_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/donaciones", tags=["admin-donaciones"])

# Campos que el verificador necesita para emparejar con el historial de Yape.
# No se expone perfil_id: el nombre público y el monto exacto bastan.
CAMPOS_PENDIENTE = (
    "id, monto_base, monto_exacto, centavo, tipo_donante, facultad, "
    "nombre_mostrar, es_anonimo, mensaje_muro, estado, creado_en, reportado_en, expira_en"
)


def _emails_admin() -> set:
    """Lista blanca de administradores del módulo, desde el .env.

    ADMIN_EMAILS manda; si no está, se usa DEV_NOTIFICATION_EMAILS (quienes ya
    reciben las alertas del módulo son quienes pueden verificarlas).
    """
    cruda = os.getenv("ADMIN_EMAILS") or os.getenv("DEV_NOTIFICATION_EMAILS") or ""
    return {e.strip().lower() for e in cruda.split(",") if e.strip()}


async def require_admin(user_data=Depends(get_current_user)):
    """Barrera de autorización del panel de donaciones.

    401 si no hay sesión válida (lo resuelve get_current_user); 403 si el
    usuario autenticado no está en la lista blanca de administradores.
    """
    user, _token = user_data
    correo = (getattr(user, "email", None) or "").strip().lower()
    autorizados = _emails_admin()

    if not autorizados:
        # Fail-closed: sin lista blanca configurada NADIE entra (ni 200 vacío).
        logger.error("[ADMIN-DONACIONES] ADMIN_EMAILS/DEV_NOTIFICATION_EMAILS no configurados.")
        raise HTTPException(status_code=503, detail="El panel no está configurado.")

    if not correo or correo not in autorizados:
        logger.warning("[ADMIN-DONACIONES] Acceso denegado a %s.", correo or user.id)
        raise HTTPException(status_code=403, detail="No tienes acceso a este panel.")

    return user


@router.get("/es_admin")
async def soy_admin(user_data=Depends(get_current_user)):
    """¿El usuario autenticado puede ver el panel de donaciones?

    No es una barrera (las rutas de datos y acción sí la tienen): solo le dice
    al frontend si debe MOSTRAR el enlace al panel en la navegación.
    """
    user, _token = user_data
    correo = (getattr(user, "email", None) or "").strip().lower()
    return {"es_admin": bool(correo) and correo in _emails_admin()}


def _run(fn):
    """Ejecuta una llamada bloqueante de Supabase en un hilo aparte."""
    return asyncio.to_thread(fn)


def _publico(fila: dict) -> dict:
    """Fila lista para el panel: nombre respetando el anonimato del muro."""
    nombre = "Anónimo" if fila.get("es_anonimo") else (fila.get("nombre_mostrar") or "Anónimo")
    return {
        "id": fila["id"],
        "nombre": nombre,
        # El verificador puede necesitar el nombre real contra el Yape: solo
        # sale en ESTE panel (ya pasó la barrera admin), nunca en rutas públicas.
        "nombre_real": fila.get("nombre_mostrar"),
        "facultad": fila.get("facultad"),
        "tipo_donante": fila.get("tipo_donante"),
        "monto_base": float(fila.get("monto_base") or 0),
        # El monto con centavo identificador es LA pista de emparejamiento.
        "monto_exacto": float(fila.get("monto_exacto") or 0),
        "mensaje_muro": fila.get("mensaje_muro"),
        "reportado_en": fila.get("reportado_en"),
        "creado_en": fila.get("creado_en"),
    }


@router.get("/pendientes")
async def listar_pendientes(_admin=Depends(require_admin)):
    """Donaciones autodeclaradas ('reportada') esperando verificación en Yape."""
    admin = get_admin_client()
    try:
        resp = await _run(
            lambda: admin.table("donaciones")
            .select(CAMPOS_PENDIENTE)
            .eq("estado", "reportada")
            .order("reportado_en", desc=True)
            .limit(100)
            .execute()
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[ADMIN-DONACIONES] Error listando pendientes: %s", e)
        raise HTTPException(status_code=500, detail="No se pudo cargar la bandeja.")

    return [_publico(fila) for fila in (getattr(resp, "data", None) or [])]


async def _resolver(donacion_id: int, admin_user, aprobar: bool):
    """Transición reportada → confirmada | rechazada, atómica por filtro de estado.

    El `.eq("estado", "reportada")` en el UPDATE hace la operación
    compare-and-set: si dos admins actúan a la vez sobre el mismo id, solo el
    primero afecta filas; el segundo recibe 409 en lugar de pisar la decisión.
    """
    admin = get_admin_client()
    estado_nuevo = "confirmada" if aprobar else "rechazada"
    ahora = datetime.now(timezone.utc).isoformat()

    fila = {
        "estado": estado_nuevo,
        "confirmado_en": ahora if aprobar else None,
    }

    try:
        resp = await _run(
            lambda: admin.table("donaciones")
            .update(fila)
            .eq("id", donacion_id)
            .eq("estado", "reportada")
            .execute()
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[ADMIN-DONACIONES] Error resolviendo donación %s: %s", donacion_id, e)
        raise HTTPException(status_code=500, detail="No se pudo resolver la donación.")

    actualizada = (getattr(resp, "data", None) or [])
    if not actualizada:
        raise HTTPException(
            status_code=409,
            detail="Esa donación ya fue resuelta o ya no está pendiente.",
        )

    logger.info(
        "[ADMIN-DONACIONES] Donación %s -> %s por %s",
        donacion_id, estado_nuevo, getattr(admin_user, "email", admin_user.id),
    )
    return {"id": donacion_id, "estado": estado_nuevo}


@router.post("/{donacion_id}/confirmar")
async def confirmar_donacion(donacion_id: int, admin_user=Depends(require_admin)):
    """El abono apareció en el historial de Yape: pasa a sumar y al ranking."""
    return await _resolver(donacion_id, admin_user, aprobar=True)


@router.post("/{donacion_id}/rechazar")
async def rechazar_donacion(donacion_id: int, admin_user=Depends(require_admin)):
    """El abono no llegó (o el monto no cuadra): queda auditada, nunca suma."""
    return await _resolver(donacion_id, admin_user, aprobar=False)
