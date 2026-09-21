-- =============================================================================
-- Migración — Fase 1 Foro: secciones, publicaciones, comentarios y moderadores
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Contexto:
--   Comunidad de estudiantes. Fase 1 = foro fijo con CRUD: secciones (global +
--   por facultad), publicaciones (hilos) y comentarios. Los votos, hilos
--   anidados complejos y la mensajería directa llegan en fases posteriores;
--   aquí `foro_comentarios.parent_id` ya permite respuestas directas.
--
-- Decisión de diseño (mismo criterio que migracion_fase8_chatbot.sql):
--   - `autor_perfil_id` desnormalizado en cada tabla para que las políticas RLS
--     comparen directo contra auth.uid() sin subqueries.
--   - Acceso por facultad vía `foro_secciones.facultad_id`; la visibilidad se
--     resuelve en el backend leyendo `perfiles.carrera_id -> carreras.facultad_id`
--     (no hay columna facultad_id en perfiles).
--   - `foro_moderadores` es una tabla dedicada (decisión confirmada): quién
--     puede crear secciones y moderar contenido.
--
-- RLS:
--   - SELECT: cualquier autenticado lee.
--   - INSERT/UPDATE/DELETE: el propio autor, o cualquier moderador.
--
-- Idempotente: puede ejecutarse varias veces sin efecto adicional.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Secciones del foro (global + por facultad)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foro_secciones (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(16) NOT NULL CHECK (tipo IN ('global', 'facultad')),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    -- Solo para tipo = 'facultad': a qué facultad pertenece el canal.
    facultad_id INTEGER REFERENCES public.facultades(id) ON DELETE SET NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Publicaciones (hilos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foro_publicaciones (
    id BIGSERIAL PRIMARY KEY,
    seccion_id BIGINT NOT NULL REFERENCES foro_secciones(id) ON DELETE CASCADE,
    autor_perfil_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    cuerpo TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    estado VARCHAR(16) NOT NULL DEFAULT 'abierta'
        CHECK (estado IN ('abierta', 'resuelta', 'cerrada')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. Comentarios (respuestas, con parent_id para respuestas directas)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foro_comentarios (
    id BIGSERIAL PRIMARY KEY,
    publicacion_id BIGINT NOT NULL REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
    autor_perfil_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    -- NULL = respuesta a la publicación; no-NULL = respuesta a otro comentario.
    parent_id BIGINT REFERENCES foro_comentarios(id) ON DELETE CASCADE,
    cuerpo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. Moderadores
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foro_moderadores (
    perfil_id UUID PRIMARY KEY REFERENCES public.perfiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. Índices
-- -----------------------------------------------------------------------------
-- Hilos de una sección, más recientes primero.
CREATE INDEX IF NOT EXISTS idx_foro_publicaciones_seccion_fecha
    ON foro_publicaciones (seccion_id, created_at DESC);

-- Comentarios de una publicación en orden cronológico.
CREATE INDEX IF NOT EXISTS idx_foro_comentarios_publicacion_fecha
    ON foro_comentarios (publicacion_id, created_at);

-- Secciones por tipo/facultad.
CREATE INDEX IF NOT EXISTS idx_foro_secciones_tipo_facultad
    ON foro_secciones (tipo, facultad_id);

-- -----------------------------------------------------------------------------
-- 6. Seguridad a nivel de fila
-- -----------------------------------------------------------------------------
ALTER TABLE foro_secciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_publicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_moderadores ENABLE ROW LEVEL SECURITY;

-- Ayudante: un perfil es moderador si figura en foro_moderadores.
-- Se define como función SECURITY INVOKER para uso dentro de las políticas.
CREATE OR REPLACE FUNCTION public.es_foro_moderador(p_perfil_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.foro_moderadores m
        WHERE m.perfil_id = p_perfil_id
    );
$$;

DO $$
BEGIN
    -- --- foro_secciones ---
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_secciones' AND policyname='foro_secciones_select') THEN
        CREATE POLICY foro_secciones_select ON foro_secciones
            FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_secciones' AND policyname='foro_secciones_insert_moderador') THEN
        CREATE POLICY foro_secciones_insert_moderador ON foro_secciones
            FOR INSERT WITH CHECK (public.es_foro_moderador(auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_secciones' AND policyname='foro_secciones_update_moderador') THEN
        CREATE POLICY foro_secciones_update_moderador ON foro_secciones
            FOR UPDATE USING (public.es_foro_moderador(auth.uid()))
            WITH CHECK (public.es_foro_moderador(auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_secciones' AND policyname='foro_secciones_delete_moderador') THEN
        CREATE POLICY foro_secciones_delete_moderador ON foro_secciones
            FOR DELETE USING (public.es_foro_moderador(auth.uid()));
    END IF;

    -- --- foro_publicaciones ---
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_publicaciones' AND policyname='foro_publicaciones_select') THEN
        CREATE POLICY foro_publicaciones_select ON foro_publicaciones
            FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_publicaciones' AND policyname='foro_publicaciones_insert_propio') THEN
        CREATE POLICY foro_publicaciones_insert_propio ON foro_publicaciones
            FOR INSERT WITH CHECK (auth.uid() = autor_perfil_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_publicaciones' AND policyname='foro_publicaciones_update_propio_mod') THEN
        CREATE POLICY foro_publicaciones_update_propio_mod ON foro_publicaciones
            FOR UPDATE USING (auth.uid() = autor_perfil_id OR public.es_foro_moderador(auth.uid()))
            WITH CHECK (auth.uid() = autor_perfil_id OR public.es_foro_moderador(auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_publicaciones' AND policyname='foro_publicaciones_delete_propio_mod') THEN
        CREATE POLICY foro_publicaciones_delete_propio_mod ON foro_publicaciones
            FOR DELETE USING (auth.uid() = autor_perfil_id OR public.es_foro_moderador(auth.uid()));
    END IF;

    -- --- foro_comentarios ---
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_comentarios' AND policyname='foro_comentarios_select') THEN
        CREATE POLICY foro_comentarios_select ON foro_comentarios
            FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_comentarios' AND policyname='foro_comentarios_insert_propio') THEN
        CREATE POLICY foro_comentarios_insert_propio ON foro_comentarios
            FOR INSERT WITH CHECK (auth.uid() = autor_perfil_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_comentarios' AND policyname='foro_comentarios_update_propio_mod') THEN
        CREATE POLICY foro_comentarios_update_propio_mod ON foro_comentarios
            FOR UPDATE USING (auth.uid() = autor_perfil_id OR public.es_foro_moderador(auth.uid()))
            WITH CHECK (auth.uid() = autor_perfil_id OR public.es_foro_moderador(auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_comentarios' AND policyname='foro_comentarios_delete_propio_mod') THEN
        CREATE POLICY foro_comentarios_delete_propio_mod ON foro_comentarios
            FOR DELETE USING (auth.uid() = autor_perfil_id OR public.es_foro_moderador(auth.uid()));
    END IF;

    -- --- foro_moderadores ---
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_moderadores' AND policyname='foro_moderadores_select') THEN
        CREATE POLICY foro_moderadores_select ON foro_moderadores
            FOR SELECT USING (true);
    END IF;
    -- La gestión de moderadores (INSERT/DELETE) se deja solo al service_role:
    -- es una acción administrativa de alto privilegio, no se expone al cliente.
END $$;

-- -----------------------------------------------------------------------------
-- 7. Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema='public' AND table_name LIKE 'foro%';
--
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname='public' AND tablename LIKE 'foro%'
-- ORDER BY tablename, policyname;