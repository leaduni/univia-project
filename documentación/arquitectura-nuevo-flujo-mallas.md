# Arquitectura del Nuevo Flujo de Mallas Curriculares

> **Documento de arquitectura** — Auditoría de lectura del proyecto *Lead UNI / UNIVIA*.
> Ruta del deliverable: `univia-project/documentación/arquitectura-nuevo-flujo-mallas.md`
>
> **Fuentes consultadas (solo lectura):**
> - `documentacion/esquema-db-actual.md`
> - `backend/app/routers/onboarding.py`, `backend/app/routers/cursos.py`, `backend/app/routers/malla.py`, `backend/app/routers/dashboard.py`, `backend/app/routers/usuarios.py`
> - `backend/app/core/avance.py`, `backend/app/core/prereqs.py`, `backend/app/core/diagnostico.py`
> - `backend/app/schemas/onboarding.py`, `backend/app/schemas/malla.py`
> - `backend/app/main.py`
> - `frontend/lib/api-service.ts`, `frontend/types/onboarding.ts`, `frontend/types/malla.ts`
> - `frontend/components/onboarding/malla-step.tsx`, `frontend/app/malla/page.tsx`

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO DEL CAMBIO

### 1.1 El problema del modelo rígido

Históricamente, la aplicación modeló el plan de estudios asumiendo que un curso **pertenece a una carrera y trae consigo su ciclo y sus créditos de forma intrínseca**. Ese supuesto se materializaba en lecturas directas de la tabla `cursos` para obtener `ciclo` y `credits`, y en relaciones como `curso_carrera` y `curso_prerrequisitos`.

Este modelo tiene tres defectos estructurales:

1. **Un curso no "tiene" un ciclo ni créditos por naturaleza.** El mismo curso (p. ej. *Cálculo Diferencial*) puede tener distinto peso crediticio o ubicarse en un ciclo distinto según el plan de estudios de cada promoción. Al fijar `ciclo`/`credits` en `cursos` se hacía imposible soportar **varias versiones de un plan** para la misma carrera.
2. **No existía versionado de planes.** Toda la carrera compartía una única definición; no había manera de representar que una nueva generación ingresa con una malla actualizada mientras las anteriores siguen con la que les correspondía.
3. **Los prerrequisitos eran globales al curso**, no dependientes de la malla a la que pertenece. Un prerrequisito puede existir en una malla y no en otra.

### 1.2 El objetivo del cambio

Se migró a un **modelo flexible y versionable** compuesto por los siguientes conceptos:

- **`mallas`**: versiones de planes de estudio de una carrera. Cada una tiene un `nombre`, un `codigo_plan` y un flag `es_vigente` que indica cuál es la versión activa.
- **`malla_cursos`**: la línea intermedia (JOIN) que **asocia un curso a una malla** y que es el **único lugar autorizado** donde se define `ciclo` y `credits` de ese curso *para esa malla*.
- **`malla_curso_prerrequisitos`**: prerrequisitos **escalados a la malla**, referenciando filas de `malla_cursos` (no cursos sueltos).
- **`perfiles.malla_id`**: el vínculo que ata a cada estudiante a una versión concreta de plan.

Gracias a esto, el sistema puede:
- Tener **varias mallas por carrera** y elegir la vigente (`es_vigente = true`).
- Asignar a cada estudiante una **malla específica** en lugar de una carrera genérica.
- Reconstruir el avance curricular leyendo `ciclo` y `credits` desde `malla_cursos`, no desde `cursos`.

> **Regla de oro de la migración:** `cursos` dejó de ser la fuente de verdad del ciclo y los créditos. Toda lectura de esas dos magnitudes debe pasar por `malla_cursos`.

---

## 2. DESGLOSE DEL ESQUEMA DE BASE DE DATOS

A continuación se documenta cada tabla del flujo, con sus claves y su responsabilidad. Los datos provienen de `documentacion/esquema-db-actual.md`.

### 2.1 Tabla `cursos`

Catálogo **global y compartido** de materias. Contiene solo la información que es cierta para el curso en cualquier contexto.

| Columna | Tipo | Clave | Notas |
| --- | --- | --- | --- |
| `id` | integer | **PK** | `nextval('cursos_id_seq1')` |
| `name` | varchar | | Nombre del curso (`NO NULL`) |
| `code` | varchar | | Código del curso (`NO NULL`) |
| `description` | text | | Descripción (opcional) |
| `created_at` | timestamptz | | `now()` |

