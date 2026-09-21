-- =============================================================================
-- Migración — Fase 9: módulo de feedback, sugerencias y reporte de errores
-- =============================================================================
-- Contexto:
--   El módulo de "Feedback y Sugerencias" (Fase 1) permite al alumno registrar
--   un ticket multicriterio (función, bug, reporte de respuestas del chatbot,
--   UI/UX) y consultar su historial con los estados. Los desarrolladores tienen
--   acceso global vía la tabla `feedback_devs`.
--
-- Decisiones de diseño:
--   * `perfil_id` se desnormaliza en cada fila de `feedback_tickets` para que
--     las políticas RLS comparen contra auth.uid() sin subquery, el mismo
--     criterio que migracion_fase8_chatbot.sql documenta para chat_mensajes.
--   * `feedback_devs` es la fuente de verdad de quién atiende tickets: una
--     fila por perfil (UUID de auth.users). Se puebla manualmente con la llave
--     de servicio; los estudiantes no pueden leerla (RLS solo se ve a sí mismo).
--   * Los catálogos de categoria/prioridad/estado se cierran con CHECK.
--   * No se define política DELETE en Fase 1: nadie borra tickets. Quien
--     quiera cerrar un ticket cambia `estado` (política UPDATE).
--
-- Idempotente: se puede ejecutar varias veces sin efectos adicionales.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tablas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback_tickets (
    id BIGSERIAL PRIMARY KEY,
    perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    categoria VARCHAR(50) NOT NULL
        CHECK (categoria IN ('funcion', 'bug', 'respuesta_chatbot', 'ui_ux')),
    prioridad VARCHAR(20) NOT NULL DEFAULT 'media'
        CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
    estado VARCHAR(20) NOT NULL DEFAULT 'recibido'
        CHECK (estado IN ('recibido', 'en_revision', 'planeado', 'resuelto', 'descartado')),
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_devs (
    perfil_id UUID PRIMARY KEY REFERENCES perfiles(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 2. Índices
-- -----------------------------------------------------------------------------
-- Historial del estudiante (GET /api/feedback/tickets) filtra por perfil.
CREATE INDEX IF NOT EXISTS idx_feedback_tickets_perfil
    ON feedback_tickets (perfil_id, creado_en DESC);

-- Cola de trabajo de devs: tickets por estado y prioridad.
CREATE INDEX IF NOT EXISTS idx_feedback_tickets_estado
    ON feedback_tickets (estado, prioridad, creado_en DESC);


-- -----------------------------------------------------------------------------
-- 3. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE feedback_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_devs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback_tickets'
          AND policyname = 'feedback_tickets_select'
    ) THEN
        CREATE POLICY feedback_tickets_select ON feedback_tickets
            FOR SELECT USING (
                auth.uid() = perfil_id
                OR EXISTS (SELECT 1 FROM feedback_devs d WHERE d.perfil_id = auth.uid())
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback_tickets'
          AND policyname = 'feedback_tickets_insert'
    ) THEN
        CREATE POLICY feedback_tickets_insert ON feedback_tickets
            FOR INSERT WITH CHECK (auth.uid() = perfil_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback_tickets'
          AND policyname = 'feedback_tickets_update'
    ) THEN
        CREATE POLICY feedback_tickets_update ON feedback_tickets
            FOR UPDATE
            USING (
                auth.uid() = perfil_id
                OR EXISTS (SELECT 1 FROM feedback_devs d WHERE d.perfil_id = auth.uid())
            )
            WITH CHECK (
                auth.uid() = perfil_id
                OR EXISTS (SELECT 1 FROM feedback_devs d WHERE d.perfil_id = auth.uid())
            );
    END IF;
END $$;

-- Devs: solo pueden leerse a sí mismos (SELECT). El alta de devs se hace con la
-- llave de servicio, nunca desde el cliente.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback_devs'
          AND policyname = 'feedback_devs_select_propia'
    ) THEN
        CREATE POLICY feedback_devs_select_propia ON feedback_devs
            FOR SELECT USING (auth.uid() = perfil_id);
    END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 4. Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('feedback_tickets', 'feedback_devs')
-- ORDER BY table_name, ordinal_position;
--
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE tablename IN ('feedback_tickets', 'feedback_devs')
-- ORDER BY tablename, policyname;
--
-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('feedback_tickets', 'feedback_devs');