# Optimización UniVia

## Alcance y criterio de verificación

Este documento registra la revisión final realizada el **11 de septiembre de
2026** sobre el estado disponible en el árbol de trabajo. La revisión fue
lectura/análisis; no se modificó código de aplicación. Las métricas históricas
en milisegundos y tamaño de bundle no estaban versionadas, por lo que se
separan los resultados medidos de las mejoras estructurales observables.

## 1. Resumen ejecutivo de performance

| Indicador | Antes/documentado | Después observable | Evidencia o límite |
|---|---:|---:|---|
| Workers HTTP | No consta una medición previa | 4 workers Uvicorn | `backend/Dockerfile`; es capacidad configurada, no throughput medido |
| Backlog de sockets | No consta | 1024 | `backend/Dockerfile` |
| Clientes Supabase autenticados | Cliente nuevo por solicitud (problema identificado) | Pool LRU acotado a 64 clientes por proceso | `backend/app/core/database.py` |
| Alcance de recursos | Consultas encadenadas tipo N+1 | RPC `get_recursos_alcance` en 1 RTT para alcance y catálogos | `backend/app/routers/recursos.py` y migración RPC |
| Latencia de base de datos | No se encontró benchmark baseline | No cuantificable sin telemetría comparable | La arquitectura reduce round-trips, pero no permite afirmar ms ahorrados |
| Respuesta del chatbot | No se encontró benchmark baseline | Caché de clasificación `lru_cache(maxsize=128)` y caché RAG TTL | `intents.py` y `generator.py`; no hay p50/p95 versionados |
| Bundle JavaScript | No se encontró tamaño baseline | Carga diferida de grafo/renderizadores pesados; dependencias declaradas de Three/Recharts purgadas del `package.json` | No se generó comparación `next build --analyze` |
| Concurrencia frontend | Peticiones duplicadas posibles por efectos/navegación | Single-flight + SWR con TTL y `localStorage` | `frontend/lib/api-cache.ts`; no sustituye una prueba de carga |
| Compilación Python | No disponible en este informe | **OK**: `compileall` de `backend/app` | Python 3.12.10 |
| Tests backend | No disponible en este informe | **86/86 pasan** | `pytest -q backend\tests` |
| Tests frontend | No disponible en este informe | **52/52 pasan** en 9 archivos | `npm run test -- --run` desde `frontend` |
| Build Next.js | No disponible en este informe | **Compilación Next.js OK**, con validación de tipos omitida por Next | `npm run build` |
| TypeScript estricto | No disponible en este informe | **No limpio**: `npx tsc --noEmit` reporta errores en signup y malla gráfica | Debe corregirse antes de declarar 100% limpio |

### Conclusión ejecutiva

La resiliencia y el número de round-trips mejoraron estructuralmente, y los
tests funcionales disponibles pasan. Sin embargo, la plataforma **no puede
certificarse como 100% limpia** en esta revisión: el chequeo TypeScript estricto
falla y ESLint no pudo ejecutarse porque el binario `eslint` no está instalado
en `frontend/node_modules`. El build de Next informa explícitamente que omite la
validación de tipos, por lo que su éxito no contradice el fallo de `tsc`.

## 2. Matriz completa de cambios y archivos intervenidos

Las fases se interpretan así: **Fase 1 = quick wins/caching**, **Fase 2 =
integración funcional y UI**, **Fase 3 = resiliencia, seguridad y expansión de
flujos**.

