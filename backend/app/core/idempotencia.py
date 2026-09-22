"""Idempotencia de escrituras por cabecera `Idempotency-Key`.

Un doble clic o un reintento automático del navegador no debe crear dos filas
(publicación, ticket de feedback, curso completado). El cliente envía la cabecera
`Idempotency-Key: <uuid>` en el POST; el servidor guarda la respuesta de la
primera ejecución durante `TTL_SEGUNDOS` y la devuelve tal cual si la misma
(usuario, clave) se repite.

Almacenamiento en memoria del proceso (consistente con el rate limiter):
- Mientras una petición está en curso, las repeticiones reciben 409
  ("ya se está procesando") en lugar de duplicar la escritura.
- Con varios workers los duplicados pueden aterrizar en procesos distintos;
  para endurecerlo se migraría este dict a Redis sin cambiar la API.

Las respuestas almacenadas deben ser JSON-serializables.
"""

import asyncio
import logging
import time
from typing import Any, Optional, Tuple

logger = logging.getLogger(__name__)

TTL_SEGUNDOS = 600  # 10 minutos: cubre reintentos y dobles clics razonables

# (user_id, clave) -> (timestamp, respuesta | _EN_CURSO)
_EN_CURSO = object()
_almacen: dict[Tuple[str, str], Tuple[float, Any]] = {}
_lock = asyncio.Lock()


def _purgar() -> None:
    """Elimina entradas vencidas. Llamado bajo `_lock`."""
    ahora = time.monotonic()
    vencidas = [k for k, (ts, _) in _almacen.items() if ahora - ts > TTL_SEGUNDOS]
    for k in vencidas:
        del _almacen[k]


async def verificar_idempotencia(user_id: str, clave: Optional[str]) -> Optional[Any]:
    """Reserva la clave o devuelve el resultado previo.

    Retorna:
    - None: no hay clave o es nueva → el llamador debe ejecutar la operación y
      luego registrar el resultado con `registrar_resultado` (o liberar con
      `liberar_clave` si falla).
    - `respuesta` almacenada: repetición de una operación completada → el
      llamador debe devolverla sin re-ejecutar la escritura.

    Si otra petición con la misma clave está en curso, lanza HTTPException 409.
    """
    if not clave:
        return None
    clave = clave.strip()
    if not clave or len(clave) > 128:
        return None

    from fastapi import HTTPException

    async with _lock:
        _purgar()
        entrada = _almacen.get((user_id, clave))
        if entrada is not None:
            _, valor = entrada
            if valor is _EN_CURSO:
                raise HTTPException(
                    status_code=409,
                    detail="Esta operación ya se está procesando. Espera unos segundos.",
                )
            logger.info("Idempotency-Key %s ya procesada para %s: se devuelve la respuesta guardada.", clave, user_id)
            return valor
        _almacen[(user_id, clave)] = (time.monotonic(), _EN_CURSO)
        return None


async def registrar_resultado(user_id: str, clave: Optional[str], respuesta: Any) -> None:
    """Guarda la respuesta de la primera ejecución (JSON-serializable)."""
    if not clave:
        return
    try:
        import json
        json.dumps(respuesta, default=str)
    except (TypeError, ValueError):
        logger.warning("Respuesta no serializable para Idempotency-Key %s; se descarta.", clave)
        await liberar_clave(user_id, clave)
        return
    async with _lock:
        _almacen[(user_id, clave)] = (time.monotonic(), respuesta)


async def liberar_clave(user_id: str, clave: Optional[str]) -> None:
    """Libera la reserva cuando la operación falló (permite reintentar)."""
    if not clave:
        return
    async with _lock:
        entrada = _almacen.get((user_id, clave))
        if entrada is not None and entrada[1] is _EN_CURSO:
            del _almacen[(user_id, clave)]
