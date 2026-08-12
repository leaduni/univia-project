-- =============================================================================
-- FIX: Malla Ingeniería Industrial 2020-2 — Alineación con JSON de referencia
-- =============================================================================
-- Proyecto: UniVia (leaduni/univia-project)
-- Malla:    id=16, codigo_plan='2020-2', carrera_id=6 (Ing. Industrial)
-- Base:     Supabase — ejecutar en SQL Editor
-- 
-- Este script corrige 26 de las 34 discrepancias detectadas:
--   A. 1 corrección tipográfica (nombre de curso)
--   B. 15 prerrequisitos faltantes (INSERT)
--   C. 10 prerrequisitos extra (DELETE)
--
-- Las 5 discrepancias restantes son electivos placeholder que requieren
-- decisión de negocio; no se modifican aquí.
--
-- IDEMPOTENTE: se puede ejecutar múltiples veces sin efectos secundarios.
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. CORRECCIÓN TIPOGRÁFICA — Renombrar curso
-- =============================================================================
-- 'Físico Química y Operaciones Unitarias' -> 'Fisicoquímica y Operaciones Unitarias'
-- Impacto: alinea 7 relaciones de prerrequisito que usan este nombre.
-- =============================================================================

UPDATE cursos
SET name = 'Fisicoquímica y Operaciones Unitarias'
WHERE id = 16
  AND name = 'Físico Química y Operaciones Unitarias';


-- =============================================================================
-- B. PRERREQUISITOS FALTANTES — Insertar 15 relaciones
-- =============================================================================
-- Cada INSERT es idempotente: ON CONFLICT DO NOTHING evita duplicados
-- si el script se ejecuta más de una vez.
-- =============================================================================

-- B.1  Análisis de Procesos de Manufactura -> Ingeniería del Trabajo II
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (380, 378)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.2  Automatización y Control de Procesos -> Electricidad y Electrónica Industrial
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (385, 365)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.3  Control Estadístico de Procesos -> Estadística y Probabilidades
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (372, 359)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.4  Diseño y Evaluación de Proyectos -> Innovación y Emprendimiento de Negocios
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (392, 391)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.5  Ingeniería de Materiales -> Diseño Asistido por Computador
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (366, 349)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.6  Ingeniería de Materiales -> Física II
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (366, 361)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.7  Ingeniería de Procesos -> Administración y Organización
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (383, 377)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.8  Ingeniería del Producto -> Procesos Industriales II
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (386, 374)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.9  Mercadotecnia -> Logística Empresarial
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (381, 382)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.10 Metodología de la Investigación -> Ética y Filosofía Política
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (357, 343)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.11 Planeamiento y Gestión Estratégica -> Contabilidad de Costos y Presupuestos
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (395, 376)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.12 Planeamiento y Gestión Estratégica -> Mercadotecnia
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (395, 381)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.13 Procesos Industriales I -> Teoría General de Sistemas
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (367, 350)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.14 Realidad Nacional, Constitución y DDHH -> Redacción y Comunicación
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (351, 342)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;

-- B.15 Sociología -> Realidad Nacional, Constitución y DDHH
INSERT INTO malla_curso_prerrequisitos (malla_curso_id, prerrequisito_malla_curso_id)
VALUES (369, 351)
ON CONFLICT (malla_curso_id, prerrequisito_malla_curso_id) DO NOTHING;


-- =============================================================================
-- C. PRERREQUISITOS EXTRA — Eliminar 10 relaciones incorrectas
-- =============================================================================
-- Solo se eliminan si existen (idempotente: sin fila = sin error).
-- =============================================================================

-- C.1  Álgebra Lineal -> Cálculo Diferencial (no existe en referencia)
DELETE FROM malla_curso_prerrequisitos
WHERE malla_curso_id = 346
  AND prerrequisito_malla_curso_id = 339;

-- C.2  Análisis de Procesos de Manufactura -> Procesos Industriales II
DELETE FROM malla_curso_prerrequisitos
WHERE malla_curso_id = 380
  AND prerrequisito_malla_curso_id = 374;

-- C.3  Control Estadístico de Procesos -> Investigación de Operaciones I
DELETE FROM malla_curso_prerrequisitos
WHERE malla_curso_id = 372
  AND prerrequisito_malla_curso_id = 364;

