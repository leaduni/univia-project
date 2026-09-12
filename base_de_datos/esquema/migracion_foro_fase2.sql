-- =============================================================================
-- Migración — Fase 2 Foro: votos up/down
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Añade el sistema de votación (up/down) a publicaciones y comentarios del
-- foro. Un usuario vota una vez por objetivo (publicación o comentario); el
-- valor es 1 (up) o -1 (down). Re-votar anula (toggle) o cambia el voto según
-- la lógica del endpoint POST /foro/votos.
--
-- Decisiones de diseño:
--   - `foro_votos` es una sola tabla con dos claves (publicacion_id y
--     comentario_id) y una restricción CHECK que exige EXACTAMENTE una de las
--     dos (o la publicación o el comentario, nunca ambas ni ninguna).
--   - La unicidad por usuario+objetivo se garantiza con dos índices UNIQUE
--     parciales (uno para publicaciones, otro para comentarios), más simples de
--     leer que índices compuestos con valores NULL.
--   - RLS: el usuario solo puede insertar/actualizar/borrar SUS propios votos
--     (auth.uid() = autor_perfil_id); la lectura es pública.
--
-- Idempotente: puede ejecutarse varias veces sin efecto adicional.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabla de votos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foro_votos (
    id BIGSERIAL PRIMARY KEY,
    autor_perfil_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    -- Exactamente uno de los dos es NOT NULL (ver CHECK más abajo).
    publicacion_id BIGINT REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
    comentario_id BIGINT REFERENCES foro_comentarios(id) ON DELETE CASCADE,
    valor SMALLINT NOT NULL CHECK (valor IN (1, -1)),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT foro_votos_objetivo_exclusivo
        CHECK ((publicacion_id IS NULL) <> (comentario_id IS NULL))
);

-- -----------------------------------------------------------------------------
-- 2. Unicidad por usuario y objetivo (índices parciales)
-- -----------------------------------------------------------------------------
-- Un voto por (usuario, publicación).
CREATE UNIQUE INDEX IF NOT EXISTS uq_foro_votos_usuario_publicacion
    ON foro_votos (autor_perfil_id, publicacion_id)
    WHERE publicacion_id IS NOT NULL;

-- Un voto por (usuario, comentario).
CREATE UNIQUE INDEX IF NOT EXISTS uq_foro_votos_usuario_comentario
    ON foro_votos (autor_perfil_id, comentario_id)
    WHERE comentario_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. Índices de consulta
-- -----------------------------------------------------------------------------
-- Agregar votos por publicación.
CREATE INDEX IF NOT EXISTS idx_foro_votos_publicacion
    ON foro_votos (publicacion_id);

-- Agregar votos por comentario.
CREATE INDEX IF NOT EXISTS idx_foro_votos_comentario
    ON foro_votos (comentario_id);

-- -----------------------------------------------------------------------------
-- 4. Seguridad a nivel de fila
-- -----------------------------------------------------------------------------
ALTER TABLE foro_votos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_votos' AND policyname='foro_votos_select') THEN
        CREATE POLICY foro_votos_select ON foro_votos
            FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_votos' AND policyname='foro_votos_insert_propio') THEN
        CREATE POLICY foro_votos_insert_propio ON foro_votos
            FOR INSERT WITH CHECK (auth.uid() = autor_perfil_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_votos' AND policyname='foro_votos_update_propio') THEN
        CREATE POLICY foro_votos_update_propio ON foro_votos
            FOR UPDATE USING (auth.uid() = autor_perfil_id)
            WITH CHECK (auth.uid() = autor_perfil_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_votos' AND policyname='foro_votos_delete_propio') THEN
        CREATE POLICY foro_votos_delete_propio ON foro_votos
            FOR DELETE USING (auth.uid() = autor_perfil_id);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema='public' AND table_name = 'foro_votos';
--
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname='public' AND tablename = 'foro_votos'
-- ORDER BY policyname;