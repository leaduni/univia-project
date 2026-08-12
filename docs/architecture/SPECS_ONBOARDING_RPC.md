# SPECS — Optimización de Onboarding vía RPC

**Versión:** 1.0
**Fecha:** 2026-08-12
**Estado:** Draft — Fase de Especificación (SDD)
**Contexto:** Frente de optimización — reducción de latencia en pantalla de Onboarding

---

## 1. Objetivo de Negocio

Reducir la latencia de la pantalla de selección de cursos en el Onboarding (`GET /onboarding/cursos`) de **3 round-trips HTTP + procesamiento BFS en Python** a **1 sola llamada RPC en PostgreSQL**, centralizando la lógica de prerrequisitos en la capa de datos y eliminando código duplicado en la capa de aplicación.

### Métricas objetivo

| Métrica | Actual | Objetivo |
|---|---|---|
| Round-trips HTTP por carga | 3 | 1 |
| Llamadas a Supabase | 3 (`malla_cursos`, `malla_curso_prerrequisitos`, `progreso_cursos`) | 1 RPC |
| Procesamiento en Python | BFS transitivo O(N*M) | 0 (CTE recursivo en PostgreSQL) |
| Código duplicado (`_cargar_prerrequisitos`) | 2 routers | 0 (eliminado) |

---

## 2. Restricciones Técnicas

### 2.1 Base de Datos

- **Función RPC estrictamente de lectura:** `STABLE` (no `IMMUTABLE` porque consulta datos que cambian entre transacciones).
- **Sin side-effects:** La función no modifica tablas, no escribe logs, no invoca otras funciones con escritura.
- **Idempotente:** Misma entrada produce misma salida dentro de la misma transacción.
- **Nombre:** `get_malla_onboarding(p_malla_id INTEGER, p_perfil_id UUID, p_ciclo_actual INTEGER DEFAULT 1)`
- **Schema:** `public` (accesible vía `supabase.rpc()`)

### 2.2 Backend

- **Compatibilidad estricta con el Frontend:** El contrato de respuesta del endpoint `GET /onboarding/cursos` **no debe cambiar**. El response model `CursosPorCarreraResponse` y sus campos se mantienen idénticos.
- **Principio de Arquitectura Hexagonal:** La llamada RPC es un **detalle de infraestructura**. El dominio (`app/core/prereqs.py`) no debe conocer Supabase ni PostgreSQL.
- **Eliminación de código muerto:** Las funciones `_cargar_prerrequisitos` en `onboarding.py` y `malla.py` deben eliminarse. `build_prereq_map_from_malla()` en `app/core/prereqs.py` queda como utilidad pura para otros consumidores.
- **Manejo de errores:** Si la RPC falla (timeout, error de Postgres, tabla inexistente), el endpoint debe retornar `HTTP 502` con mensaje descriptivo, no un 500 genérico.

### 2.3 Testing

- **TDD estricto:** Las pruebas se escriben ANTES de la implementación y deben fallar en rojo.
- **Mock de infraestructura:** Las pruebas unitarias mockean `supabase.rpc()`, no tocan la base de datos real.
- **Cobertura mínima:** 4 casos de prueba (ver Sección 4).

---

## 3. Contrato de Integración (Interfaces)

### 3.1 Puerto de Dominio (Service/UseCase)

```python
# app/core/onboarding_service.py (NUEVO)

def build_onboarding_courses(
    rpc_result: list[dict],
    carrera_id: int,
) -> list[CursoPrereqItem]:
    """
    Adaptador puro: traduce la respuesta JSON de la RPC al modelo de dominio.
    
    Args:
        rpc_result: Lista de diccionarios retornada por get_malla_onboarding().
        carrera_id: ID de la carrera para completar el modelo.
    
    Returns:
        Lista de CursoPrereqItem lista para serializar al frontend.
    
    Raises:
        ValueError: Si la RPC retorna una estructura inválida.
    """
```

### 3.2 Adaptador de Infraestructura (RPC Call)

