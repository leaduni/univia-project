-- =============================================================================
-- Migración — Fase 3: registro de actividad del estudiante
-- =============================================================================
-- Contexto:
--   RF-21 pide estadísticas de actividad (inicios de sesión, exámenes rendidos
--   y aprobados) y RF-22 pide filtrarlas por curso o periodo. Ninguna tabla del
--   esquema guardaba esos hechos: los logins no dejaban rastro y
--   POST /evaluaciones/evaluar calculaba el resultado y lo devolvía sin
--   persistirlo. Sin este registro, RF-21 solo podía devolver ceros.
--
-- Decisión de diseño:
--   Una sola tabla de eventos en vez de una tabla por tipo de actividad. Los
--   requisitos piden contar y filtrar hechos con fecha, no modelar cada uno con
--   sus propias columnas. Una tabla única hace que el filtro por periodo
--   (RF-22) sea una sola consulta, y permite sumar tipos de actividad nuevos
--   sin migrar el esquema otra vez.
--
-- Idempotente: puede ejecutarse varias veces sin efecto adicional.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tabla de eventos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos_actividad (
    id BIGSERIAL PRIMARY KEY,
    perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    -- 'login' | 'evaluacion' | 'unidad_completada' | 'curso_completado'
    tipo VARCHAR(40) NOT NULL,
    -- Solo para eventos ligados a un curso; permite el filtro de RF-22.
    curso_id INTEGER REFERENCES cursos(id) ON DELETE SET NULL,
    -- Datos propios de cada tipo (ej. nota y aprobado en una evaluación).
    -- Van en JSONB para no añadir columnas que quedarían nulas en la mayoría
    -- de las filas.
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 2. Índices
-- -----------------------------------------------------------------------------
-- Toda consulta de RF-21/RF-22 arranca por estudiante y recorta por fecha.
CREATE INDEX IF NOT EXISTS idx_eventos_actividad_perfil_fecha
    ON eventos_actividad (perfil_id, created_at DESC);

-- El filtro por tipo ('cuántos exámenes rendí') acompaña casi siempre al de
-- estudiante.
CREATE INDEX IF NOT EXISTS idx_eventos_actividad_perfil_tipo
    ON eventos_actividad (perfil_id, tipo);

-- Filtro por curso (RF-22). Parcial: la mayoría de eventos no tiene curso.
CREATE INDEX IF NOT EXISTS idx_eventos_actividad_curso
    ON eventos_actividad (curso_id)
    WHERE curso_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 3. Seguridad a nivel de fila (RNF-09 — privacidad académica)
-- -----------------------------------------------------------------------------
-- La actividad de un estudiante es dato personal: sin RLS, cualquier usuario
-- autenticado podría leer el historial de otro con el cliente anónimo.
ALTER TABLE eventos_actividad ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'eventos_actividad'
          AND policyname = 'eventos_actividad_select_propio'
    ) THEN
        CREATE POLICY eventos_actividad_select_propio ON eventos_actividad
            FOR SELECT USING (auth.uid() = perfil_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'eventos_actividad'
          AND policyname = 'eventos_actividad_insert_propio'
    ) THEN
        CREATE POLICY eventos_actividad_insert_propio ON eventos_actividad
            FOR INSERT WITH CHECK (auth.uid() = perfil_id);
    END IF;
END $$;

-- No se crean políticas de UPDATE ni DELETE a propósito: un registro de
-- actividad que el propio interesado puede editar deja de ser un registro.


-- -----------------------------------------------------------------------------
-- 4. Verificación posterior
-- -----------------------------------------------------------------------------
-- Ejecutar para confirmar que la migración quedó aplicada:
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'eventos_actividad';
--
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'eventos_actividad';
--
-- SELECT indexname FROM pg_indexes WHERE tablename = 'eventos_actividad';