**Responsabilidad:** definir qué es el curso (código, nombre, descripción). **NO posee `ciclo` ni `credits`.** Es la pieza reutilizable que aparece en cero, una o muchas mallas.

### 2.2 Tabla `mallas`

Versiones de planes de estudio de una carrera.

| Columna | Tipo | Clave | Notas |
| --- | --- | --- | --- |
| `id` | integer | **PK** | `nextval('mallas_id_seq')` |
| `carrera_id` | integer | **FK → `carreras.id`** | `NO NULL` (`mallas_carrera_id_fkey`) |
| `nombre` | varchar | | `NO NULL` |
| `codigo_plan` | varchar | | `NO NULL` |
| `es_vigente` | boolean | | Default `true`; indica la versión activa |
| `created_at` | timestamptz | | `timezone('utc', now())` |

**Responsabilidad:** representar una versión concreta de plan para una carrera. El flag `es_vigente` permite que existan varias versiones históricas y **varias activas a la vez**: una carrera puede tener 2+ mallas vigentes simultáneamente (ej. Plan 2021 y Plan 2026). La asignación de cada estudiante a una malla se hace mediante `perfiles.malla_id`, nunca asumiendo una única activa por carrera.

### 2.3 Tabla `malla_cursos`

**Tabla clave del modelo.** Es la relación `malla ↔ curso`, y el **único lugar donde se define `ciclo` y `credits`**.

| Columna | Tipo | Clave | Notas |
| --- | --- | --- | --- |
| `id` | integer | **PK** | `nextval('malla_cursos_id_seq')` |
| `malla_id` | integer | **FK → `mallas.id`** | `NO NULL` (`malla_cursos_malla_id_fkey`) |
| `curso_id` | integer | **FK → `cursos.id`** | `NO NULL` (`malla_cursos_curso_id_fkey`) |
| `ciclo` | integer | | `NO NULL` — ciclo **dentro de esta malla** |
| `credits` | integer | | `NO NULL` — créditos **para esta malla** |
| `tipo` | varchar | | Default `'OBLIGATORIO'` |
| `created_at` | timestamptz | | `timezone('utc', now())` |

**Responsabilidad:** configurar cómo un curso se inserta en una malla (en qué ciclo queda y cuánto pesa). El mismo `curso_id` puede aparecer en varias filas de `malla_cursos` con distinto `ciclo`/`credits`, cada una para una malla distinta. **Toda consulta de ciclo o créditos debe leer aquí.**

### 2.4 Tabla `malla_curso_prerrequisitos`

Prerrequisitos **resueltos a nivel de malla**. Referencia filas de `malla_cursos`, no cursos sueltos.

| Columna | Tipo | Clave | Notas |
| --- | --- | --- | --- |
| `id` | integer | **PK** | `nextval('malla_curso_prerrequisitos_id_seq')` |
| `malla_curso_id` | integer | **FK → `malla_cursos.id`** | `NO NULL` (`..._malla_curso_id_fkey`) |
| `prerrequisito_malla_curso_id` | integer | **FK → `malla_cursos.id`** | `NO NULL` (`..._prerrequisito_malla_curso_id_fkey`) |
| `created_at` | timestamptz | | `timezone('utc', now())` |

**Responsabilidad:** modelar que el curso-instancia `malla_curso_id` exige haber aprobado el curso-instancia `prerrequisito_malla_curso_id`. Es una relación **auto-referencial** sobre `malla_cursos`. Permite que el mismo curso tenga prerrequisitos distintos en mallas distintas.

### 2.5 Tabla `perfiles`

Perfil de cada usuario/estudiante. Guarda la afiliación académica, incluida la malla asignada.

| Columna | Tipo | Clave | Notas |
| --- | --- | --- | --- |
| `id` | uuid | **PK** | Atada al auth user |
| `email` | varchar | | `NO NULL` |
| `nombre_completo` | varchar | | |
| `carrera_id` | integer | **FK → `carreras.id`** | (`perfiles_carrera_id_fkey`) |
| `ciclo_actual` | integer | | Default `1` |
| `onboarding_completado` | boolean | | Default `false` |
| `avatar_url` | text | | |
| `created_at` / `updated_at` | timestamptz | | `now()` |
| `codigo_estudiante` | varchar | | |
| `malla_id` | integer | **FK → `mallas.id`** | **`NO NULL`** (`perfiles_malla_id_fkey`) |

