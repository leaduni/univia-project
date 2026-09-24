# Ruta de Despliegue MVP — Limpieza de Hardcode y Mocks

> **Objetivo:** llevar UniVia a producción sin hardcoding de red, sin datos falsos de
> producción y sin fugas de depuración, **sin romper el flujo actual de la aplicación**.
>
> **Premisa encontrada en la investigación:** el codebase ya migró casi todas las pantallas
> a la API real (FastAPI + Supabase). El trabajo pendiente es (a) defaults de variables de
> entorno que apuntan a `localhost`, (b) un par de acoplamientos/mock residuales y
> (c) logs de depuración. Este documento es la hoja de ruta verificada.
>
> **Nota:** el archivo `AUDITORIA_HARDCODE_MVP.md` referido en el enunciado **no existe**
> en el repositorio (búsqueda exhaustiva: 0 coincidencias). Este documento sustituye y
> fundamenta esa auditoría con evidencia real extraída del código y de la base de datos.

---

## 0. Inventario ejecutivo de riesgos (verificado vía MCP de Supabase + inspección estática)

| Área | Archivo(s) | Problema | Severidad | ¿Bloqueador de producción? |
|------|-----------|----------|-----------|----------------------------|
| Env frontend | 7 archivos `lib/*.ts` + `learning-path/evaluacion-ia.tsx` | `NEXT_PUBLIC_API_URL \|\| "http://localhost:8000"` como default | ALTA | SÍ (si no se setea, el bundle compilado llama a localhost) |
| Env frontend | `frontend/.env.example` | `NEXT_PUBLIC_API_URL=http://localhost:8000` como ejemplo | MEDIA | SÍ (ejemplo engañoso para despliegue) |
| Env build | `frontend/next.config.mjs` | Next.js inlines `NEXT_PUBLIC_*` en BUILD TIME | CRÍTICA | SÍ (las vars deben existir en el build, no en runtime) |
| Env backend | `backend/app/main.py` (`DEFAULT_ORIGINS`) | Defaults CORS = localhost:3000/3001/5173 | ALTA | SÍ (el navegador prod recibe CORS rechazado) |
| Env backend | `backend/.env.example` | No declara `CORS_ORIGINS`, `TRUSTED_HOSTS` ni un `FRONTEND_URL` productivo | ALTA | SÍ (caen en defaults localhost/`*`) |
| Env backend | `backend/app/routers/usuarios.py:25` | `FRONTEND_URL \|\| "http://localhost:3000"` | MEDIA | SÍ (el enlace de recuperación apunta a localhost) |
| Env deploy | `backend/docker-compose.yml` | Solo pasa `SUPABASE_URL`/`SUPABASE_ANON_KEY`; omite CORS/FRONTEND_URL/TRUSTED_HOSTS/JWT | ALTA | SÍ |
| Mock data | `frontend/lib/mockData.ts` | 5 exports "muertos" (sin consumidor) + 1 fallback activo | MEDIA | No (fallback controlado) |
| Mock data | `frontend/components/ui/constellation-grid.tsx` | `COURSE_CODES`: 18 códigos hardcodeados e inventados | BAJA | No (decoración de la landing) |
| Debug logs | `frontend/components/learning-path.tsx:53` | `console.error(err)` en catch | MEDIA | Parcial (ruido en prod) |
| Debug logs | `frontend/components/agenda/*.tsx` (2 archivos, 3 logs) | `console.log("[IA]/[Productividad]…")` | MEDIA | Sí |
| Debug logs | `frontend/lib/api-service.ts` (14 sitios) | `console.error/warn("API Error…")` en catch | BAJA-MEDIA | Parcial (logging de error aceptable si se centraliza) |
| Debug logs | `frontend/lib/supabase.ts:8` | `console.warn(...)` si faltan credenciales | BAJA | No |
| Debug logs | `backend/app/routers/usuarios.py:801,803` | `print(...)` en el rollback del registro | BAJA-MEDIA | Parcial |
| Debug logs | `backend/scrapeo/scrape_profesores.py` | Múltiples `print()` | BAJA | No (script de ingestión, no es la API viva) |

---

## Fase 1: Red y Entorno (reemplazar `localhost` → variables de entorno)

### 1.1 Principio guía

