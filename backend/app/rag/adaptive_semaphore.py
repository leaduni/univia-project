"""
Semaforo adaptativo para concurrencia asincrona.

Reduce dinamicamente la concurrencia ante errores 429 de la API,
permitiendo que el pipeline se auto-regule sin intervencion manual.
"""
import asyncio
import logging
import time

logger = logging.getLogger(__name__)


class AdaptiveSemaphore:
    """
    Semaforo que reduce su concurrencia a la mitad ante rate limits.

    Uso:
        sem = AdaptiveSemaphore(initial=8)
        async with sem:
            await hacer_llamada_api()
        # Si hay 429: sem.reduce()
    """

    def __init__(
        self,
        initial: int = 8,
        min_concurrency: int = 1,
        cooldown: float = 60.0,
    ):
        self._initial = initial
        self._min = min_concurrency
        self._current = initial
        self._active = 0
        self.cooldown = cooldown
        self.last_reduce_time = 0.0
        self._sem = asyncio.Semaphore(initial)

    @property
    def current(self) -> int:
        return self._current

    @property
    def active(self) -> int:
        return self._active

    def reduce(self) -> int:
        """
        Reduce la concurrencia a la mitad (floor), respetando el minimo.

        Returns:
            Nueva concurrencia.
        """
        self.last_reduce_time = time.time()
        old = self._current
        self._current = max(self._min, self._current // 2)
        if self._current < old:
            # Recrear el semaforo subyacente con el nuevo limite
            self._sem = asyncio.Semaphore(self._current)
            logger.warning(
                f"[AdaptiveSemaphore] Concurrencia reducida: {old} -> {self._current}"
            )
        return self._current

    def maybe_recover(self) -> int:
        """Incrementa gradualmente la concurrencia tras un periodo estable."""
        if time.time() - self.last_reduce_time <= self.cooldown:
            return self._current
        if self._current >= self._initial:
            return self._current

        old = self._current
        self._current = min(self._initial, self._current + 1)
        self._sem = asyncio.Semaphore(self._current)
        self.last_reduce_time = time.time()
        logger.info(
            f"[AdaptiveSemaphore] Concurrencia recuperada: {old} -> {self._current}"
        )
        return self._current

    def reset(self) -> None:
        """Restaura la concurrencia al valor inicial."""
        self._current = self._initial
        self._sem = asyncio.Semaphore(self._current)

    async def acquire(self) -> bool:
        """Adquiere un slot del semaforo."""
        await self._sem.acquire()
        self._active += 1
        return True

    def release(self) -> None:
        """Libera un slot del semaforo."""
        self._active -= 1
        self._sem.release()

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, *args):
        self.release()