**Responsabilidad:** ser el "contrato" académico del estudiante. El campo `malla_id` (FK a `mallas`) es el ancla del nuevo flujo: **debe quedar poblado al completar el onboarding** y nunca debe ser nulo para un estudiante activo.

### 2.6 Mapa de relaciones (resumen FK)

```
mallas.carrera_id                → carreras.id
malla_cursos.malla_id            → mallas.id
malla_cursos.curso_id            → cursos.id
malla_curso_prerrequisitos.malla_curso_id               → malla_cursos.id  (auto)
malla_curso_prerrequisitos.prerrequisito_malla_curso_id → malla_cursos.id  (auto)
perfiles.carrera_id  → carreras.id
perfiles.malla_id    → mallas.id
```

---

## 3. INVENTARIO DE ARCHIVOS INTERVENIDOS Y AFECTADOS

### 3.1 Backend — Routers (controladores HTTP)

| Ruta exacta | Rol en el flujo |
| --- | --- |
| `backend/app/routers/onboarding.py` | **Núcleo del onboarding.** Contiene `_resolver_malla_id()` (resuelve la malla vigente), `GET /onboarding/data`, `GET /onboarding/mallas`, `GET /onboarding/cursos`, `GET /onboarding/resumen`, `PUT /perfil/cursos` y `POST /onboarding/complete` (persiste `perfiles.malla_id`). |
| `backend/app/routers/malla.py` | **Consulta del plan de estudios.** `GET /malla/` reconstruye los ciclos (JOIN `malla_cursos` → `cursos`) y `GET /malla/avance` devuelve el avance oficial por créditos. |
| `backend/app/routers/cursos.py` | **Acceso a cursos y candados.** `_verificar_acceso_curso()` evalúa prerrequisitos sobre `malla_curso_prerrequisitos` antes de permitir abrir un curso; `POST /cursos/{id}/completar` marca aprobaciones en cadena. |
| `backend/app/routers/dashboard.py` | Dashboard y diagnóstico. Resuelve la malla del perfil (`_resolver_malla_id`), calcula stats sobre `malla_cursos` y genera el test de nivel (`/dashboard/test-nivel`) con prerrequisitos de la malla. |
| `backend/app/routers/usuarios.py` | Registro, login y perfil. Incluye el fallback determinista de malla (plan más antiguo con `es_vigente = true`) y el endpoint `PATCH /usuarios/me/malla` (cambio de plan desde el perfil). |
| `backend/app/main.py` | Registra los routers bajo el prefijo `"/api"` (malla, usuarios, onboarding, dashboard, cursos, etc.). |

### 3.2 Backend — Capa de dominio / lógica (core)

| Ruta exacta | Rol en el flujo |
| --- | --- |
| `backend/app/core/avance.py` | **Fuente única del avance (RF-07).** `cargar_avance()` lee `malla_cursos` (curso_id + credits) y `progreso_cursos`; `calcular_avance()` y `promedio_ponderado()` son funciones puras. |
| `backend/app/core/prereqs.py` | **Motor de prerrequisitos.** `build_prereq_map_from_malla()` traduce `malla_curso_prerrequisitos` a un mapa `curso_id → [prereq_ids]`; `resolve_prereq_chain()` calcula la cadena transitiva (BFS); `check_course_status()` y `direct_prereq_info()` determinan estado y candados. |
| `backend/app/core/diagnostico.py` | Genera el diagnóstico usando el mapa de prerrequisitos y el avance de la malla. |

### 3.3 Backend — Schemas (Pydantic)

| Ruta exacta | Rol en el flujo |
| --- | --- |
| `backend/app/schemas/onboarding.py` | Tipos de request/response del wizard: `OnboardingCompleteRequest` (incluye `malla_id` opcional), `MallaItem`, `CursoPrereqItem`, `CursosPorCarreraResponse`, además de restricciones (`MAX_CURSOS_INSCRITOS`, `CICLO_POR_DEFECTO`). |
| `backend/app/schemas/malla.py` | Tipos de la malla: `CicloDetail`, `CourseDetail`, `StatusCurso`, `PrerrequisitoInfo`, `ResumenCiclo`. |

### 3.4 Frontend — Lógica y tipos

