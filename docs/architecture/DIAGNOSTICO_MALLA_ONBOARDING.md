# Diagnóstico de Malla Curricular y Onboarding — Ingeniería Industrial 2020-2

**Fecha:** 2026-08-12
**Contexto:** Frente 1 — Modelado de Datos y Lógica de Prerrequisitos
**Origen de verdad:** Malla JSON de Ingeniería Industrial 2020-2 (59 cursos, 65 relaciones de prerrequisito)

---

## 1. Verificación de Integridad DB vs Malla de Referencia

### 1.1 Estado de la Base de Datos

| Métrica | Valor |
|---|---|
| Carrera `IND` (Ing. Industrial) | Existe, id=6 |
| Mallas para IND | 2 (`2020-2` id=16, `2026-2` id=15) |
| Cursos en malla 2020-2 | 64 |
| Prerrequisitos en DB | 56 |
| Cursos de referencia | 59 |
| Discrepancias detectadas | **34** |

### 1.2 Resultado: **NO COINCIDE** — 34 discrepancias

#### A. Cursos con nombre divergente (1 discrepancia raíz)

| Referencia | DB | Impacto |
|---|---|---|
| `Fisicoquímica y Operaciones Unitarias` | `Físico Química y Operaciones Unitarias` | Rompe 6 relaciones de prerrequisito |

**Acción requerida:** Renombrar el curso en DB a `Fisicoquímica y Operaciones Unitarias` (sin tilde en "Físico", "Química" junto). Esto corregirá automáticamente las 6 discrepancias derivadas.

#### B. Cursos extra en DB (no en referencia) — 6 cursos

| Curso | Ciclo | Tipo |
|---|---|---|
| `Físico Química y Operaciones Unitarias` | 4 | Duplicado por diferencia de nombre |
| `Electivo (Ciclo 6)` | 6 | Placeholder de electivo |
| `Electivo (Ciclo 7)` | 7 | Placeholder de electivo |
| `Electivos (Ciclo 8)` | 8 | Placeholder de electivo |
| `Electivos (Ciclo 9)` | 9 | Placeholder de electivo |
| `Electivo (Ciclo 10)` | 10 | Placeholder de electivo |

Los 5 electivos son placeholders — no existen en la malla real de referencia. Si representan espacios para cursos electivos reales, deberían modelarse de otra forma (ej. como cursos electivos concretos o como slots sin prerrequisitos).

#### C. Prerrequisitos faltantes en DB (13 relaciones)

| Curso | Prerrequisito Faltante |
|---|---|
| `Análisis de Procesos de Manufactura` | `Ingeniería del Trabajo II` |
| `Automatización y Control de Procesos` | `Electricidad y Electrónica Industrial` |
| `Control Estadístico de Procesos` | `Estadística y Probabilidades` |
| `Diseño y Evaluación de Proyectos` | `Innovación y Emprendimiento de Negocios` |
| `Ingeniería de Materiales` | `Física II` |
| `Ingeniería de Materiales` | `Diseño Asistido por Computador` |
| `Ingeniería de Procesos` | `Administración y Organización` |
| `Ingeniería del Producto` | `Procesos Industriales II` |
| `Mercadotecnia` | `Logística Empresarial` |
| `Metodología de la Investigación` | `Ética y Filosofía Política` |
| `Planeamiento y Gestión Estratégica` | `Contabilidad de Costos y Presupuestos` |
| `Planeamiento y Gestión Estratégica` | `Mercadotecnia` |
| `Realidad Nacional, Constitución y Derechos Humanos` | `Redacción y Comunicación` |

#### D. Prerrequisitos extra en DB (no en referencia) — 8 relaciones

