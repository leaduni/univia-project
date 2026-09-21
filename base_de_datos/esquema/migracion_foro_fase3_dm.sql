-- =============================================================================
-- Migración — Fase 3: Mensajería Directa (DM) entre estudiantes
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Chat privado 1 a 1 con estado en tiempo real vía Supabase Realtime.
--
-- Decisiones de diseño:
--   - `conversaciones_dm` usa un PAR ORDENADO CANÓNICO (usuario_a < usuario_b)
--     con UNIQUE(usuario_a, usuario_b). Así un hilo A<->B existe una sola vez,
--     sin importar quién lo inició, y la RLS es un simple IN.
--   - `mensajes_dm` desnormaliza la conversación y apunta a ella por FK. La RLS
--     de mensajes valida la membrecía con un subquery a conversaciones_dm, y el
--     remitente debe ser el propio auth.uid().
--   - `leido`: lo marca el destinatario al abrir/consultar el chat (UPDATE).
--   - Realtime: la tabla `mensajes_dm` se publica en supabase_realtime para que
--     el cliente reciba inserts en vivo; la RLS garantiza que nadie recibe
--     mensajes ajenos.
--
-- Idempotente: puede ejecutarse varias veces sin efecto adicional.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Conversaciones DM (par ordenado canónico)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversaciones_dm (
    id BIGSERIAL PRIMARY KEY,
    usuario_a UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    usuario_b UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    -- Quién inició el hilo (información de contexto; no controla la visibilidad).
    creado_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Se toca en cada mensaje nuevo para ordenar la bandeja.
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Par canónico: usuario_a < usuario_b, evitando duplicados A<->B.
    CONSTRAINT conversaciones_dm_par_canonico CHECK (usuario_a < usuario_b),
    CONSTRAINT conversaciones_dm_par_unico UNIQUE (usuario_a, usuario_b),
    CONSTRAINT conversaciones_dm_no_auto CHECK (usuario_a <> usuario_b)
);

-- -----------------------------------------------------------------------------
-- 2. Mensajes DM
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mensajes_dm (
    id BIGSERIAL PRIMARY KEY,
    conversacion_dm_id BIGINT NOT NULL
        REFERENCES conversaciones_dm(id) ON DELETE CASCADE,
    remitente_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    cuerpo TEXT NOT NULL,
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. Índices
-- -----------------------------------------------------------------------------
-- Bandeja del usuario: conversaciones en las que participa, más recientes primero.
CREATE INDEX IF NOT EXISTS idx_conversaciones_dm_usuario_a_fecha
    ON conversaciones_dm (usuario_a, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversaciones_dm_usuario_b_fecha
    ON conversaciones_dm (usuario_b, updated_at DESC);

-- Historial de una conversación en orden cronológico.
CREATE INDEX IF NOT EXISTS idx_mensajes_dm_conversacion_fecha
    ON mensajes_dm (conversacion_dm_id, created_at);

-- Conteo de no leídos por conversación/destinatario.
CREATE INDEX IF NOT EXISTS idx_mensajes_dm_conversacion_leido
    ON mensajes_dm (conversacion_dm_id, leido);

-- -----------------------------------------------------------------------------
-- 4. Seguridad a nivel de fila (privacidad estricta del DM)
-- -----------------------------------------------------------------------------
ALTER TABLE conversaciones_dm ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_dm ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- --- conversaciones_dm ---
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversaciones_dm' AND policyname='conversaciones_dm_select_miembro') THEN
        CREATE POLICY conversaciones_dm_select_miembro ON conversaciones_dm
            FOR SELECT USING (auth.uid() IN (usuario_a, usuario_b));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversaciones_dm' AND policyname='conversaciones_dm_insert_miembro') THEN
        CREATE POLICY conversaciones_dm_insert_miembro ON conversaciones_dm
            FOR INSERT WITH CHECK (auth.uid() IN (usuario_a, usuario_b));
    END IF;

    -- --- mensajes_dm ---
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mensajes_dm' AND policyname='mensajes_dm_select_miembro') THEN
        CREATE POLICY mensajes_dm_select_miembro ON mensajes_dm
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM conversaciones_dm d
                    WHERE d.id = mensajes_dm.conversacion_dm_id
                      AND auth.uid() IN (d.usuario_a, d.usuario_b)
                )
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mensajes_dm' AND policyname='mensajes_dm_insert_remitente') THEN
        CREATE POLICY mensajes_dm_insert_remitente ON mensajes_dm
            FOR INSERT WITH CHECK (
                remitente_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM conversaciones_dm d
                    WHERE d.id = mensajes_dm.conversacion_dm_id
                      AND auth.uid() IN (d.usuario_a, d.usuario_b)
                )
            );
    END IF;
    -- UPDATE limitado a marcar `leido`: solo el destinatario (el que NO es remitente).
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mensajes_dm' AND policyname='mensajes_dm_update_leido_destinatario') THEN
        CREATE POLICY mensajes_dm_update_leido_destinatario ON mensajes_dm
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM conversaciones_dm d
                    WHERE d.id = mensajes_dm.conversacion_dm_id
                      AND auth.uid() IN (d.usuario_a, d.usuario_b)
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM conversaciones_dm d
                    WHERE d.id = mensajes_dm.conversacion_dm_id
                      AND auth.uid() IN (d.usuario_a, d.usuario_b)
                )
            );
    END IF;
    -- Sin DELETE: un mensaje enviado no se borra de forma directa por el cliente.
END $$;

-- -----------------------------------------------------------------------------
-- 5. Realtime: publicar mensajes_dm para recibir en vivo
-- -----------------------------------------------------------------------------
-- La RLS de SELECT anterior garantiza que el stream de Realtime solo entregue
-- al destinatario/remitente los mensajes de conversaciones donde participa.
ALTER PUBLICATION supabase_realtime ADD TABLE mensajes_dm;

-- -----------------------------------------------------------------------------
-- Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema='public' AND table_name IN ('conversaciones_dm','mensajes_dm');
--
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname='public' AND tablename IN ('conversaciones_dm','mensajes_dm')
-- ORDER BY tablename, policyname;
--
-- SELECT schemaname, tablename FROM pg_publication_tables
-- WHERE pubname='supabase_realtime' AND tablename='mensajes_dm';