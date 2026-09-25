"""Rate limiting compartido (SlowAPI) del backend de UniVia.

El módulo de feedback aplica `@limiter.limit(...)` a sus endpoints de escritura
y usa este `Limiter` único para no duplicar instancias entre routers.

Identificación del cliente (`key_func`): si la petición trae un JWT Bearer se
limita por el `sub` (user id) del token —sin verificar la firma, porque la
verificación real ya la hace `get_current_user` por dependencia; aquí solo se
usa como clave de conteo—. Sin token (login, register) se cae a la IP. Así un
usuario no puede esquivar su límite cambiando de red, y varias personas tras la
misma NAT no comparten cuota de los endpoints autenticados.

Adapter in-memory: alineado con `--workers 1` en backend/Dockerfile
(soft-launch). Si se escala a varios workers/procesos, migrar al
adaptador de Redis sin cambiar el decorador.
"""

import base64
import json

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def _clave_usuario_o_ip(request: Request) -> str:
    """Clave de rate limit: `usuario:<uuid>` si hay JWT, si no `ip:<addr>`."""
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth[7:].strip()
        try:
            payload_b64 = token.split(".")[1]
            # Base64url sin padding: se completa antes de decodificar.
            payload_b64 += "=" * (-len(payload_b64) % 4)
            payload = json.loads(base64.urlsafe_b64decode(payload_b64))
            sub = payload.get("sub")
            if sub:
                return f"usuario:{sub}"
        except Exception:
            # Token malformado: el endpoint ya rechazará el acceso; para el
            # conteo se usa la IP.
            pass
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=_clave_usuario_o_ip)