- Las variables `NEXT_PUBLIC_*` en Next.js se **inlinean en BUILD TIME** dentro del
  bundle. La URL del backend y las credenciales de Supabase deben estar definidas en el
  momento del `npm run build` (env vars de Vercel/Netlify/Railway, o `--build-arg` en
  Docker). **No** depender de `.env.local` para el despliegue.
- El backend ya lee `CORS_ORIGINS`, `TRUSTED_HOSTS` y `FRONTEND_URL` desde el entorno,
  pero sus *defaults* (`main.py`) son `localhost` y `*`. En producción hay que
  **obligar** a definirlos o fallar el arranque (fail-fast).

### 1.2 Frontend — unificar la fuente de la URL de la API

Los 7 archivos duplican la misma línea:

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_URL = BASE_URL.endsWith("/api") ? BASE_URL : `${BASE_URL}/api`;
```

Archivos afectados:

| N.º | Archivo | Línea |
|-----|---------|-------|
| 1 | `frontend/lib/api-service.ts` | 6 |
| 2 | `frontend/lib/chatbot-service.ts` | 13 |
| 3 | `frontend/lib/dm-service.ts` | 14 |
| 4 | `frontend/lib/feedbackTicketsAdapter.ts` | 9 |
| 5 | `frontend/lib/foro-service.ts` | 24 |
| 6 | `frontend/lib/gamificacion-service.ts` | 19 |
| 7 | `frontend/components/learning-path/evaluacion-ia.tsx` | 48 |

**Plan de acción (cero regresión):**

1. Crear `frontend/lib/env.ts` con un único lector:

```ts
export const API_URL = (() => {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  if (!base) {
    if (process.env.NODE_ENV !== "production") {
      // Dev local: permite trabajar sin .env.local (comportamiento actual).
      return "http://localhost:8000/api";
    }
    // Producción: fallar en build en vez de servir un bundle que llama a localhost.
    throw new Error("NEXT_PUBLIC_API_URL no está configurada (producción).");
  }
  return base.endsWith("/api") ? base : `${base}/api`;
})();
```

2. Reemplazar en los 7 archivos la lógica duplicada por `import { API_URL } from "@/lib/env"`.

3. `frontend/lib/supabase.ts`: envolver el `console.warn` de credenciales con
   `if (process.env.NODE_ENV !== "production")`.

4. `frontend/.env.example`: cambiar el ejemplo a un valor productivo y documentar que en
   dev se sobreescribe con `.env.local`:

```env
# Backend API Service Base URL (sin /api)
# En DESARROLLO usa .env.local con: NEXT_PUBLIC_API_URL=http://localhost:8000
# En PRODUCCIÓN debe apuntar al backend desplegado:
NEXT_PUBLIC_API_URL=https://api.univia.pe
```

   Mantener `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con sus
   placeholders documentados.

### 1.3 Backend — CORS, hosts de confianza y URL del frontend

Referencias actuales:

- `backend/app/main.py` líneas 47-80:
  - `TRUSTED_HOSTS_DEFAULT = "*"` → en producción **exigir** lista explícita vía `TRUSTED_HOSTS`.
  - `DEFAULT_ORIGINS` (localhost:3000/3001/5173) → en producción **exigir** `CORS_ORIGINS`
    con el(los) origen(es) real(es), p. ej. `https://univia.pe,https://www.univia.pe`.
- `backend/app/routers/usuarios.py:25`:
  - `FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")` → default debe ser
    el origen productivo; en dev se mantiene vía `.env`.

**Plan de acción:**

1. En `main.py`, si el entorno es producción y `CORS_ORIGINS` o `TRUSTED_HOSTS` están
   vacíos/sin setear → `raise RuntimeError` al import (fallo rápido). Mantener los
   defaults `localhost` **solo** para desarrollo (p. ej. condición sobre `ENV`/`APP_ENV`).

2. `backend/.env.example`: **agregar** las claves que hoy faltan y que hoy caen en
   defaults peligrosos:

```env
# --- Despliegue (CORS, hosts y URL del frontend) ---
CORS_ORIGINS=https://univia.pe,https://www.univia.pe
TRUSTED_HOSTS=univia.pe,www.univia.pe,api.univia.pe
FRONTEND_URL=https://univia.pe
```