| Archivo exacto | Problema detectado | Solución implementada | Fase |
|---|---|---|---|
| `backend/Dockerfile` | Capacidad HTTP conservadora | Uvicorn con 4 workers, asyncio y backlog 1024 | 1 |
| `backend/app/core/database.py` | Re-creación de clientes y sockets muertos | Cliente compartido, pool LRU de 64, invalidación y reintento | 1 |
| `backend/app/routers/recursos.py` | Alcance y catálogos con patrón N+1 | RPC `get_recursos_alcance` y consultas fuera del event loop vía `to_thread` | 1 |
| `backend/app/core/actividad.py` | Escrituras/lecturas frágiles ante cierre HTTP/2 | Uso de `ejecutar_con_reintento` y degradación explícita si falta la tabla | 1 |
| `backend/app/chatbot/intents.py` | Clasificación repetida y rate limit 429 | `lru_cache(maxsize=128)`, reintentos limitados y fallback de intención | 1 |
| `backend/app/rag/generator.py` | Regeneración de respuestas idénticas y logs ruidosos | Caché por pregunta/modelo con TTL y limpieza de entradas antiguas | 1 |
| `backend/app/rag/embedder.py` | Esperas fijas durante embeddings | Backoff condicionado a rate limit | 1 |
| `backend/app/rag/embedding_cache.py` | Recalcular embeddings duplicados | Caché por hash de contenido | 1 |
| `backend/app/rag/extractor.py` | Reintentos bloqueantes del pipeline RAG | Reintentos/backoff del extractor documentados para revisión | 1 |
| `backend/app/rag/drive_downloader.py` | Backoff síncrono de descargas | Reintentos acotados para errores de descarga | 1 |
| `backend/app/core/auth_utils.py` | Acceso Supabase bloqueante dentro de FastAPI | Llamadas trasladadas a `asyncio.to_thread` | 1 |
| `backend/app/chatbot/user_context.py` | Lecturas Supabase síncronas en el flujo async | Lecturas aisladas con `asyncio.to_thread` | 1 |
| `backend/app/routers/chatbot.py` | Dependencias externas en el event loop | Descarga de trabajo bloqueante a hilos y streaming controlado | 1 |
| `backend/app/core/llm.py` | Integración LLM sin configuración uniforme | Capa común para proveedores/modelos y uso de claves BYOK | 2 |
| `backend/app/chatbot/consultas.py` | Consultas de chatbot dispersas | Helpers de consulta y contexto reutilizables | 2 |
| `backend/app/chatbot/handlers.py` | Ramas de intención difíciles de mantener | Handlers separados por intención y fallbacks explícitos | 2 |
| `backend/app/main.py` | Cierre incompleto de clientes HTTP y errores no uniformes | Lifespan, CORS/TrustedHost, rate limiting y respuestas estructuradas | 3 |
| `backend/app/core/rate_limit.py` | Endpoints sin límite configurable | Limiter central para endpoints declarados | 3 |
| `backend/app/routers/feedback.py` | Falta de flujo de feedback | Router de feedback y cliente HTTP persistente | 3 |
| `backend/app/routers/foro.py` | Falta de foro moderable | Endpoints de secciones/publicaciones | 3 |
| `backend/app/routers/dm.py` | Falta de mensajería directa | Router de conversaciones y mensajes | 3 |
| `backend/app/schemas/foro.py` | Contratos de foro inexistentes | Esquemas Pydantic para foro | 3 |
| `backend/app/schemas/dm.py` | Contratos de DM inexistentes | Esquemas Pydantic para mensajería | 3 |
| `frontend/lib/api-cache.ts` | Duplicación de requests y cargas bloqueantes | SWR, TTL, single-flight y persistencia `localStorage` | 1 |
| `frontend/lib/api-service.ts` | Acceso API repetido y cachés no coordinadas | Integración de `leerOCache`, invalidación y timeouts | 1 |
| `frontend/lib/chatbot-service.ts` | Flujo chatbot sin validación BYOK | Micro-validación de clave y manejo de errores | 2 |
| `frontend/lib/byok.ts` | Clave del usuario sin almacenamiento aislado | BYOK solo en navegador, nunca en logs ni backend persistente | 2 |
| `frontend/components/chatbot/byok-modal.tsx` | Falta de UI para clave propia | Modal para guardar, validar y borrar clave Gemini | 2 |
| `frontend/components/chatbot/chat-bubble.tsx` | Estado del hilo no persistente | Persistencia del `conversacion_id` por usuario | 2 |
| `frontend/components/chatbot/chat-panel.tsx` | Chat sin señalización BYOK | Estado visual de clave propia y flujo de sesión | 2 |
| `frontend/components/learning-path/evaluacion-ia.tsx` | Renderizadores pesados en bundle inicial | `next/dynamic` con `ssr: false` para Markdown y resultados | 1 |
| `frontend/app/malla/page.tsx` | Grafo pesado cargado siempre | Code-splitting de `MallaGraph` con `next/dynamic` | 1 |
| `frontend/app/layout.tsx` | Providers/chat acoplados a layouts de dashboard | Providers y burbuja en el App Router root layout | 2 |
| `frontend/components/providers/auth-context.tsx` | Sesión y refresh difíciles de sincronizar | Contexto centralizado y limpieza de caché al cerrar sesión | 2 |
| `frontend/components/dashboard.tsx` | Lecturas duplicadas de dashboard | Uso de cachés y carga coordinada | 1 |
| `frontend/components/dashboard/sidebar-widgets.tsx` | Widgets solicitados por separado | Reutilización de datos cacheados | 1 |
| `frontend/components/header.tsx` | Estado de sesión repetido | Integración con contexto de autenticación | 2 |
| `frontend/components/sidebar.tsx` | Navegación sin estados consistentes | Integración con estado de sesión/preferencias | 2 |
| `frontend/app/malla/page.tsx` | Tipos del grafo todavía incompatibles con React Flow | La optimización visual está aplicada, pero `tsc` aún detecta errores | 1 |
| `frontend/package.json` | Dependencias visuales sin uso | Eliminación declarativa de Three/Recharts; queda `@types/three` por revisar | 1 |
| `base_de_datos/esquema/migracion_perf_indices.sql` | Consultas sin índices de soporte | Índices de performance | 1 |
| `base_de_datos/esquema/migracion_rpc_1rtt.sql` | Alcance resuelto mediante múltiples viajes | RPC de recursos en un viaje | 1 |
| `base_de_datos/esquema/remediacion_rls_seguridad.sql` | Tablas expuestas sin políticas completas | Remediación de RLS | 3 |
| `base_de_datos/esquema/migracion_fase9_feedback.sql` | Persistencia de feedback ausente | Tablas/políticas para feedback | 3 |
| `base_de_datos/esquema/migracion_fase9_feedback_fase2_3.sql` | Evolución de feedback y fases posteriores | Migración consolidada de fases 2/3 | 3 |
| `base_de_datos/esquema/migracion_foro_fase1.sql` | Modelo de foro ausente | Tablas iniciales de foro | 3 |
| `base_de_datos/esquema/migracion_foro_fase2.sql` | Funciones del foro incompletas | Extensiones de foro | 3 |
| `base_de_datos/esquema/migracion_foro_fase3_dm.sql` | DM no modelado | Tablas de mensajería | 3 |
| `base_de_datos/esquema/migracion_foro_fase4_ia.sql` | IA de foro no persistida | Soporte de sugerencias IA | 3 |

