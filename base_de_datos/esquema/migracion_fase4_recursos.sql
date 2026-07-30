-- =============================================================================
-- Migración — Fase 4: Banco de recursos + integración Drive
-- =============================================================================
-- Contexto:
--   El banco de recursos necesita poblar `recursos` desde una carpeta pública
--   de Google Drive y exponerlos filtrados por curso/tipo/facultad. La tabla
--   no tenía columnas para el origen Drive (url_drive, drive_file_id) ni para
--   los metadatos denormalizados que permiten auditar recursos cuyo curso no
--   se pudo emparejar automáticamente durante la ingesta (nombre_curso,
--   codigo_curso). Un intento previo de agregar estas columnas
--   (agregar_columnas_recursos.py) usó un RPC "exec" que no existe en este
--   proyecto y falló en silencio.
--
-- Decisión de diseño:
--   drive_file_id + curso_id forman la clave de upsert del script de ingesta,
--   no drive_file_id solo: una carpeta de Drive (ej. "FB101") puede emparejar
--   con varias filas de `cursos` que comparten prefijo de código (mismo
--   patrón que PLANCHA_MAP en cursos.py para FB101_SIS/FB101_SOFT/FB101_IND),
--   así que un mismo archivo de Drive puede generar más de una fila de
--   recursos, una por curso real. nombre_curso/codigo_curso quedan en la
--   tabla como remanente auditable cuando curso_id no se pudo resolver (fila
--   huérfana a revisar a mano), no como fuente de verdad para mostrar en
--   pantalla — eso lo hace un join en el router, igual que el resto del
--   backend.
--
-- Idempotente: puede ejecutarse varias veces sin efecto adicional.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Columnas nuevas
-- -----------------------------------------------------------------------------
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS url_drive TEXT;
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS drive_file_id TEXT;
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS nombre_curso TEXT;
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS codigo_curso TEXT;


-- -----------------------------------------------------------------------------
-- 2. Índices
-- -----------------------------------------------------------------------------
-- Clave de upsert idempotente del script de ingesta: un archivo de Drive
-- puede repetirse por curso (ver Decisión de diseño), así que la unicidad es
-- compuesta. No es parcial (sin WHERE): un índice único parcial no puede
-- usarse como target de inferencia de un ON CONFLICT que no repite el mismo
-- WHERE, y el upsert de supabase-py no lo agrega. No hace falta el WHERE de
-- todos modos: un índice único normal ya permite múltiples NULL sin
-- considerarlos en conflicto, así que las filas preexistentes (drive_file_id
-- NULL) conviven sin problema.
CREATE UNIQUE INDEX IF NOT EXISTS idx_recursos_drive_file_curso
    ON recursos (drive_file_id, curso_id);

-- GET /api/recursos filtra por curso_id y tipo en casi toda consulta.
CREATE INDEX IF NOT EXISTS idx_recursos_curso_id ON recursos (curso_id);
CREATE INDEX IF NOT EXISTS idx_recursos_tipo ON recursos (tipo);


-- -----------------------------------------------------------------------------
-- 3. Verificación posterior
-- -----------------------------------------------------------------------------
-- Ejecutar para confirmar que la migración quedó aplicada:
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'recursos';
--
-- SELECT indexname FROM pg_indexes WHERE tablename = 'recursos';
