"""Utilidades de autenticación transversales (Fase 1).

La autenticación se delega en Supabase Auth, que almacena las credenciales
cifradas con bcrypt (RNF-04). Este módulo solo valida el token de sesión que
llega en cada petición; las reglas de complejidad de contraseña viven en
core/validators.py.

Nota de seguridad: nunca se registran tokens ni credenciales en los logs.
"""

import logging
from typing import Optional

from fastapi import Header, HTTPException
from app.core.database import get_supabase

logger = logging.getLogger(__name__)

ESQUEMA_BEARER = "bearer"


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

    try:
        user_response = get_supabase().auth.get_user(token)
    except Exception as e:
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