| Curso | Prerrequisito Extra en DB |
|---|---|
| `Análisis de Procesos de Manufactura` | `Procesos Industriales II` |
| `Control Estadístico de Procesos` | `Investigación de Operaciones I` |
| `Ingeniería de Materiales` | `Físico Química y Operaciones Unitarias` (por nombre divergente) |
| `Ingeniería de Procesos` | `Ingeniería del Trabajo II` |
| `Maquinaria e Instrumentación Industrial` | `Electricidad y Electrónica Industrial` |
| `Mercadotecnia` | `Contabilidad de Costos y Presupuestos` |
| `Metodología de la Investigación` | `Realidad Nacional, Constitución y Derechos Humanos` |
| `Planeamiento y Gestión Estratégica` | `Planeamiento y Control de Operaciones` |
| `Procesos Industriales I` | `Físico Química y Operaciones Unitarias` (por nombre divergente) |
| `Realidad Nacional, Constitución y Derechos Humanos` | `Ética y Filosofía Política` |
| `Sociología` | *(falta `Realidad Nacional`)* |
| `Álgebra Lineal` | `Cálculo Diferencial` |

#### E. Cursos faltantes en DB

| Curso | Ciclo |
|---|---|
| `Fisicoquímica y Operaciones Unitarias` | 4 (existe con nombre divergente) |

> **Nota:** La discrepancia #22 (`Procesos Industriales I` → `Fisicoquímica y Operaciones Unitarias`) es falsa: el curso SÍ existe en DB pero con nombre `Físico Química y Operaciones Unitarias`. Al corregir el nombre, esta discrepancia desaparece.

### 1.3 Resumen de impacto

Tras corregir el nombre del curso `Físico Química y Operaciones Unitarias` → `Fisicoquímica y Operaciones Unitarias`, el número de discrepancias reales se reduce a:

| Tipo | Antes | Después de corrección de nombre |
|---|---|---|
| Cursos extra (electivos) | 6 | 5 |
| Prerrequisitos faltantes | 13 | 13 |
| Prerrequisitos extra | 11 | 8 |
| **Total real** | **34** | **26** |

---

## 2. Diagnóstico del Backend — Brechas de Lógica

### 2.1 Verdict: El backend YA usa el modelo nuevo

**Hallazgo positivo:** El código en producción usa exclusivamente el modelo `malla_curso_prerrequisitos`. Hay **cero referencias** a la tabla legacy `curso_prerrequisitos` en código productivo.

Archivos que usan el nuevo modelo:

| Archivo | Rol | Tablas consultadas |
|---|---|---|
| `backend/app/routers/onboarding.py` | Flujo de onboarding | `malla_cursos`, `malla_curso_prerrequisitos`, `progreso_cursos` |
| `backend/app/routers/cursos.py` | Gate de acceso a cursos | `malla_cursos`, `malla_curso_prerrequisitos`, `progreso_cursos` |
| `backend/app/routers/malla.py` | Visualización de malla | `malla_cursos`, `malla_curso_prerrequisitos`, `progreso_cursos` |
| `backend/app/routers/dashboard.py` | Dashboard y estadísticas | `malla_cursos`, `malla_curso_prerrequisitos`, `progreso_cursos`, `progreso_unidades` |
| `backend/app/core/prereqs.py` | Lógica pura de prerrequisitos | (sin DB, funciones puras) |
| `backend/app/core/avance.py` | Cálculo de avance | `malla_cursos`, `progreso_cursos` |
| `backend/app/core/diagnostico.py` | Recomendaciones | `progreso_cursos` |

### 2.2 Arquitectura actual de prerrequisitos

```
┌─────────────────────────────────────┐
│  app/core/prereqs.py (PURE)         │
│                                     │
│  build_prereq_map_from_malla()      │  Traduce malla_curso_id → curso_id
│  resolve_prereq_chain()    [BFS]    │  Prerrequisitos transitivos
│  direct_prereq_info()               │  Solo directos (para UI)
│  check_course_status()     ◄─────── │  MOTOR CENTRAL DE ESTADOS
└──────────────┬──────────────────────┘
               │ importado por TODOS los routers
               ▼
┌──────────────────────────────────────┐
│  onboarding.py / cursos.py / etc.   │
│                                      │
│  3 consultas separadas a Supabase:   │
│  1. malla_cursos (con join a cursos) │
│  2. malla_curso_prerrequisitos       │
│  3. progreso_cursos (por perfil_id)  │
│                                      │
│  Luego: procesamiento en Python      │
└──────────────────────────────────────┘
```