```python
# En el router (onboarding.py / malla.py)

resp = supabase.rpc(
    "get_malla_onboarding",
    {
        "p_malla_id": real_malla_id,
        "p_perfil_id": str(user.id),
        "p_ciclo_actual": ciclo_actual,
    },
).execute()
```

### 3.3 Input (Parámetros de la RPC)

| Parámetro | Tipo PostgreSQL | Tipo Python | Descripción |
|---|---|---|---|
| `p_malla_id` | `INTEGER` | `int` | ID de la malla (`mallas.id`) |
| `p_perfil_id` | `UUID` | `str` (UUID) | ID del perfil del estudiante |
| `p_ciclo_actual` | `INTEGER` | `int` | Ciclo actual (default 1). Filtra cursos `ciclo <= p_ciclo_actual` |

### 3.4 Output (JSON — una fila por curso visible)

```json
[
  {
    "curso_id": 42,
    "code": "FB101",
    "name": "Física I",
    "credits": 4,
    "ciclo": 3,
    "tipo": "OBLIGATORIO",
    "status": "locked",
    "prerrequisito_ids": [15, 28],
    "prerrequisitos_faltantes": [
      {"id": 28, "code": "MA115", "name": "Cálculo Integral"}
    ]
  }
]
```

| Campo | Tipo SQL | Descripción |
|---|---|---|
| `curso_id` | `INTEGER` | ID del curso en `cursos.id` |
| `code` | `VARCHAR` | Código del curso (ej. `FB101`) |
| `name` | `VARCHAR` | Nombre del curso |
| `credits` | `INTEGER` | Créditos del curso en esta malla |
| `ciclo` | `INTEGER` | Ciclo al que pertenece |
| `tipo` | `VARCHAR` | Tipo (`OBLIGATORIO`, `ELECTIVO`, etc.) |
| `status` | `VARCHAR` | `completed`, `in_progress`, `available`, `locked` |
| `prerrequisito_ids` | `INTEGER[]` | Array de `curso_id` de prerrequisitos directos |
| `prerrequisitos_faltantes` | `JSONB` | Array de `{id, code, name}` de prerrequisitos no completados |

### 3.5 Reglas de Resolución de Status (lógica interna de la RPC)

| Estado en `progreso_cursos` | Prerrequisitos transitivos | Resultado |
|---|---|---|
| `completed` | cualquiera | `completed` |
| `in_progress` | cualquiera | `in_progress` |
| Sin fila (`NULL`) | Todos cumplidos | `available` |
| Sin fila (`NULL`) | Falta ≥1 | `locked` |

> **Nota:** Esta lógica replica exactamente `check_course_status()` de `app/core/prereqs.py`. La RPC es una implementación alternativa en SQL del mismo algoritmo. No se modifica `check_course_status()` porque otros routers (`malla.py`, `cursos.py`) la siguen usando.

---

## 4. Casos Límite (Edge Cases)

### EC-1: Alumno nuevo — cero progreso

**Condición:** `progreso_cursos` no tiene filas para `p_perfil_id`.
**Comportamiento esperado:** Todos los cursos de `ciclo 1` retornan `status: "available"`. Cursos de ciclos superiores no se incluyen (filtrados por `p_ciclo_actual = 1`).

### EC-2: Alumno con cursos aprobados fuera de la malla

**Condición:** `progreso_cursos` tiene filas `completed` para cursos que no están en `malla_cursos` de esta malla.
**Comportamiento esperado:** Esos cursos se ignoran. No afectan el cálculo de prerrequisitos de esta malla. El join es sobre `malla_cursos` de esta malla exclusivamente.

### EC-3: Curso sin prerrequisitos

**Condición:** El curso no tiene filas en `malla_curso_prerrequisitos`.
**Comportamiento esperado:** 
- Si el estudiante no tiene progreso → `available`
- Si el estudiante lo completó → `completed`
- `prerrequisito_ids` retorna array vacío `[]`
- `prerrequisitos_faltantes` retorna array vacío `[]`

### EC-4: Cadena transitiva de prerrequisitos

**Condición:** Curso A requiere B, B requiere C. El estudiante completó B pero no C.
**Comportamiento esperado:** Curso A debe aparecer como `locked` porque la cadena transitiva no está completa. `prerrequisitos_faltantes` incluye C.