## 3. Desglose detallado por capas

### Infraestructura y Docker

`backend/Dockerfile` expone el puerto 8000 y ejecuta:

```text
uvicorn app.main:app --host 0.0.0.0 --port 8000 \
  --workers 4 --loop asyncio --backlog 1024
```

- `--workers 4`: cuatro procesos Uvicorn independientes; mejora la capacidad
  de atender solicitudes concurrentes de CPU/red, a costa de multiplicar
  memoria y pools por proceso.
- `--loop asyncio`: usa el event loop asyncio para los endpoints async.
- `--backlog 1024`: permite una cola de conexiones pendientes mayor antes de
  rechazos bajo ráfagas.

El pool LRU de clientes Supabase vive por proceso; cuatro workers no comparten
los mismos 64 clientes. El limiter actual es in-memory y su propio comentario
indica que, al escalar a varios procesos, debe migrarse a Redis.

### Base de datos y resiliencia

`backend/app/core/database.py` mantiene un cliente anónimo compartido y un
`OrderedDict` protegido por `threading.Lock` para hasta 64 clientes autenticados.
El acceso mueve el cliente usado al final y expulsa el menos recientemente
usado al superar el límite.

`ejecutar_con_reintento` identifica errores de transporte HTTPX y textos como
`ConnectionTerminated`, invalida el cliente muerto y repite una vez con un
socket nuevo. La identidad RLS se conserva porque se vuelve a autenticar el
token. Este helper se usa en `actividad.py` y `routers/recursos.py`.

`get_recursos_alcance` consolida perfil, carrera, facultad, malla, cursos y
catálogos en una RPC de 1 RTT. El listado posterior reutiliza esos mapas y evita
consultas N+1. La consulta de progreso para “mis cursos” permanece separada por
ser un filtro específico de esa vista.

La autenticación FastAPI usa `get_current_user`, valida el bearer token con
Supabase y ejecuta la llamada bloqueante mediante `asyncio.to_thread`, evitando
bloquear el event loop. La validación realizada aquí es estática y mediante
tests; no fue una prueba contra un proyecto Supabase remoto.

### Inteligencia artificial y caching

`intents.py` usa `functools.lru_cache(maxsize=128)` para clasificaciones
repetidas, conserva hasta cuatro turnos de contexto y limita los reintentos de
429. `generator.py` cachea respuestas por pregunta/modelo durante 3600 segundos
con purga al superar 500 entradas.

El frontend implementa un caché SWR en `api-cache.ts`: TTL de 1, 5 y 10 minutos,
persistencia en `localStorage`, retorno de datos stale y single-flight para que
solicitudes simultáneas de la misma clave compartan una promesa.