### 2.3 Análisis de `check_course_status()` — la función central

```python
def check_course_status(
    curso_id, db_status, completed_courses, prereq_map, cursos_dict
) -> Tuple[str, List[dict], bool]:
```

**Lógica de resolución de estado (líneas 145-157):**

| Estado en DB | Prerrequisitos | Resultado | Correcto? |
|---|---|---|---|
| `"completed"` | cualquiera | `"completed"` | ✅ Respeta estado persistido |
| `"in_progress"` | cualquiera | `"in_progress"` | ✅ Prioridad de BD |
| `None` (sin fila) | todos cumplidos | `"available"` | ✅ |
| `None` (sin fila) | falta alguno | `"locked"` | ✅ |

**La función es correcta.** Evalúa la cadena transitiva completa (no solo prerrequisitos directos) usando BFS. Esto es el comportamiento esperado: si A requiere B y B requiere C, entonces A requiere que C esté completado también.

### 2.4 Brechas identificadas

#### Brecha 1: Ineficiencia en consultas (3 round-trips por renderizado)

**Ubicación:** `backend/app/routers/onboarding.py`, líneas 277-316

El endpoint `GET /onboarding/cursos` hace **3 consultas separadas**:
1. `malla_cursos` (línea 277)
2. `malla_curso_prerrequisitos` (línea 304, dentro de `_cargar_prerrequisitos`)
3. `progreso_cursos` (línea 306)

**Impacto:** 3 round-trips HTTP + procesamiento en Python para cada carga de la pantalla de onboarding.

**Solución propuesta:** Crear una función RPC en Postgres que haga todo en una sola consulta (ver Sección 3).

#### Brecha 2: Duplicación de `_cargar_prerrequisitos`

**Ubicación:** 
- `backend/app/routers/onboarding.py`, línea 55
- `backend/app/routers/malla.py`, línea 73

Dos implementaciones casi idénticas con tipos de retorno diferentes (`Dict[int, List[int]]` vs `Dict[str, List[str]]`). Ambas replican lo que `build_prereq_map_from_malla()` en `app/core/prereqs.py` ya resuelve.

**Solución:** Consolidar en un solo llamado a `build_prereq_map_from_malla()`.

#### Brecha 3: Sin validación de prerrequisitos mutuos en inscripción simultánea

**Ubicación:** `backend/app/routers/onboarding.py`, líneas 661-670

El código valida que no haya prerrequisitos mutuos en el mismo batch de inscripción. Esto es correcto pero solo aplica durante el onboarding inicial. La actualización de ciclo (`PUT /api/perfil/cursos`, línea 461) debería tener la misma validación.

#### Brecha 4: Los electivos no tienen tratamiento especial

Los 5 electivos placeholder en la DB (`Electivo (Ciclo N)`) son cursos genéricos sin prerrequisitos ni créditos reales. Si un estudiante quiere inscribir un electivo real, no hay mecanismo para:
- Reemplazar el placeholder por un curso electivo concreto
- Validar que el electivo pertenece al plan
- Acumular créditos de electivos

---

## 3. Diseño de Query Optimizada para el Onboarding

### 3.1 Estrategia: Función RPC en PostgreSQL

La query óptima debe retornar, en **una sola llamada**, todos los cursos de la malla con su estado calculado. Esto elimina los 3 round-trips actuales.

### 3.2 SQL: Función `get_malla_onboarding`

