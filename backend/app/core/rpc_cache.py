"""Caché en memoria para las RPC 1-RTT de lectura pesada (malla, dashboard).

Las funciones `get_malla_datos` / `get_resumen_dashboard` construyen JSONB
enteros por cada request. Bajo tráfico repetido del mismo usuario (navegación
entre pestañas, StrictMode, recargas) el resultado no cambia por segundos, así
que se cachea por `(función, usuario)` con un TTL corto.

Invalidación: cualquier mutación de progreso (completar curso/step, onboarding)
llama a `invalidar_usuario(user_id)`. Adicionalmente el TTL acota el error
máximo observable aunque alguna ruta de mutación se olvide de invalidar.

En memoria del proceso (consistente con el rate limiter y la idempotencia):
con varios workers cada proceso lleva su copia; para endurecerlo, migrar el
dict a Redis manteniendo esta API.
"""

import logging
import os
import time
import threading
from typing import Any, Optional

logger = logging.getLogger(__name__)

# TTL por función (segundos). Configurables por entorno.
_TTL = {
    "get_malla_datos": int(os.getenv("RPC_CACHE_TTL_MALLA", "60")),
    "get_resumen_dashboard": int(os.getenv("RPC_CACHE_TTL_DASHBOARD", "30")),
}

_cache: dict[tuple[str, str], tuple[float, Any]] = {}
_lock = threading.Lock()


def ttl_de(nombre_rpc: str) -> int:
    """TTL configurado para la RPC; 0 si no es cacheable."""
    return _TTL.get(nombre_rpc, 0)


def obtener(nombre_rpc: str, user_id: str) -> Optional[Any]:
    """Devuelve el dato cacheado y vigente, o None si no hay / expiró."""
    ttl = ttl_de(nombre_rpc)
    if ttl <= 0:
        return None
    clave = (nombre_rpc, user_id)
    with _lock:
        entrada = _cache.get(clave)
        if entrada and time.monotonic() - entrada[0] < ttl:
            return entrada[1]
        _cache.pop(clave, None)
    return None


def guardar(nombre_rpc: str, user_id: str, data: Any) -> None:
    if ttl_de(nombre_rpc) <= 0:
        return
    with _lock:
        _cache[(nombre_rpc, user_id)] = (time.monotonic(), data)


def invalidar_usuario(user_id: Optional[str]) -> None:
    """Descarta todas las RPC cacheadas de un usuario tras una mutación."""
    if not user_id:
        return
    with _lock:
        obsoletas = [k for k in _cache if k[1] == user_id]
        for k in obsoletas:
            del _cache[k]
    if obsoletas:
        logger.debug("Caché RPC invalidada para el usuario %s (%d entradas).", user_id, len(obsoletas))
