"""Utilidades de autenticación transversales (Fase 1).

La autenticación se delega en Supabase Auth, que almacena las credenciales
cifradas con bcrypt (RNF-04). Este módulo solo valida el token de sesión que
llega en cada petición; las reglas de complejidad de contraseña viven en
core/validators.py.

Nota de seguridad: nunca se registran tokens ni credenciales en los logs.
"""

import asyncio
import logging
import os
from typing import Optional

import jwt  # PyJWT
from fastapi import Header, HTTPException
from app.core.database import get_supabase, _es_error_conexion

logger = logging.getLogger(__name__)

# --- Verificación LOCAL del JWT de sesión (M1) -------------------------
# Antes, cada petición protegida hacía un RTT a GoTrue (auth.get_user) solo
# para validar la firma. El token de Supabase es un JWT HS256 autofirmado:
# con SUPABASE_JWT_SECRET validamos firma + expiración + audiencia EN
# PROCESO (sin red) y reconstruimos el usuario desde el payload (`sub`,
# `email`, `user_metadata`). Si la variable falta, se cae al camino de red
# anterior (compatibilidad dev), con un aviso una sola vez.
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "").strip()
_JWT_ALGORITMOS = ["HS256"]
# Audiencia que Supabase Auth emite para las sesiones de usuario final.
_JWT_AUDIENCIA = "authenticated"
_aviso_jwt_local_emitido = False


class UsuarioToken:
    """Réplica mínima del `User` de GoTrue construida desde el payload JWT.

    Los routers solo consumen `.id`, `.email`, `.user_metadata` y
    `.app_metadata`; se reproducen tal cual para no tocar ningún call site.
    """

    def __init__(self, payload: dict):
        self.id = payload.get("sub", "")
        self.email = payload.get("email", "")
        self.role = payload.get("role", "")
        self.user_metadata = payload.get("user_metadata") or {}
        self.app_metadata = payload.get("app_metadata") or {}


def _usuario_desde_jwt(token: str) -> UsuarioToken:
    """Intenta validar el JWT localmente; devuelve el usuario o None.

    NUNCA levanta 401: la validación local es solo un camino rápido para
    CONCEDER acceso. Cualquier fallo (firma desconocida, algoritmo no
    soportado —p. ej. proyectos con Signing Keys asimétricas ES256—, claim
    ausente, etc.) devuelve None y el llamador cae a la verificación remota
    contra Supabase Auth, que es quien decide el 401. Así un proyecto con
    algoritmo distinto no sufre regresión alguna.
    """
    global _aviso_jwt_local_emitido
    if not SUPABASE_JWT_SECRET:
        if not _aviso_jwt_local_emitido:
            _aviso_jwt_local_emitido = True
            logger.warning(
                "SUPABASE_JWT_SECRET no configurado: verificando tokens por red "
                "(más latencia). Configúralo para validación local."
            )
        return None
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=_JWT_ALGORITMOS,
            audience=_JWT_AUDIENCIA,
            options={"require": ["sub", "exp"]},
        )
    except jwt.InvalidTokenError as e:
        # Sin 401 directo: se degrada a la verificación por red. Se avisa una
        # sola vez por proceso para no ensuciar los logs a cada petición (p.
        # ej. proyectos con Signing Keys ES256 degradan siempre; tokens
        # expirados ocurren a diario y la red decide su 401).
        if not _aviso_jwt_local_emitido:
            _aviso_jwt_local_emitido = True
            logger.warning(
                "Validación local de JWT no aplicable (%s); se verifica por red.",
                type(e).__name__,
            )
        else:
            logger.debug(
                "Validación local de JWT no aplicable (%s); se verifica por red.",
                type(e).__name__,
            )
        return None
    if not payload.get("sub"):
        return None
    return UsuarioToken(payload)

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

    # Camino rápido: firma + exp + aud en proceso (~µs, sin RTT a GoTrue).
    # Si el token no es HS256 (proyectos con Signing Keys asimétricas), la
    # validación local devuelve None y se sigue con la verificación remota
    # de siempre: la decisión de rechazar (401) SOLO la toma Supabase Auth.
    user = _usuario_desde_jwt(token)
    if user is not None:
        logger.debug(f"Usuario autenticado (JWT local): {user.id}")
        return user, token

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