3. `backend/docker-compose.yml`: agregar al bloque `environment:` del servicio `backend`:

```yaml
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
      - CORS_ORIGINS=${CORS_ORIGINS}
      - TRUSTED_HOSTS=${TRUSTED_HOSTS}
      - FRONTEND_URL=${FRONTEND_URL}
```

   > Nota: este compose es de desarrollo; en producción real los secretos se inyectan
   > desde el orquestador (Railway/Fly/Render/K8s), no desde el archivo.

4. `iniciar.bat`: es el arranque local (dev-only). Su uso de `localhost:8000`/`localhost:3000`
   es correcto para dev; solo agregar un comentario aclarando que no es configuración de
   producción.

### 1.4 Garantía de no-regresión

- **Dev:** `frontend/.env.local` con `NEXT_PUBLIC_API_URL=http://localhost:8000` +
  credenciales Supabase locales → el flujo actual funciona idéntico.
- **CI:** `npm run build` (o el flujo de deploy) debe setear las `NEXT_PUBLIC_*` de
  producción; el guard de producción de `env.ts` falla el build si falta la variable.
- **Backend:** los tests (`pytest backend/tests/`) y las llamadas desde el frontend de
  dev siguen usando localhost sin cambios.

---

## Fase 2: Conexión de UI a Base de Datos (mapeo mock → Supabase)

### 2.1 Estado de la base de datos verificada (MCP — proyecto `pggpscrbpcasbgjhjigw`)

- Nombre: `UniviaProject` · Región: `us-east-1` · Postgres 17.6 · Estado: `ACTIVE_HEALTHY`.
- RLS **habilitado** en todas las tablas consultadas (las peticiones viajan con el token
  del usuario; el backend usa `get_supabase(token)`).

Conteos reales (existen datos reales; la migración no es teórica):

```text
cursos=449  carreras=19  facultades=11  mallas=10  malla_cursos=646
profesores=85  curso_profesores=116  perfiles=9  recursos=6779
learning_path_steps=282  logros=6  logros_usuarios=5  gamificacion_usuarios=9
progreso_cursos=187  foro_secciones=12  foro_publicaciones=1
```

Muestra real (SQL ejecutado): `cursos` → `BMA03 Álgebra Lineal`, `SI205 Algoritmia y
Estructura de Datos`; `carreras` → `SW Ingeniería de Software`, `SI Ingeniería de
Sistemas`; `mallas` → `Plan de Estudios 2026-1` (vigente), `Plan 2018-II`.

### 2.2 Conclusión clave: la migración ya se hizo en la mayoría de los consumidores

Verificado leyendo cada página: las pantallas ya **no** usan mock como fuente primaria.

| Página / Componente | Antes (según docs antiguas) | AHORA (verificado en código) | Endpoint real (api-service) |
|---|---|---|---|
| `app/malla/page.tsx` | `CURRICULUM_DATA` | `apiService.getMalla()` + `getAvanceCarrera()` | `GET /malla` · `GET /malla/avance` |
| `app/dashboard/page.tsx` → `components/dashboard.tsx` | `DASHBOARD_STATS`, `CURRICULUM_DATA` | `getDashboardSummary()` + `getCursosActivos()` | `GET /dashboard/summary` · `GET /dashboard/cursos-activos` |
| `app/perfil/page.tsx` | — | `apiService` (`getProfile`, `cambiarMalla`) | `GET /usuarios/me` · `PATCH /usuarios/me/malla` |
| `app/curso/[id]/page.tsx` → `components/learning-path.tsx` | `LEARNING_PATH_DATA` | `apiService.getLearningPath()` | `GET /curso/{id}/learning-path` |
| `components/learning-path/exam-bank.tsx` | `EXAM_BANK_DATA` (mock) | `apiService.getRecursos({ curso_id })` | `GET /recursos?curso_id=` |
| `app/recursos/page.tsx` → `components/recursos-biblioteca.tsx` | `RECURSOS_DATA` | `apiService.getRecursosPaginados()` | `GET /recursos` (paginado) |
| `app/onboarding/page.tsx` → `components/onboarding-wizard.tsx` | `CAREERS`, `CURRICULUM_DATA` | `getOnboardingData()` / `completeOnboarding()` | `GET /onboarding/data` · `POST /onboarding/complete` |
| `app/ranking/page.tsx` → `gamificacion/ranking-view.tsx` | ACHIEVEMENTS (local) | `gamificacionService.getRanking()` | `GET /gamificacion/ranking` |
| `components/gamificacion/gamification-widget.tsx` | — | `gamificacionService.getResumen()` | `GET /gamificacion/resumen` |

