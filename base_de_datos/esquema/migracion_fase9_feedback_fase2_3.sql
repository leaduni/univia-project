-- =============================================================================
-- Migración — Fases 2 y 3 del módulo de feedback (detalle, filtros, hilo y adjuntos)
-- =============================================================================
-- Contexto:
--   Sobre la Fase 1 (feedback_tickets + feedback_devs), estas fases añaden el
--   hilo de conversación (feedback_mensajes), los adjuntos referenciados a
--   Supabase Storage (feedback_adjuntos) y el bucket privado 'feedback-adjuntos'.
--
-- Decisiones de diseño:
--   * `autor_id` en feedback_mensajes se corresponde con auth.users/perfiles;
--     el rol de quien escribe se fija en `autor_rol` ('estudiante' | 'dev').
--   * Las políticas RLS reutilizan el mismo criterio que fase 1: el estudiante
--     titular de un ticket (join hacia feedback_tickets.perfil_id) o cualquier
--     miembro de feedback_devs.
--   * `feedback_adjuntos` guarda solo el path dentro del bucket + metadatos; el
--     binario vive en Storage privado y se sirve con URLs firmadas expirables.
--   * El bucket se crea no-público con límite de 5 MB por archivo.
--
-- Idempotente: se puede ejecutar varias veces sin efectos adicionales.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Índice de estado (idempotente; ya creado en la Fase 1)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_feedback_tickets_estado
    ON feedback_tickets (estado, prioridad, creado_en DESC);


-- -----------------------------------------------------------------------------
-- 2. Hilo de mensajes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback_mensajes (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES feedback_tickets(id) ON DELETE CASCADE,
    autor_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    autor_rol VARCHAR(20) NOT NULL DEFAULT 'estudiante'
        CHECK (autor_rol IN ('estudiante', 'dev')),
    contenido TEXT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lectura del hilo por ticket, en orden cronológico.
CREATE INDEX IF NOT EXISTS idx_feedback_mensajes_ticket
    ON feedback_mensajes (ticket_id, creado_en ASC);


-- -----------------------------------------------------------------------------
-- 3. Adjuntos (referencias a Supabase Storage)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback_adjuntos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id BIGINT NOT NULL REFERENCES feedback_tickets(id) ON DELETE CASCADE,
    mensaje_id BIGINT REFERENCES feedback_mensajes(id) ON DELETE SET NULL,
    path TEXT NOT NULL,
    nombre_original TEXT NOT NULL,
    tipo_mime TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_adjuntos_ticket
    ON feedback_adjuntos (ticket_id);


-- -----------------------------------------------------------------------------
-- 4. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE feedback_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_adjuntos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- SELECT mensajes: el titular del ticket o cualquier dev.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback_mensajes'
          AND policyname = 'feedback_mensajes_select'
    ) THEN
        CREATE POLICY feedback_mensajes_select ON feedback_mensajes
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM feedback_tickets ft
                    WHERE ft.id = feedback_mensajes.ticket_id
                      AND ft.perfil_id = auth.uid()
                )
                OR EXISTS (SELECT 1 FROM feedback_devs d WHERE d.perfil_id = auth.uid())
            );
    END IF;

    -- INSERT mensajes: estudiante titular o dev.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback_mensajes'
          AND policyname = 'feedback_mensajes_insert'
    ) THEN
        CREATE POLICY feedback_mensajes_insert ON feedback_mensajes
            FOR INSERT WITH CHECK (
                (
                    autor_rol = 'estudiante'
                    AND EXISTS (
                        SELECT 1 FROM feedback_tickets ft
                        WHERE ft.id = feedback_mensajes.ticket_id
                          AND ft.perfil_id = auth.uid()
                    )
                )
                OR (
                    autor_rol = 'dev'
                    AND EXISTS (
                        SELECT 1 FROM feedback_devs d WHERE d.perfil_id = auth.uid()
                    )
                )
            );
    END IF;

    -- SELECT adjuntos: el titular del ticket o cualquier dev (mismo criterio
    -- que feedback_tickets_select).
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback_adjuntos'
          AND policyname = 'feedback_adjuntos_select'
    ) THEN
        CREATE POLICY feedback_adjuntos_select ON feedback_adjuntos
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM feedback_tickets ft
                    WHERE ft.id = feedback_adjuntos.ticket_id
                      AND ft.perfil_id = auth.uid()
                )
                OR EXISTS (SELECT 1 FROM feedback_devs d WHERE d.perfil_id = auth.uid())
            );
    END IF;

    -- INSERT adjuntos: titular del ticket o dev.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'feedback_adjuntos'
          AND policyname = 'feedback_adjuntos_insert'
    ) THEN
        CREATE POLICY feedback_adjuntos_insert ON feedback_adjuntos
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM feedback_tickets ft
                    WHERE ft.id = feedback_adjuntos.ticket_id
                      AND ft.perfil_id = auth.uid()
                )
                OR EXISTS (SELECT 1 FROM feedback_devs d WHERE d.perfil_id = auth.uid())
            );
    END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 5. Bucket de Storage privado y política complementaria
-- -----------------------------------------------------------------------------
-- Los uploads se hacen con el cliente admin (service role), que evita el RLS
-- de storage; esta política es una capa de defensa para cuando el cliente use
-- el token del usuario. Las URLs firmadas expiradas permiten la lectura sin
-- necesidad de una política de SELECT pública.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('feedback-adjuntos', 'feedback-adjuntos', false, 5242880)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'feedback_adjuntos_storage_insert'
    ) THEN
        CREATE POLICY feedback_adjuntos_storage_insert ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'feedback-adjuntos');
    END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 6. Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('feedback_mensajes', 'feedback_adjuntos')
-- ORDER BY table_name, ordinal_position;
--
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE tablename IN ('feedback_mensajes', 'feedback_adjuntos')
-- ORDER BY tablename, policyname;
--
-- SELECT id, name, public, file_size_limit
-- FROM storage.buckets WHERE id = 'feedback-adjuntos';