```sql
CREATE OR REPLACE FUNCTION get_malla_onboarding(
    p_malla_id INTEGER,
    p_perfil_id UUID,
    p_ciclo_actual INTEGER DEFAULT 1
)
RETURNS TABLE (
    curso_id INTEGER,
    code VARCHAR,
    name VARCHAR,
    credits INTEGER,
    ciclo INTEGER,
    tipo VARCHAR,
    status VARCHAR,
    prerrequisito_ids INTEGER[],
    prerrequisitos_faltantes JSONB
)
LANGUAGE sql
STABLE
AS $$
    WITH
    -- 1. Cursos visibles de la malla (hasta el ciclo actual)
    cursos_malla AS (
        SELECT
            mc.id AS mc_id,
            mc.curso_id,
            mc.ciclo,
            mc.credits,
            mc.tipo,
            c.code,
            c.name
        FROM malla_cursos mc
        JOIN cursos c ON c.id = mc.curso_id
        WHERE mc.malla_id = p_malla_id
          AND mc.ciclo <= p_ciclo_actual
    ),

    -- 2. Prerrequisitos directos (traducidos a curso_id)
    prereqs_directos AS (
        SELECT
            mc_src.curso_id AS curso_id,
            mc_prq.curso_id AS prereq_curso_id
        FROM malla_curso_prerrequisitos mcp
        JOIN cursos_malla mc_src ON mc_src.mc_id = mcp.malla_curso_id
        JOIN cursos_malla mc_prq ON mc_prq.mc_id = mcp.prerrequisito_malla_curso_id
    ),

    -- 3. Prerrequisitos transitivos (recursive CTE)
    prereqs_transitivos AS (
        -- Base: prerrequisitos directos
        SELECT curso_id, prereq_curso_id, 1 AS depth
        FROM prereqs_directos

        UNION

        -- Recursivo: prerrequisitos de prerrequisitos
        SELECT pt.curso_id, pd.prereq_curso_id, pt.depth + 1
        FROM prereqs_transitivos pt
        JOIN prereqs_directos pd ON pd.curso_id = pt.prereq_curso_id
        WHERE pt.depth < 10  -- safety limit: max 10 niveles de profundidad
    ),

    -- 4. Progreso del estudiante (solo completed)
    progreso AS (
        SELECT curso_id
        FROM progreso_cursos
        WHERE perfil_id = p_perfil_id
          AND status = 'completed'
    ),

    -- 5. Evaluar estado de cada curso
    estado_curso AS (
        SELECT
            cm.curso_id,
            cm.code,
            cm.name,
            cm.credits,
            cm.ciclo,
            cm.tipo,
            CASE
                -- Ya completado
                WHEN pc.status = 'completed' THEN 'completed'
                -- Ya en progreso
                WHEN pc.status = 'in_progress' THEN 'in_progress'
                -- Sin prerrequisitos → disponible
                WHEN pt_all.prereq_curso_id IS NULL THEN 'available'
                -- Todos los prerrequisitos cumplidos → disponible
                WHEN bool_and(
                    pt_all.prereq_curso_id IS NULL
                    OR pg.curso_id IS NOT NULL
                ) THEN 'available'
                -- Falta al menos uno → bloqueado
                ELSE 'locked'
            END AS status,
            -- IDs de prerrequisitos directos
            COALESCE(
                array_agg(DISTINCT pd.prereq_curso_id)
                    FILTER (WHERE pd.prereq_curso_id IS NOT NULL),
                ARRAY[]::INTEGER[]
            ) AS prerrequisito_ids,
            -- Prerrequisitos faltantes como JSONB (para el frontend)
            COALESCE(
                jsonb_agg(
                    DISTINCT jsonb_build_object(
                        'id', cm_prq.curso_id,
                        'code', cm_prq.code,
                        'name', cm_prq.name
                    )
                ) FILTER (
                    WHERE pt_all.prereq_curso_id IS NOT NULL
                      AND pg.curso_id IS NULL
                ),
                '[]'::jsonb
            ) AS prerrequisitos_faltantes
        FROM cursos_malla cm
        -- Join con progreso para saber si ya está completed/in_progress
        LEFT JOIN progreso_cursos pc
            ON pc.perfil_id = p_perfil_id AND pc.curso_id = cm.curso_id
        -- Join con prerrequisitos transitivos
        LEFT JOIN prereqs_transitivos pt_all
            ON pt_all.curso_id = cm.curso_id
        -- Join con progreso para verificar cada prerrequisito
        LEFT JOIN progreso pg
            ON pg.curso_id = pt_all.prereq_curso_id
        -- Join para prerrequisitos directos (IDs)
        LEFT JOIN prereqs_directos pd
            ON pd.curso_id = cm.curso_id
        -- Join para nombres de prerrequisitos faltantes
        LEFT JOIN cursos_malla cm_prq
            ON cm_prq.curso_id = pt_all.prereq_curso_id
            AND pg.curso_id IS NULL
        GROUP BY
            cm.curso_id, cm.code, cm.name, cm.credits,
            cm.ciclo, cm.tipo, pc.status
    )

    SELECT * FROM estado_curso
    ORDER BY ciclo, name;
$$;
```