### 2.3 Tabla de mapeo exacta: mock Y del archivo X → tabla Z de Supabase (columnas reales del MCP)

| Mock export (`frontend/lib/mockData.ts`) | Consumer ACTUAL | Tabla(s) real(es) + columnas reales (MCP) | Endpoint real que YA existe |
|---|---|---|---|
| `CAREERS` (4 carreras "Ingeniería") | `onboarding-wizard.tsx` (ya real) | `carreras(id, codigo, name, description, duracion_ciclos, facultad_id)` + `facultades(id, codigo, nombre)` | `GET /onboarding/data` |
| `CURRICULUM_DATA` (4 ciclos c/ cursos) | `malla/page.tsx`, `dashboard.tsx` (ya reales) | `mallas(id, carrera_id, nombre, codigo_plan, es_vigente)` + `malla_cursos(id, malla_id, curso_id, ciclo, credits, tipo)` + `cursos(id, code, name, description)` + `malla_curso_prerrequisitos(malla_curso_id, prerrequisito_malla_curso_id)` + `progreso_cursos(perfil_id, curso_id, status, nota, fecha_completado)` | `GET /malla` (RPC `get_malla_datos`) + `GET /malla/avance` |
| `LEARNING_PATH_DATA` (ruta por curso) | `learning-path.tsx` (ya real) | `learning_path_steps(id, curso_id, title, description, duration, order_index, topics[], icon, estado)` + `cursos(id, code, name)` + `progreso_unidades(perfil_id, step_id, curso_id, completado)` | `GET /curso/{id}/learning-path` |
| `RECURSOS_DATA` (8 ítems) | `dashboard/recent-resources.tsx` (**fallback**) | `recursos(id, titulo, tipo, curso_id, codigo_curso, nombre_curso, ciclo, year, downloads, rating, preview_url, has_solucionario, url_drive, created_at)` | `GET /recursos` (ya se llama; mock solo si no hay sesión/vacío/error) |
| `DASHBOARD_STATS` (5/68/12) | `dashboard.tsx` (ya real) | `progreso_cursos`, `malla_cursos`, `gamificacion_usuarios`, `logros`, `logros_usuarios` | `GET /dashboard/summary` |
| `ACHIEVEMENTS` (5 logros) | `dashboard.tsx` / `sidebar-widgets` (ya real) | `logros(id, nombre, descripcion, icon)` + `logros_usuarios(perfil_id, logro_id, unlocked_at)` | `GET /dashboard/logros` (+ incluido en `/dashboard/summary`) |

### 2.4 Lo que queda PENDIENTE (acción requerida en el futuro)

1. **`frontend/components/dashboard/recent-resources.tsx`** — ya llama
   `apiService.getRecursos({})` y usa `RECURSOS_DATA` **solo como fallback** (sin sesión,
   respuesta vacía o error de red). Las columnas del mock y las de la tabla real `recursos`
   ya coinciden en shape (por eso el cast `as Recurso[]` funciona). **Recomendación:**
   mantener el fallback (lo exige `AGENTE.md` §2) y conservar la marca visual
   "contenido de ejemplo" (ya implementada con `esEjemplo`). Si el equipo decide eliminar
   el acoplamiento, inyectar el fallback desde `apiService` de forma centralizada.

2. **`frontend/components/ui/constellation-grid.tsx`** — define su propio array
   `COURSE_CODES` (18 códigos **inventados**: `CS101`, `MAT101`, …) que **no existen** en
   la BD real (la BD tiene `BMA03`, `SI205`, `SW305`, …). Es un efecto visual de la
   landing (canvas decorativo). **Recomendación:** a baja prioridad, alimentarlo con
   `cursos.code` reales vía el cliente `supabase` (1 query), o documentarlo explícitamente
   como pantalla estática de marketing. No es dato de producción crítico.