| Ruta exacta | Rol en el flujo |
| --- | --- |
| `frontend/lib/api-service.ts` | Cliente HTTP. Expone `getOnboardingData()`, `getMallasPorCarrera()` (`GET /onboarding/mallas`), `completeOnboarding()` (`POST /onboarding/complete`), `getMalla()`, `getAvanceCarrera()` y `cambiarMalla()` (`PATCH /usuarios/me/malla`). |
| `frontend/types/onboarding.ts` | Tipos espejo del backend: `OnboardingData` (con `malla_id?`), `MallaItem`, `Carrera`, `OnboardingDataResponse`. |
| `frontend/types/malla.ts` | Tipos de la malla/avance: `CicloDetail`, `AvanceCarrera`. |
| `frontend/components/onboarding/malla-step.tsx` | **Paso "Plan de Estudios" del wizard.** Carga las mallas de la carrera y aplica la selección determinista: preselecciona si hay **1 sola activa** y obliga a elegir manualmente si hay **2+ activas**. Emite `malla_id` al continuar. |
| `frontend/app/perfil/page.tsx` | Vista de perfil: muestra el plan de estudios asignado (`perfiles.malla_id`) y ofrece "Cambiar Plan de Estudios" (Sheet con advertencia + `PATCH /usuarios/me/malla`). |
| `frontend/app/malla/page.tsx` | Página "Mi malla curricular". Pide en paralelo `getMalla()` y `getAvanceCarrera()` para renderizar el grafo. |

---

## 4. EXPLICACIÓN DETALLADA DEL NUEVO FLUJO DE DATOS

### 4.1 FLUJO 1 — Onboarding / Registro del estudiante (asignación de `malla_id`)

**Objetivo:** al cerrar el registro, el estudiante queda atado a una versión concreta de plan (`perfiles.malla_id`).

1. **Carga del catálogo** — `GET /api/onboarding/data` (`onboarding.py`) devuelve carreras y el rango de ciclos. El frontend muestra el wizard.
2. **Listado de mallas** — `GET /api/onboarding/mallas?carrera_id=X` (`onboarding.py`) consulta:
   ```
   mallas WHERE carrera_id = X ORDER BY es_vigente DESC
   ```
   El componente `malla-step.tsx` consume esta lista y aplica la **selección determinista**: si la carrera tiene **una sola** malla activa (`es_vigente = true`) la preselecciona automáticamente; si tiene **2 o más activas** (ej. Plan 2021 y Plan 2026) **no preselecciona ninguna**: el estudiante debe elegir su plan manualmente (todas se muestran con la etiqueta "Vigente").
3. **Resolución de la malla** — En el backend, `_resolver_malla_id(supabase, carrera_id, malla_id)`:
   - Si el cliente envió `malla_id`, lo usa tal cual.
   - Si no, busca la malla activa con **fallback determinista** (plan más antiguo si hay varias vigentes):
     ```
     mallas WHERE carrera_id = X AND es_vigente = true ORDER BY id LIMIT 1
     ```
   Este patrón es **idempotente** y aparece también en `cursos.py`, `dashboard.py`, `usuarios.py` y `malla.py` como *fallback* de migración para perfiles legacy sin `malla_id`. **Nunca usa `maybe_single()` sobre `es_vigente = true`**: con 2+ mallas activas esa consulta lanza excepción en PostgREST.
4. **Validaciones** — `POST /api/onboarding/complete` (`OnboardingCompleteRequest` con `carrera_id`, `malla_id?`, `ciclo_actual`, `cursos_inscritos`):
   - Verifica perfil mínimo, carrera existente y ciclo dentro de la duración.
   - **Exige `malla_id`**: si no se resuelve ninguna malla activa devuelve 400 — *"No se encontró una malla curricular activa para esta carrera."*
   - Carga los cursos de la malla (`malla_cursos` JOIN `cursos`) y valida que los inscritos pertenezcan a esa carrera.
   - Evalúa prerrequisitos (ver Flujo 3) y rechaza matrícula simultánea con un prerrequisito.
5. **Persistencia** — Actualiza el perfil:
   ```
   perfiles SET carrera_id, malla_id, ciclo_actual,
              onboarding_completado = true WHERE id = user.id
   ```
   **Aquí es donde `perfiles.malla_id` queda fijado** y deja de ser nulo.

### 4.2 FLUJO 2 — Consulta del Plan de Estudios (reconstrucción del avance)

**Objetivo:** reconstruir la malla con ciclo y créditos correctos para la malla del estudiante.