### 3.3 Uso desde el backend Python

```python
# Reemplaza las 3 consultas actuales + procesamiento Python con 1 sola llamada
@router.get("/onboarding/cursos", response_model=CursosPorCarreraResponse)
async def get_cursos_por_carrera(
    carrera_id: int = Query(...),
    ciclo_actual: int = Query(1),
    malla_id: Optional[int] = Query(None),
    user_data=Depends(get_current_user),
):
    user, token = user_data
    supabase = get_supabase(token)

    real_malla_id = _resolver_malla_id(supabase, carrera_id, malla_id)
    if not real_malla_id:
        return CursosPorCarreraResponse(carrera_id=carrera_id, cursos=[])

    # Una sola llamada RPC
    resp = supabase.rpc(
        "get_malla_onboarding",
        {
            "p_malla_id": real_malla_id,
            "p_perfil_id": str(user.id),
            "p_ciclo_actual": ciclo_actual,
        },
    ).execute()

    rows = resp.data or []
    cursos = [
        CursoPrereqItem(
            id=r["curso_id"],
            code=r["code"],
            name=r["name"],
            credits=r["credits"],
            ciclo=r["ciclo"],
            carrera_id=carrera_id,
            prerrequisito_ids=r["prerrequisito_ids"],
            status=r["status"],
            prerrequisitos_faltantes=[
                PrerrequisitoFaltante(
                    id=p["id"], code=p["code"], name=p["name"]
                )
                for p in (r["prerrequisitos_faltantes"] or [])
            ],
        )
        for r in rows
    ]

    return CursosPorCarreraResponse(carrera_id=carrera_id, cursos=cursos)
```

### 3.4 Comparativa de rendimiento

| Métrica | Actual (3 queries) | Optimizado (1 RPC) |
|---|---|---|
| Round-trips HTTP | 3 | 1 |
| Datos transferidos | ~150 filas total | ~60 filas (resultado final) |
| Procesamiento Python | BFS en Python (O(N*M)) | Recursive CTE en Postgres (O(N+M)) |
| Índices utilizados | Parcial | Todos (PK, FK indexes) |
| Mantenibilidad | Lógica duplicada en 2 routers | 1 función SQL, 1 call site |

---

## 4. Recomendaciones Priorizadas

### Inmediatas (afectan integridad de datos)

1. **Corregir nombre del curso:** `Físico Química y Operaciones Unitarias` → `Fisicoquímica y Operaciones Unitarias`
2. **Corregir 13 prerrequisitos faltantes** y **8 prerrequisitos extra** según tabla de referencia
3. **Evaluar electivos placeholder:** ¿son intencionales? Si no, eliminar de `malla_cursos`

### Corto plazo (mejora de rendimiento)

4. **Implementar `get_malla_onboarding` RPC** en Supabase y migrar `GET /onboarding/cursos`
5. **Consolidar `_cargar_prerrequisitos`** — eliminar duplicación usando `build_prereq_map_from_malla()`

### Mediano plazo (robustez)

6. **Agregar validación de prerrequisitos mutuos** en `PUT /api/perfil/cursos`
7. **Modelar electivos correctamente** con cursos reales o un mecanismo de slots

---

## 5. Script de Verificación

El script `scripts/verify_malla_industrial.py` realiza la comparación automática DB vs JSON de referencia. Para re-ejecutar:

```bash
python scripts/verify_malla_industrial.py
```