3. **Exports "muertos" de `mockData.ts`** — `CAREERS`, `CURRICULUM_DATA`,
   `LEARNING_PATH_DATA`, `DASHBOARD_STATS`, `ACHIEVEMENTS` **no son importados por ningún
   archivo fuente** (búsqueda `@/lib/mockData` devuelve solo `recent-resources.tsx`).
   **Recomendación:** dejarlos como biblioteca de fallback bajo `AGENTE.md` §2 (no borrar),
   pero eliminarlos del bundle de producción (p. ej. `ts-unused-exports` + un `index.ts`
   de fallback que solo importe `RECURSOS_DATA`).

---

## Fase 3: Limpieza y Cero Regresión (eliminar logs y mocks sin romper React/FastAPI)

### 3.1 Logs de depuración en el FRONTEND (código fuente; se excluyen `.agents/` y docs)

| Archivo | Línea | Código a eliminar | Acción |
|---|---|---|---|
| `frontend/components/learning-path.tsx` | 53 | `console.error(err)` (catch genérico) | Borrar. La rama 403 ya muestra su UI (`setAccessDenied(true)`); el resto usa `setError`. |
| `frontend/components/agenda/agenda-inteligente.tsx` | 669 | `console.log(\`[IA] Iniciando repaso para: ${evento.titulo}\`)` | Borrar (dejar el `alert()` = UX de preview intencional). |
| `frontend/components/agenda/agenda-inteligente.tsx` | 945 | `console.log(\`[Productividad] Sesión finalizada: ...\`)` | Borrar. |
| `frontend/components/agenda/calendar-grid.tsx` | 164 | `console.log(\`[IA] Iniciando repaso para: ${evento.titulo}\`)` | Borrar (dejar el `alert()`). |
| `frontend/lib/api-service.ts` | 82 | `console.warn("Reintentando GET …")` | Envolver en `if (process.env.NODE_ENV !== "production")` o pasarlo a un `logger` central. |
| `frontend/lib/api-service.ts` | 792, 811, 826, 841, 875, 924, 942, 972, 999, 1010, 1016, 1050, 1058, 1078 | `console.error("API Error…")` en catch | Son logging de error que **re-lanza**; no rompen nada. Mínimo obligatorio: no cambiarlos. Recomendado: centralizar en `logger.error` (envío a monitor no-bloqueante en prod). |
| `frontend/lib/supabase.ts` | 8 | `console.warn('Supabase URL or Anon Key is missing…')` | Envolver en `if (process.env.NODE_ENV !== "production")`. |

### 3.2 Logs de depuración en el BACKEND

| Archivo | Línea | Código | Acción |
|---|---|---|---|
| `backend/app/routers/usuarios.py` | 801 | `print(f"[REGISTER-USER] Rolled back auth user: {user_id}")` | Reemplazar por `logger.info(...)` (el módulo ya usa `logging`). |
| `backend/app/routers/usuarios.py` | 803 | `print(f"[REGISTER-USER] Rollback failed for {user_id}: {rollback_error}")` | Reemplazar por `logger.warning(...)`. |
| `backend/scrapeo/scrape_profesores.py` | varios | `print(...)` | No es código de la API viva (script de ingestión standalone). Migrar a `logging` en refactor posterior. Prioridad BAJA. |

> El resto del backend ya usa `logging.getLogger(__name__)` (correcto), incluido
> `backend/app/main.py` con `logger.exception` en el manejador global.

### 3.3 Mocks → sin tocar componentes que YA funcionan

- **`recent-resources.tsx`**: NO borrar el fallback `RECURSOS_DATA` (requisito `AGENTE.md`
  §2). Ya está detrás de la llamada real y marcado como "contenido de ejemplo".
- **`learning-path.tsx`**: no tocar la UI; solo borrar el `console.error(err)` del catch.
- **`agenda-*`**: no tocar la lógica (Pomodoro, focus mode, estados); solo borrar los
  `console.log`.
- **Server Components** (p. ej. `app/curso/[id]/page.tsx`): ya no tienen `console.log` de
  cliente; verificados sin cambios.

### 3.4 Checklist de validación (ejecutar antes del merge a producción)