Los endpoints `GET /api/malla/` (`malla.py`) y `GET /api/malla/avance` reconstruyen el plan **a partir del `malla_id` del perfil**:

1. `_obtener_malla_del_perfil()` lee `perfiles.carrera_id, malla_id` (con fallback a la malla vigente). Si no hay carrera ni malla → 400 (no se confunde con "sin datos").
2. **JOIN lógico** de cuatro tablas:
   ```
   perfiles ──malla_id──▶ mallas ──malla_id──▶ malla_cursos ──curso_id──▶ cursos
   ```
   Implementado en Supabase como una sola consulta con *embedding* de relaciones:
   ```
   malla_cursos SELECT id, curso_id, ciclo, credits, tipo,
                       cursos(code, name, description)
                 WHERE malla_id = {malla_id} ORDER BY ciclo
   ```
   `cursos(...)` es el recurso embebido (el JOIN a `cursos`). De `malla_cursos` se leen `ciclo` y `credits`; de `cursos` solo `code`, `name`, `description`.
3. **Armado de ciclos** — el router agrupa por `ciclo` y construye `CicloDetail` con `credits` por ciclo, `ResumenCiclo` y `CourseDetail[]`.
4. **Avance oficial (RF-07)** — `cargar_avance()` (`avance.py`) hace dos lecturas:
   - `malla_cursos` → `{curso_id: credits}` (catálogo)
   - `progreso_cursos` → `{curso_id: status}`
   Y `calcular_avance()` mide **por créditos del plan**, no por cantidad de cursos. `promedio_ponderado()` pondera por créditos.
5. **Frontend** — `frontend/app/malla/page.tsx` pide `getMalla()` y `getAvanceCarrera()` en paralelo y entrega ambos a `MallaGraph`.

### 4.3 FLUJO 3 — Evaluación de Prerrequisitos y Candados

**Objetivo:** saber si un curso está disponible, bloqueado, en curso o aprobado.

1. **Lectura de prerrequisitos escalados a la malla** — tomando las filas de `malla_cursos` ya cargadas:
   ```
   malla_curso_prerrequisitos
     WHERE malla_curso_id IN (mc_ids)
   ```
   Devuelve pares `(malla_curso_id, prerrequisito_malla_curso_id)`.

2. **Traducción a mapa por curso** — `build_prereq_map_from_malla(malla_cursos, malla_prereqs, use_curso_id=True)` convierte los id de `malla_cursos` a `curso_id`:
   ```
   { curso_id: [prereq_curso_ids, ...] }
   ```
   (existe también la variante `use_curso_id=False` para operar con `malla_curso_id`).

3. **Cadena transitiva** — `resolve_prereq_chain(curso_id, prereq_map)` resuelve por **BFS** todos los prerrequisitos directos e indirectos (A→B→C ⇒ la cadena de A es [B, C]).

4. **Determinación de estado** — `check_course_status()` devuelve:
   - `completed` si `progreso_cursos.status == completed` (respeta siempre).
   - `in_progress` si está en curso (prioridad DB).
   - `available` si toda la cadena de prerrequisitos está aprobada.
   - `locked` si falta aprobar al menos un prerrequisito de la cadena.

5. **Candado de acceso a un curso** — `_verificar_acceso_curso()` (`cursos.py`):
   - Si el curso ya está `in_progress`/`completed` → acceso inmediato (short-circuit).
   - Si no, resuelve la malla del perfil, comprueba que el curso pertenezca a esa malla (404 si no) y evalúa prerrequisitos: si la cadena no está cumplida → **HTTP 403**.
   - `POST /cursos/{id}/completar` marca como `completed` el curso **y toda su cadena** de prerrequisitos en `progreso_cursos`.

6. **Validación en la matrícula (onboarding y cambio de ciclo)** — se impide:
   - Inscribir un curso sin aprobar prerrequisitos (400 con los faltantes nombrados).
   - Matricularse simultáneamente en un curso y su prerrequisito.

### 4.4 FLUJO 4 — Cambio de Plan de Estudios desde el Perfil

**Objetivo:** permitir que un estudiante migre de plan (p. ej. de "Plan 2021" a "Plan 2026") desde la vista de perfil.