### EC-5: RPC falla (error de infraestructura)

**Condición:** Timeout, error de Postgres, o tabla inexistente.
**Comportamiento esperado:** El endpoint retorna `HTTP 502 Bad Gateway` con mensaje: `"El servicio de validación de prerrequisitos no está disponible. Intenta de nuevo en unos minutos."`. No se expone el error interno de PostgreSQL al frontend.

### EC-6: Malla sin cursos

**Condición:** `malla_id` existe pero `malla_cursos` no tiene filas para ese `malla_id` (o todas están en ciclos > `p_ciclo_actual`).
**Comportamiento esperado:** Array vacío `[]`. No es error.

### EC-7: Perfil sin malla asignada

**Condición:** `perfiles.malla_id IS NULL` (estudiante no completó onboarding).
**Comportamiento esperado:** El router usa `_resolver_malla_id()` para obtener la malla vigente de la carrera. Si no hay malla vigente, retorna array vacío.

---

## 5. Plan de Eliminación de Código Muerto

| Archivo | Qué se elimina | Por qué |
|---|---|---|
| `backend/app/routers/onboarding.py` | `_cargar_prerrequisitos()` (líneas 55-84) | Reemplazada por RPC |
| `backend/app/routers/malla.py` | `_cargar_prerrequisitos()` (líneas 73-100) | Reemplazada por RPC |
| `backend/app/routers/onboarding.py` | Lógica BFS manual (líneas 301-340) | Reemplazada por `build_onboarding_courses()` |

| Archivo | Qué se conserva | Por qué |
|---|---|---|
| `backend/app/core/prereqs.py` | Todo el módulo | `malla.py`, `cursos.py`, `dashboard.py` lo siguen usando |
| `backend/app/routers/onboarding.py` | `_resolver_malla_id()`, resto de endpoints | Solo se toca `GET /onboarding/cursos` |

---

## 6. Diagrama de Flujo (Arquitectura Hexagonal)

```
┌──────────────────────────────────────────────────────────┐
│  FRONTEND                                                │
│  Espera: CursosPorCarreraResponse (sin cambios)          │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP GET /onboarding/cursos
                       ▼
┌──────────────────────────────────────────────────────────┐
│  ADAPTADOR PRIMARIO (Router)                             │
│  onboarding.py :: get_cursos_por_carrera()               │
│                                                          │
│  1. Resuelve malla_id (_resolver_malla_id)               │
│  2. Llama al PUERTO:                                     │
│     supabase.rpc("get_malla_onboarding", {...})          │
│  3. Adapta respuesta con build_onboarding_courses()      │
│  4. Retorna CursosPorCarreraResponse                     │
└──────────────────────┬───────────────────────────────────┘
                       │ RPC call (infraestructura)
                       ▼
┌──────────────────────────────────────────────────────────┐
│  ADAPTADOR SECUNDARIO (PostgreSQL)                       │
│  get_malla_onboarding(p_malla_id, p_perfil_id, ciclo)    │
│                                                          │
│  WITH cursos_malla AS (...)                              │
│  WITH prereqs_directos AS (...)                          │
│  WITH prereqs_transitivos AS (...)  -- recursive CTE     │
│  WITH progreso AS (...)                                  │
│  SELECT ... CASE status ...                              │
│                                                          │
│  Retorna: JSON (tabla con columnas tipadas)              │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Criterios de Aceptación

- [ ] `GET /onboarding/cursos` responde en ≤1 llamado a Supabase
- [ ] Response model `CursosPorCarreraResponse` es idéntico al actual
- [ ] `_cargar_prerrequisitos` eliminado de `onboarding.py` y `malla.py`
- [ ] 4 tests unitarios pasan en verde (mockeando `supabase.rpc()`)
- [ ] Edge cases EC-1 a EC-7 cubiertos por tests
- [ ] La RPC está desplegada en Supabase y es accesible vía `.rpc()`
- [ ] Sin regresiones: `malla.py`, `cursos.py`, `dashboard.py` siguen funcionando