- [ ] `NEXT_PUBLIC_API_URL` apunta a `https://api.univia.pe` en el build de producción.
- [ ] `CORS_ORIGINS` incluye `https://univia.pe` (y `www.` si aplica).
- [ ] `FRONTEND_URL` apunta a `https://univia.pe`.
- [ ] `TRUSTED_HOSTS` configurado (sin `*`) en producción.
- [ ] `npx tsc --noEmit` pasa tras unificar `lib/env.ts` (no romper imports).
- [ ] `npm run build` y `npm --prefix frontend test` en verde.
- [ ] `pytest backend/tests/` en verde.
- [ ] Smoke test en prod: `GET /malla`, `/dashboard/summary`, `/recursos`,
      `/curso/{id}/learning-path`, `/onboarding/data` devuelven datos reales (no `[]`).
- [ ] Grep post-build: sin `console.log` de agenda/learning-path en el bundle de
      producción.
- [ ] Las peticiones del navegador al backend desde el dominio productivo no muestran
      errores CORS en la consola.

---

## Resumen del trabajo de investigación (ya realizado)

- **Supabase (MCP):** proyecto `UniviaProject` (`pggpscrbpcasbgjhjigw`, `ACTIVE_HEALTHY`,
  Postgres 17.6). 38 tablas públicas inspeccionadas con columnas reales; RLS activado.
- **Esquema real = shape de los mocks:** las columnas de `recursos`, `malla_cursos`,
  `learning_path_steps`, `logros`, etc. coinciden con los tipos del frontend
  (`types/recurso.ts`, `types/malla.ts`, `types/onboarding.ts`), por eso la migración de
  datos fue limpia.
- **`AUDITORIA_HARDCODE_MVP.md` no existe;** la auditoría fue reconstruida con evidencia
  de código y de base de datos.
- **Documentación desactualizada encontrada:** `frontend/docs/PROJECT_STRUCTURE.md`,
  `frontend/docs/API_INTEGRATION_GUIDE.md` y `AGENTE.md` aún describen el estado
  "100% mock" / "backend en blanco", que ya no es real. Recomendación: actualizarlas en
  la fase 3 (baja prioridad, no bloquea).

---

## Estado de ejecución

- ✅ **Fase 1 (Red y Entorno)** — EJECUTADA el 20/09/2026:
  - `frontend/lib/env.ts` creado con fail-fast en producción.
  - Los 7 archivos (`api-service`, `chatbot-service`, `dm-service`,
    `feedbackTicketsAdapter`, `foro-service`, `gamificacion-service`,
    `evaluacion-ia`) importan `API_URL` desde `@/lib/env`; ya no definen
    `BASE_URL`/`API_URL` localmente.
  - `backend/app/main.py` exige `CORS_ORIGINS` y `TRUSTED_HOSTS` (no `*`) cuando
    `APP_ENV=production|prod` (fail-fast al arranque).
  - `frontend/.env.example`, `backend/.env.example` y `backend/docker-compose.yml`
    actualizados con las nuevas variables.
- ✅ **Fase 3 (Limpieza de logs)** — EJECUTADA el 20/09/2026:
  - Frontend: eliminados `console.log` en `agenda-inteligente.tsx` (2), `calendar-grid.tsx` (1)
    y `console.error` en `learning-path.tsx` (1). `supabase.ts` deja de avisar en producción
    (guard `NODE_ENV !== 'production'`).
  - Backend: los 10 `print()` de `backend/app/routers/usuarios.py` migrados a
    `logger.{debug,info,warning,error}`.
- ✅ **Fase 2 (Limpieza de mocks)** — EJECUTADA el 20/09/2026:
  - `frontend/lib/mockData.ts` reducido a `RECURSOS_DATA` (fallback de
    `dashboard/recent-resources.tsx`); eliminados 8 exports muertos: `CAREERS`,
    `CURRICULUM_DATA`, `LEARNING_PATH_DATA`, `TIMELINE_DATA`, `AI_INSIGHTS_DATA`,
    `EXAM_BANK_DATA`, `DASHBOARD_STATS` y `ACHIEVEMENTS`.
  - Comentario de `constellation-grid.tsx` corregido (los códigos son decorativos).

*Documento de planificación generado para el despliegue del MVP.*