1. **Vista** — `frontend/app/perfil/page.tsx` muestra el plan asignado (`perfiles.malla_id`) y un botón "Cambiar Plan de Estudios" que abre un `Sheet` con la advertencia: *"Al cambiar de plan, tu avance y progreso de cursos se reajustará para la nueva malla."*
2. **Endpoint** — `PATCH /api/usuarios/me/malla` (`usuarios.py`) recibe `{ malla_id }`, valida que la malla **pertenezca a la carrera** del estudiante (`mallas.id = malla_id AND mallas.carrera_id = perfiles.carrera_id`) y actualiza `perfiles.malla_id`. **Solo reasigna el plan**; no toca `progreso_cursos`.
3. **Re-selección de cursos** — el frontend redirige a `/onboarding` para que el estudiante vuelva a declarar los cursos aprobados en la nueva malla (flujo existente `POST /onboarding/complete`).

---

## 5. CONSIDERACIONES Y PUNTOS CRÍTICOS PARA EL EQUIPO (GUARDRAILS)

### 5.1 Lo que NO se debe hacer

- **Nunca leer `ciclo` o `credits` de la tabla `cursos`.** Esa tabla no los tiene; son atributos de `malla_cursos`. Cualquier consulta que los pida debe hacer el JOIN contra `malla_cursos` filtrado por el `malla_id` del perfil.
- **No usar `malla_curso_prerrequisitos` como si fuera `curso_prerrequisitos`.** Sus columnas son `malla_curso_id` y `prerrequisito_malla_curso_id` (id de instancias de malla), **no** `curso_id`/`prerrequisito_id`. Hay que traducirlos con `build_prereq_map_from_malla()`.
- **No dar por hecho que `perfiles.malla_id` está poblado.** Existen rutas con fallback para perfiles legacy. **Ese fallback nunca debe usar `maybe_single()` sobre `es_vigente = true`**: si una carrera tiene 2+ mallas activas, la consulta lanza excepción en PostgREST. Usar siempre el ordenamiento determinista (`ORDER BY id LIMIT 1`, plan más antiguo). El estado final correcto es tener `malla_id` en el perfil.
- **No mezclar tipos de ID (int vs str) en los mapas** de avance/prerrequisitos. `calcular_avance()` advierte explícitamente que mezclar `int` y `str` devuelve 0% en silencio. Usar un solo tipo por llamada (`use_curso_id`).
- **No lanzar varias llamadas Supabase en paralelo sobre la misma instancia** en el dashboard (docstring de `_run`) — el cliente HTTP/2 se corrompe (`ConnectionTerminated`). Las lecturas van despachadas una a una vía `asyncio.to_thread`.

### 5.2 Requisitos de integridad

- **`perfiles.malla_id` debe quedar no-nulo al finalizar el onboarding.** `POST /onboarding/complete` lo exige con un 400 si no se resuelve malla activa. No debe marcarse `onboarding_completado = true` sin `malla_id`.
- **Una carrera PUEDE tener 2+ mallas con `es_vigente = true` a la vez** (ej. Plan 2021 y Plan 2026). No existe ni debe existir un constraint de unicidad sobre `es_vigente` por carrera. La malla de cada estudiante se define por `perfiles.malla_id`; el fallback por carrera es solo migración y debe ser determinista (`ORDER BY id LIMIT 1`).
- **Cada `malla_cursos.ciclo`/`credits` debe definirse explícitamente** (`NO NULL`). Un curso con `ciclo IS NULL` se detecta en `malla.py` y se omite con `logger.warning` del grafo.
- **Los prerrequisitos siempre deben apuntar a cursos presentes en la misma malla**; de lo contrario `build_prereq_map_from_malla` los descarta silenciosamente al no encontrar la llave en `mc_id_to_curso_id`.
- **Consistencia de claves de `progreso_cursos`**: el avance cruza `progreso_cursos.curso_id` contra el catálogo de la malla. Un progreso de una malla/carrera anterior queda huérfano y no cuenta (se registra warning), no se elimina.

### 5.3 Convenciones de nombrado

- Campos JSON del backend → camelCase en el frontend (p. ej. `creditosInscritos`), espejo de los schemas Pydantic.
- Tipos frontend en `frontend/types/onboarding.ts` y `frontend/types/malla.ts` son **espejo** de `backend/app/schemas/*.py`: si cambia un campo en el backend, debe reflejarse en el frontend.
- Antes de tocar SQL/modelos/endpoints, consultar **`documentacion/esquema-db-actual.md`** (regla en `opencode.json`) para no inventar tablas ni columnas.

---

*Fin del documento.*