-- C.4  Ingeniería de Materiales -> (Físico Química y Operaciones Unitarias)
--       Este curso existe con nombre corregido; el prereq SÍ es incorrecto.
DELETE FROM malla_curso_prerrequisitos
WHERE malla_curso_id = 366
  AND prerrequisito_malla_curso_id = 362;

-- C.5  Ingeniería de Procesos -> Ingeniería del Trabajo II
DELETE FROM malla_curso_prerrequisitos
WHERE malla_curso_id = 383
  AND prerrequisito_malla_curso_id = 378;

-- C.6  Maquinaria e Instrumentación Industrial -> Electricidad y Electrónica Industrial
DELETE FROM malla_curso_prerrequisitos
WHERE malla_curso_id = 373
  AND prerrequisito_malla_curso_id = 365;

-- C.7  Mercadotecnia -> Contabilidad de Costos y Presupuestos
DELETE FROM malla_curso_prerrequisitos
WHERE malla_curso_id = 381
  AND prerrequisito_malla_curso_id = 376;

-- C.8  Metodología de la Investigación -> Realidad Nacional, Constitución y DDHH
DELETE FROM malla_curso_prerrequisitos
WHERE malla_curso_id = 357
  AND prerrequisito_malla_curso_id = 351;

-- C.9  Planeamiento y Gestión Estratégica -> Planeamiento y Control de Operaciones
DELETE FROM malla_curso_prerrequisitos
WHERE malla_curso_id = 395
  AND prerrequisito_malla_curso_id = 389;

-- C.10 Realidad Nacional, Constitución y DDHH -> Ética y Filosofía Política
DELETE FROM malla_curso_prerrequisitos
WHERE malla_curso_id = 351
  AND prerrequisito_malla_curso_id = 343;


-- =============================================================================
-- VERIFICACIÓN POST-CORRECCIÓN
-- =============================================================================
-- Ejecutar estas consultas para confirmar que la corrección fue aplicada:

-- 1. Confirmar renombre del curso
-- SELECT id, name FROM cursos WHERE id = 16;
-- Esperado: 'Fisicoquímica y Operaciones Unitarias'

-- 2. Contar prerrequisitos totales en la malla 2020-2 (deberían ser ~65)
-- SELECT COUNT(*) FROM malla_curso_prerrequisitos mcp
-- JOIN malla_cursos mc ON mc.id = mcp.malla_curso_id
-- WHERE mc.malla_id = 16;

-- 3. Verificar los 15 nuevos prerrequisitos insertados
-- SELECT
--     c_src.name AS curso,
--     c_prq.name AS prerrequisito
-- FROM malla_curso_prerrequisitos mcp
-- JOIN malla_cursos mc_src ON mc_src.id = mcp.malla_curso_id
-- JOIN malla_cursos mc_prq ON mc_prq.id = mcp.prerrequisito_malla_curso_id
-- JOIN cursos c_src ON c_src.id = mc_src.curso_id
-- JOIN cursos c_prq ON c_prq.id = mc_prq.curso_id
-- WHERE mcp.malla_curso_id IN (380,385,372,392,366,366,383,386,381,357,395,395,367,351,369)
-- ORDER BY c_src.name, c_prq.name;

-- 4. Verificar que los 10 prerrequisitos extra fueron eliminados
-- SELECT COUNT(*) FROM malla_curso_prerrequisitos
-- WHERE (malla_curso_id = 346 AND prerrequisito_malla_curso_id = 339)
--    OR (malla_curso_id = 380 AND prerrequisito_malla_curso_id = 374)
--    OR (malla_curso_id = 372 AND prerrequisito_malla_curso_id = 364)
--    OR (malla_curso_id = 366 AND prerrequisito_malla_curso_id = 362)
--    OR (malla_curso_id = 383 AND prerrequisito_malla_curso_id = 378)
--    OR (malla_curso_id = 373 AND prerrequisito_malla_curso_id = 365)
--    OR (malla_curso_id = 381 AND prerrequisito_malla_curso_id = 376)
--    OR (malla_curso_id = 357 AND prerrequisito_malla_curso_id = 351)
--    OR (malla_curso_id = 395 AND prerrequisito_malla_curso_id = 389)
--    OR (malla_curso_id = 351 AND prerrequisito_malla_curso_id = 343);
-- Esperado: 0

COMMIT;
