-- =============================================================================
-- FASE 7 — Soporte real de múltiples facultades
-- =============================================================================
-- Proyecto: UniVia (leaduni/univia-project)
-- Base:     Supabase — ejecutar en el SQL Editor
--
-- Contexto
-- --------
-- `cursos` arrastra una constraint UNIQUE sobre `name` (cursos_name_key) que no
-- está declarada en db_schema.sql: se creó directamente sobre la base. Con una
-- sola facultad cargada nunca estorbó, pero es semánticamente incorrecta.
--
-- El identificador de un curso es su CÓDIGO, no su nombre. Dos facultades
-- nombran igual a cursos que son distintos y tienen códigos distintos:
--
--     Ecuaciones Diferenciales          FIIS: FB403     FIM: MB155
--     Física II                         FIIS: FB401     FIM: MB224
--     Programación Orientada a Objetos  FIIS: SI302     FIM: MB545
--     Estadística y Probabilidades      FIIS: FB305     FIM: MB613
--     Termodinámica                     FIIS: TE401     FIM: MN121
--     Inteligencia Artificial           FIIS: SI077     FIM: MT616
--     ... (11 casos al cargar FIM)
--
-- Y dentro de una misma facultad, un curso puede aparecer con dos códigos según
-- el plan: Electrónica Industrial es ML836 en el plan M3 y ML837 en el M4.
--
-- Mientras la constraint exista, cargar una segunda facultad es imposible.
--
-- IDEMPOTENTE: se puede ejecutar varias veces sin efectos secundarios.
-- =============================================================================

BEGIN;

-- --- Liberar el nombre de curso ---
-- La unicidad la sigue garantizando `cursos_code_key` sobre `code`, que es el
-- identificador real y el que usa la ingesta de recursos de Drive para
-- emparejar carpetas con cursos.
ALTER TABLE cursos DROP CONSTRAINT IF EXISTS cursos_name_key;

-- Buscar un curso por nombre sigue siendo frecuente (RAG, reportes), así que
-- se conserva el índice; solo deja de ser único.
CREATE INDEX IF NOT EXISTS cursos_name_idx ON cursos (name);

COMMIT;

-- =============================================================================
-- Verificación
-- =============================================================================
-- Debe devolver 0 filas:
--
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'cursos'::regclass AND conname = 'cursos_name_key';
--
-- Después de correr esto, completar la carga de FIM con:
--
--   python -m scripts_manuales.cargar_mallas fim --ejecutar
-- =============================================================================
