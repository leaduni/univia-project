"""Rate limiting compartido (SlowAPI) del backend de UniVia.

El módulo de feedback aplica `@limiter.limit(...)` a sus endpoints de escritura
y usa este `Limiter` único para no duplicar instancias entre routers.

Adapter in-memory: suficiente para el despliegue actual de un solo worker
uvicorn (ver backend/Dockerfile). Si se escala a varios workers/procesos,
migrar al adaptador de Redis sin cambiar el decorador.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)