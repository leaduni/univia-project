"""Utilidades de autenticación transversales (Fase 1).

La autenticación se delega en Supabase Auth, que almacena las credenciales
cifradas con bcrypt (RNF-04). Este módulo solo valida el token de sesión que
llega en cada petición; las reglas de complejidad de contraseña viven en
core/validators.py.

Nota de seguridad: nunca se registran tokens ni credenciales en los logs.
"""

import asyncio
import logging
from typing import Optional

from fastapi import Header, HTTPException
from app.core.database import get_supabase, _es_error_conexion

logger = logging.getLogger(__name__)

ESQUEMA_BEARER = "bearer"

# Reintentos ante un fallo de TRANSPORTE (conexión caída/idle-timeout de
# Supabase, o un corte de red de un par de segundos), no ante un token
# rechazado. Ver _es_error_conexion en database.py: el mismo patrón que ya
# protege las llamadas a Postgrest, aplicado aquí al chequeo de sesión para
# que un `Server disconnected` puntual no fuerce un logout de un usuario con
# token perfectamente válido. Con pausa entre intentos (no inmediata): un
# corte de red real tarda más que una conexión HTTP/2 muerta en recuperarse.
MAX_REINTENTOS_AUTH = 2
ESPERA_ENTRE_REINTENTOS_S = 0.5


def extraer_token(authorization: Optional[str]) -> str:
    """Extrae el token del header Authorization exigiendo el esquema Bearer.

    Raises:
        HTTPException 401: si el header falta o no usa el esquema esperado.
    """
    if not authorization or not authorization.strip():
        raise HTTPException(status_code=401, detail="Token no proporcionado")

    partes = authorization.strip().split(maxsplit=1)
    if len(partes) != 2 or partes[0].lower() != ESQUEMA_BEARER:
        raise HTTPException(
            status_code=401,
            detail="Formato de autorización inválido. Se espera 'Bearer <token>'.",
        )

    token = partes[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token no proporcionado")

    return token


async def get_current_user(authorization: Optional[str] = Header(None)):
    """Dependencia de FastAPI que resuelve el usuario autenticado.

    Returns:
        Tupla (user, token) para que el router pueda crear un cliente Supabase
        con la sesión del estudiante y respetar las políticas RLS.
    """
    token = extraer_token(authorization)

    user_response = None
    for intento in range(MAX_REINTENTOS_AUTH + 1):
        try:
            user_response = await asyncio.to_thread(
                get_supabase().auth.get_user, token
            )
            break
        except Exception as e:
            if _es_error_conexion(e):
                if intento < MAX_REINTENTOS_AUTH:
                    logger.warning(
                        "Conexión con Supabase Auth caída (%s: %s); reintentando.",
                        type(e).__name__, e,
                    )
                    await asyncio.sleep(ESPERA_ENTRE_REINTENTOS_S)
                    continue
                # Se agotaron los reintentos y sigue siendo un fallo de RED, no
                # un rechazo del token: 503 y no 401, para que el frontend no
                # lo trate como sesión vencida y fuerce un logout de un usuario
                # cuyo token nunca dejó de ser válido.
                logger.error(
                    "Supabase Auth inalcanzable tras %d reintentos (%s: %s).",
                    MAX_REINTENTOS_AUTH, type(e).__name__, e,
                )
                raise HTTPException(
                    status_code=503,
                    detail="No se pudo verificar la sesión ahora mismo. Intenta de nuevo.",
                )
            # El detalle del proveedor no se expone al cliente: puede revelar
            # información interna de la sesión.
            logger.warning(f"Token rechazado por Supabase Auth: {e}")
            raise HTTPException(status_code=401, detail="Sesión inválida o expirada.")

    user = getattr(user_response, "user", None)
    if not user:
        logger.warning("Supabase Auth devolvió una respuesta sin usuario.")
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada.")

    logger.debug(f"Usuario autenticado: {user.id}")
    return user, token