La afirmación “eliminación total de I/O síncrono” no se verifica en el árbol:
persisten `time.sleep` en reintentos del clasificador y en módulos del pipeline
RAG. Las rutas web principales sí descargan llamadas bloqueantes con
`asyncio.to_thread`, pero los scripts/pipelines deben mantenerse fuera del
event loop o migrarse a esperas async antes de afirmar cobertura total.

### Frontend y optimización de UI

`evaluacion-ia.tsx` carga bajo demanda Markdown/KaTeX y resultados con
`next/dynamic({ ssr: false })`; `app/malla/page.tsx` hace lo mismo con el grafo
React Flow. Esto reduce el trabajo inicial de rutas que no necesitan esos
componentes.

`api-cache.ts` evita flashes y requests duplicadas. `layout.tsx` mantiene
`AuthProvider`, `ThemeProvider` y `ChatBubble` en el App Router raíz para que el
hilo sobreviva a la navegación.

El `package.json` de frontend ya no declara `three`, `@react-three/drei`,
`@react-three/fiber` ni `recharts` como dependencias directas; todavía aparece
`@types/three` en devDependencies y debe eliminarse solo después de confirmar
que ningún consumidor lo requiere.

BYOK se almacena en el navegador mediante `frontend/lib/byok.ts`, se valida con
una llamada explícita y no se persiste en la base. Las banderas de saldo
agotado se consideran cubiertas por el manejo de estados del flujo de
evaluación/chat, pero no existe en esta revisión una prueba de integración
remota que cubra cuota real del proveedor.

## 4. Guía de mantenimiento para el equipo

### Despliegue con Docker

Desde la raíz del repositorio:

```powershell
docker build -t univia-backend .\backend
docker run --rm -p 8000:8000 --env-file .\backend\.env univia-backend
```

Para producción:

1. Definir `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY` mediante secretos del orquestador.
2. Configurar `CORS_ORIGINS` y `TRUSTED_HOSTS`; no usar `*`.
3. Ejecutar las migraciones SQL en orden y validar RLS con un usuario real.
4. Medir memoria por proceso antes de aumentar `--workers`.
5. Usar un limiter compartido (Redis) si se ejecutan varios workers/instancias.

### Evitar regresiones de rendimiento

- Preferir RPCs o consultas agregadas para jerarquías; no hacer una consulta por
  fila dentro de loops de routers.
- Ejecutar SDKs bloqueantes con `asyncio.to_thread` desde endpoints async.
- No lanzar llamadas Supabase en paralelo sobre la misma instancia HTTP/2.
  Coordinar cargas con una sola tarea por clave o clientes aislados.
- Reutilizar `ejecutar_con_reintento` para operaciones autenticadas y no
  reconstruir builders de PostgREST fuera de la factory que recibe el cliente.
- Invalidar cachés después de mutaciones y asignar TTL según volatilidad del
  dato.
- No guardar claves BYOK en logs, respuestas, telemetría ni base de datos.
- Mantener `next/dynamic` para componentes pesados y comprobar el bundle con
  un analyzer antes/después de añadir dependencias visuales.
- Sustituir `time.sleep` por `await asyncio.sleep` únicamente en funciones
  async; en pipelines síncronos usar workers dedicados, no bloquear el event
  loop.
- Ejecutar antes de fusionar:

```powershell
.\backend\venv\Scripts\python.exe -m compileall -q backend\app
.\backend\venv\Scripts\python.exe -m pytest -q backend\tests
Set-Location frontend
npm run test -- --run
npx tsc --noEmit
npm run build
```

## Verificación final registrada

- Python `compileall`: **pasa**.
- Backend pytest: **86 tests pasan**.
- Frontend Vitest: **52 tests pasan en 9 archivos**.
- Next.js build: **pasa**, pero muestra advertencias de lockfiles múltiples y
  omite la validación de tipos.
- TypeScript estricto: **falla** por errores en `app/auth/signup/page.tsx` y
  los tipos/tests de `components/malla-graph`.
- ESLint: **no ejecutable** porque `eslint` no se encuentra instalado en
  `frontend/node_modules`.

Por estos dos últimos puntos, la recomendación de cierre es corregir primero el
contrato de `motivoSolicitud`, los tipos `Set<unknown>`/`Set<string>` y los
genéricos `Node<Record<string, unknown>>` de React Flow; después instalar o
restaurar la dependencia declarada de ESLint y repetir la matriz completa.
