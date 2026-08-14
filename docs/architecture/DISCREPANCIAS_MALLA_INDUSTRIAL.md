# Discrepancias — Malla Ingeniería Industrial 2020-2

**Fecha:** 2026-08-12
**Origen de verdad:** JSON oficial de malla curricular 2020-2 (59 cursos, 65 prerrequisitos)
**Base de datos:** Supabase, malla `id=16` (`Plan de Estudios 2020-2`, `codigo_plan=2020-2`)
**Script de corrección:** `scripts/fix_malla_industrial_2020_2.sql`

---

## Resumen Ejecutivo

Verificación automática contra Supabase detectó **34 discrepancias** distribuidas así:

| Categoría | Cantidad | Impacto |
|---|---|---|
| Corrección tipográfica (nombre de curso) | 1 | 🔴 Causa raíz de 6 discrepancias derivadas |
| Prerrequisitos faltantes en BD | 15 | 🔴 Cursos que aparecen como "disponibles" cuando deberían estar bloqueados |
| Prerrequisitos extra en BD | 10 | 🟡 Cursos bloqueados por dependencias que no existen en la malla real |
| Electivos placeholder sin dependencias | 5 | 🟡 Cursos genéricos sin prerrequisitos ni créditos definidos |
| Curso no encontrado en BD (por nombre) | 1 | 🔴 Mismo curso que el tipográfico |
| Cursos extra en BD (no en referencia) | 6 | 🟡 Electivos + curso con nombre divergente |

> **Nota:** La corrección del nombre del curso `Físico Química y Operaciones Unitarias` → `Fisicoquímica y Operaciones Unitarias` resuelve automáticamente 8 discrepancias (el curso "no encontrado" y 7 relaciones de prerrequisito que referencian al nombre incorrecto).

---

## Detalle de Inconsistencias

### 1. Corrección Tipográfica (1)

| Curso en BD | Curso correcto | curso_id |
|---|---|---|
| `Físico Química y Operaciones Unitarias` | `Fisicoquímica y Operaciones Unitarias` | 16 |

**Impacto:** 7 relaciones de prerrequisito usan este nombre. Al corregirlo, las referencias se alinean automáticamente.

### 2. Prerrequisitos Faltantes en BD (15)

Estas dependencias existen en la malla de referencia pero NO están registradas en `malla_curso_prerrequisitos`. Como resultado, el curso aparece como **disponible** cuando debería estar **bloqueado**.

| # | Curso | Prerrequisito Faltante | mc_id (curso) | mc_id (prereq) |
|---|---|---|---|---|
| 1 | Análisis de Procesos de Manufactura | Ingeniería del Trabajo II | 380 | 378 |
| 2 | Automatización y Control de Procesos | Electricidad y Electrónica Industrial | 385 | 365 |
| 3 | Control Estadístico de Procesos | Estadística y Probabilidades | 372 | 359 |
| 4 | Diseño y Evaluación de Proyectos | Innovación y Emprendimiento de Negocios | 392 | 391 |
| 5 | Ingeniería de Materiales | Diseño Asistido por Computador | 366 | 349 |
| 6 | Ingeniería de Materiales | Física II | 366 | 361 |
| 7 | Ingeniería de Procesos | Administración y Organización | 383 | 377 |
| 8 | Ingeniería del Producto | Procesos Industriales II | 386 | 374 |
| 9 | Mercadotecnia | Logística Empresarial | 381 | 382 |
| 10 | Metodología de la Investigación | Ética y Filosofía Política | 357 | 343 |
| 11 | Planeamiento y Gestión Estratégica | Contabilidad de Costos y Presupuestos | 395 | 376 |
| 12 | Planeamiento y Gestión Estratégica | Mercadotecnia | 395 | 381 |
| 13 | Procesos Industriales I | Teoría General de Sistemas | 367 | 350 |
| 14 | Realidad Nacional, Constitución y DDHH | Redacción y Comunicación | 351 | 342 |
| 15 | Sociología | Realidad Nacional, Constitución y DDHH | 369 | 351 |

### 3. Prerrequisitos Extra en BD (10)

Estas relaciones existen en `malla_curso_prerrequisitos` pero NO en la malla de referencia. Causan bloqueos incorrectos.

| # | Curso | Prerrequisito Extra (a ELIMINAR) | mc_id (curso) | mc_id (prereq) |
|---|---|---|---|---|
| 1 | Álgebra Lineal | Cálculo Diferencial | 346 | 339 |
| 2 | Análisis de Procesos de Manufactura | Procesos Industriales II | 380 | 374 |
| 3 | Control Estadístico de Procesos | Investigación de Operaciones I | 372 | 364 |
| 4 | Ingeniería de Materiales | Físico Química y Operaciones Unitarias | 366 | 362 |
| 5 | Ingeniería de Procesos | Ingeniería del Trabajo II | 383 | 378 |
| 6 | Maquinaria e Instrumentación Industrial | Electricidad y Electrónica Industrial | 373 | 365 |
| 7 | Mercadotecnia | Contabilidad de Costos y Presupuestos | 381 | 376 |
| 8 | Metodología de la Investigación | Realidad Nacional, Constitución y DDHH | 357 | 351 |
| 9 | Planeamiento y Gestión Estratégica | Planeamiento y Control de Operaciones | 395 | 389 |
| 10 | Realidad Nacional, Constitución y DDHH | Ética y Filosofía Política | 351 | 343 |

> **Nota sobre #4:** `Físico Química y Operaciones Unitarias` (mc_id=362) es el curso con nombre incorrecto. Tras la corrección tipográfica, esta fila queda como `Ingeniería de Materiales → Fisicoquímica y Operaciones Unitarias`, que TAMBIÉN es incorrecta según la referencia (debería ser `Física II` y `Diseño Asistido por Computador`).

### 4. Electivos Placeholder (5)

Cursos sin prerrequisitos, créditos definidos ni equivalencia en la malla real:

| Curso en BD | Ciclo | curso_id | mc_id |
|---|---|---|---|
| Electivo (Ciclo 6) | 6 | 253 | 397 |
| Electivo (Ciclo 7) | 7 | 268 | 398 |
| Electivos (Ciclo 8) | 8 | 273 | 399 |
| Electivos (Ciclo 9) | 9 | 276 | 400 |
| Electivo (Ciclo 10) | 10 | 277 | 401 |

> **Recomendación:** Estos placeholders deben eliminarse de `malla_cursos` o reemplazarse por cursos electivos reales cuando estén definidos. Por ahora, **NO se eliminan** en el script de corrección para no romper posibles referencias en perfiles de estudiantes.

---

## Resumen Post-Corrección

Tras ejecutar el script SQL de corrección:

| Acción | Cantidad |
|---|---|
| Curso renombrado | 1 |
| Prerrequisitos insertados | 15 |
| Prerrequisitos eliminados | 10 |
| **Discrepancias resueltas** | **26** |
| Electivos placeholder (requieren decisión de negocio) | 5 |
