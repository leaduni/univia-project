"""ThreadPoolExecutor dedicado a las llamadas síncronas a LLMs.

El threadpool por defecto de asyncio (min(32, cpu+4) hilos) lo comparten TODO:
auth (bcrypt/JWT vía to_thread), PostgREST, Gemini/Groq/OpenAI… Una ráfaga de
generación con reintentos + backoff puede ocuparlo entero y retardar hasta un
login. Este executor aísla las llamadas a modelos en un pool propio, acotado
por LLM_EXECUTOR_WORKERS (default 8).

Uso: `await correr_en_hilo_llm(fn, arg1, kw=...)`.
"""

import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, TypeVar

T = TypeVar("T")

executor_llm = ThreadPoolExecutor(
    max_workers=max(2, int(os.getenv("LLM_EXECUTOR_WORKERS", "8"))),
    thread_name_prefix="llm",
)


async def correr_en_hilo_llm(fn: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """Ejecuta `fn` (síncrona, bloqueante) en el executor dedicado de LLM."""
    loop = asyncio.get_running_loop()
    if kwargs:
        def _envolver() -> T:
            return fn(*args, **kwargs)
        return await loop.run_in_executor(executor_llm, _envolver)
    return await loop.run_in_executor(executor_llm, fn, *args)
