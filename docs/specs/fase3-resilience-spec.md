# Spec: Fase 3 - Resiliencia, Backoff Adaptativo y Reanudacion

- **Estado:** ESPECIFICACION
- **Fecha:** 2026-08-10
- **Referencias:** Fase 2 smoke test (cuota agotada en pagina ~60 de 209)

---

## Hito 3.1 - AdaptiveSemaphore

Clase que envuelve asyncio.Semaphore con reduccion dinamica de concurrencia ante 429.

API:
- __init__(initial: int, min_concurrency: int = 1)
- async acquire() -> bool  (adquiere slot, espera si es necesario)
- release()
- reduce() -> reduce concurrencia a la mitad (floor), min min_concurrency
- reset() -> vuelve al valor inicial
- current -> int (concurrencia actual)
- active -> int (slots ocupados)

## Hito 3.2 - CLI --resume

Flag --resume en cargar_compendio:
- Escanea checkpoints existentes (pagina_NNN.md)
- Si el recurso ya existe en BD, reutiliza su recurso_id
- Solo procesa paginas pendientes
- Si todas estan completas: "Nada que procesar" y sale OK

## Hito 3.3 - Manejo limpio de cuota agotada

Si todas las paginas pendientes fallan por cuota:
- Mensaje: "[Cuota Agotada] Progreso salvado en N/Total paginas. Ejecuta con --resume para continuar."
- Salida limpia (sys.exit(0), no traceback)
- Los checkpoints persisten en disco

---

## Tests (orden TDD)

Hito 3.1 (T3.1.1-6): AdaptiveSemaphore
Hito 3.2 (T3.2.1-4): Resume logic
Hito 3.3 (T3.3.1-2): Quota handling

