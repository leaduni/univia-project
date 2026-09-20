-- =============================================================================
-- Migración — Fase 5 Foro: Feed global (búsqueda, guardados, vistas, contadores)
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Contexto:
--   El foro pasa de "lista de secciones" a un Feed Global de 3 columnas. Esta
--   migración prepara la base de datos para el endpoint unificado
--   GET /api/foro/feed: búsqueda full-text, hilos guardados, métrica de vistas
--   y contadores desnormalizados mantenidos por triggers (adiós al cómputo en
--   Python / lecturas N+1 de fases 1-2).
--
-- Cambios:
--   1. foro_publicaciones: + search_vector (tsvector generado), num_vistas,
--      num_comentarios, num_votos (desnormalizados), portada_url, tipo_contenido.
--   2. foro_comentarios: + num_votos (desnormalizado).
--   3. foro_guardados: tabla de bookmarks con UNIQUE(perfil_id, publicacion_id).
--   4. Triggers que mantienen num_comentarios/num_votos consistentes con
--      foro_comentarios y foro_votos (fuente de verdad única para votos).
--   5. RPC foro_registrar_vista(publicacion_id): incremento por sesión/usuario
--      vía tabla foro_vistas (un voto de vista por usuario y hilo).
--   6. Backfill: los contadores se inicializan desde el estado actual real.
--   7. Índices GIN (full-text) y de soporte para ordenar/filtrar el feed.
--
-- RLS: `foro_guardados` solo expone al dueño (auth.uid() = perfil_id);
--      `foro_vistas` solo INSERT del propio usuario. Lectura pública del conteo
--      ya vive en las columnas de foro_publicaciones.
--
-- Idempotente: puede ejecutarse varias veces sin efecto adicional.
-- Ejecutar en el SQL Editor de Supabase (o vía MCP apply_migration).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Nuevas columnas en foro_publicaciones
-- -----------------------------------------------------------------------------
-- Adjuntos / tipo de contenido (futuro: imagen, código, enlace).
ALTER TABLE foro_publicaciones ADD COLUMN IF NOT EXISTS portada_url TEXT;
ALTER TABLE foro_publicaciones ADD COLUMN IF NOT EXISTS tipo_contenido VARCHAR(16) NOT NULL DEFAULT 'text';

-- Contadores desnormalizados (mantenidos por triggers, sección 5).
ALTER TABLE foro_publicaciones ADD COLUMN IF NOT EXISTS num_comentarios INT NOT NULL DEFAULT 0;
ALTER TABLE foro_publicaciones ADD COLUMN IF NOT EXISTS num_votos INT NOT NULL DEFAULT 0;
ALTER TABLE foro_publicaciones ADD COLUMN IF NOT EXISTS num_vistas INT NOT NULL DEFAULT 0;

-- Vector de búsqueda full-text sobre título (peso A), cuerpo (B) y tags (C).
-- to_tsvector con config de idioma no es IMMUTABLE y Postgres exige
-- inmutabilidad en columnas generadas: se envuelve en una función IMMUTABLE.
CREATE OR REPLACE FUNCTION public.foro_tsv(p_titulo TEXT, p_cuerpo TEXT, p_tags TEXT[])
RETURNS tsvector
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
    SELECT setweight(to_tsvector('spanish'::regconfig, coalesce(p_titulo, '')), 'A') ||
           setweight(to_tsvector('spanish'::regconfig, coalesce(p_cuerpo, '')), 'B') ||
           setweight(to_tsvector('spanish'::regconfig, coalesce(array_to_string(p_tags, ' '), '')), 'C');
$$;

-- GENERATED ALWAYS: Postgres lo recalcula solo en INSERT/UPDATE; un trigger
-- extra es innecesario.
ALTER TABLE foro_publicaciones ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (public.foro_tsv(titulo, cuerpo, tags)) STORED;

-- -----------------------------------------------------------------------------
-- 2. Nuevas columnas en foro_comentarios
-- -----------------------------------------------------------------------------
ALTER TABLE foro_comentarios ADD COLUMN IF NOT EXISTS num_votos INT NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- 3. Tabla de hilos guardados (bookmarks)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foro_guardados (
    id BIGSERIAL PRIMARY KEY,
    perfil_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    publicacion_id BIGINT NOT NULL REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (perfil_id, publicacion_id)
);

-- -----------------------------------------------------------------------------
-- 4. Tabla de vistas únicas por usuario (alimenta num_vistas)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foro_vistas (
    id BIGSERIAL PRIMARY KEY,
    perfil_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    publicacion_id BIGINT NOT NULL REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (perfil_id, publicacion_id)
);

-- -----------------------------------------------------------------------------
-- 5. Triggers de contadores desnormalizados
-- -----------------------------------------------------------------------------

-- 5a. num_comentarios: +/-1 por INSERT/DELETE en foro_comentarios.
CREATE OR REPLACE FUNCTION public.foro_sync_num_comentarios()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE foro_publicaciones
           SET num_comentarios = num_comentarios + 1
         WHERE id = NEW.publicacion_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE foro_publicaciones
           SET num_comentarios = GREATEST(num_comentarios - 1, 0)
         WHERE id = OLD.publicacion_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_foro_comentarios_count ON foro_comentarios;
CREATE TRIGGER trg_foro_comentarios_count
    AFTER INSERT OR DELETE ON foro_comentarios
    FOR EACH ROW EXECUTE FUNCTION public.foro_sync_num_comentarios();

-- 5b. num_votos en publicaciones y comentarios: recalcula el delta del voto
--     afectado (INSERT/UPDATE/DELETE sobre foro_votos). foro_votos sigue siendo
--     la fuente de verdad; estas columnas son una proyección para lectura.
CREATE OR REPLACE FUNCTION public.foro_sync_num_votos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.publicacion_id IS NOT NULL THEN
            UPDATE foro_publicaciones SET num_votos = num_votos + NEW.valor WHERE id = NEW.publicacion_id;
        ELSIF NEW.comentario_id IS NOT NULL THEN
            UPDATE foro_comentarios SET num_votos = num_votos + NEW.valor WHERE id = NEW.comentario_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Cambio de voto (up <-> down): delta = nuevo - viejo.
        IF NEW.publicacion_id IS NOT NULL THEN
            UPDATE foro_publicaciones SET num_votos = num_votos + (NEW.valor - OLD.valor) WHERE id = NEW.publicacion_id;
        ELSIF NEW.comentario_id IS NOT NULL THEN
            UPDATE foro_comentarios SET num_votos = num_votos + (NEW.valor - OLD.valor) WHERE id = NEW.comentario_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.publicacion_id IS NOT NULL THEN
            UPDATE foro_publicaciones SET num_votos = num_votos - OLD.valor WHERE id = OLD.publicacion_id;
        ELSIF OLD.comentario_id IS NOT NULL THEN
            UPDATE foro_comentarios SET num_votos = num_votos - OLD.valor WHERE id = OLD.comentario_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_foro_votos_count ON foro_votos;
CREATE TRIGGER trg_foro_votos_count
    AFTER INSERT OR UPDATE OR DELETE ON foro_votos
    FOR EACH ROW EXECUTE FUNCTION public.foro_sync_num_votos();

-- 5c. num_vistas: se mantiene vía RPC (sección 6), no con trigger sobre
--     foro_vistas, para centralizar la semántica de "una vista por usuario".

-- -----------------------------------------------------------------------------
-- 6. RPC: registrar vista de un hilo (una por usuario y hilo)
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER para que el trigger-free UPDATE a foro_publicaciones pueda
-- correr aunque el UPDATE policy de publicaciones se limite al autor. La RPC
-- es atómica: si el INSERT choca con el UNIQUE ya registrado, no incrementa.
CREATE OR REPLACE FUNCTION public.foro_registrar_vista(p_publicacion_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_afectadas INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    INSERT INTO foro_vistas (perfil_id, publicacion_id)
    VALUES (auth.uid(), p_publicacion_id)
    ON CONFLICT (perfil_id, publicacion_id) DO NOTHING;

    GET DIAGNOSTICS v_afectadas = ROW_COUNT;
    IF v_afectadas > 0 THEN
        UPDATE foro_publicaciones
           SET num_vistas = num_vistas + 1
         WHERE id = p_publicacion_id;
    END IF;
    RETURN v_afectadas > 0;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. Backfill de contadores con el estado actual (seguro si ya está al día)
-- -----------------------------------------------------------------------------
UPDATE foro_publicaciones p
   SET num_comentarios = agg.total
  FROM (SELECT publicacion_id, COUNT(*) AS total
          FROM foro_comentarios GROUP BY publicacion_id) agg
 WHERE agg.publicacion_id = p.id;

UPDATE foro_publicaciones p
   SET num_votos = COALESCE(agg.total, 0)
  FROM (SELECT publicacion_id, SUM(valor) AS total
          FROM foro_votos WHERE publicacion_id IS NOT NULL GROUP BY publicacion_id) agg
 WHERE agg.publicacion_id = p.id;

UPDATE foro_comentarios c
   SET num_votos = COALESCE(agg.total, 0)
  FROM (SELECT comentario_id, SUM(valor) AS total
          FROM foro_votos WHERE comentario_id IS NOT NULL GROUP BY comentario_id) agg
 WHERE agg.comentario_id = c.id;

UPDATE foro_publicaciones p
   SET num_vistas = agg.total
  FROM (SELECT publicacion_id, COUNT(*) AS total
          FROM foro_vistas GROUP BY publicacion_id) agg
 WHERE agg.publicacion_id = p.id;

-- -----------------------------------------------------------------------------
-- 8. Índices
-- -----------------------------------------------------------------------------
-- Full-text search del feed.
CREATE INDEX IF NOT EXISTS idx_foro_publicaciones_search
    ON foro_publicaciones USING GIN (search_vector);

-- Feed por fecha y por tendencia (score calculado en SQL con estos contadores).
CREATE INDEX IF NOT EXISTS idx_foro_publicaciones_fecha
    ON foro_publicaciones (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_foro_publicaciones_tendencia
    ON foro_publicaciones (num_comentarios DESC, num_votos DESC, created_at DESC);

-- Guardados/vistas por usuario.
CREATE INDEX IF NOT EXISTS idx_foro_guardados_perfil
    ON foro_guardados (perfil_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_foro_vistas_publicacion
    ON foro_vistas (publicacion_id);

-- -----------------------------------------------------------------------------
-- 9. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE foro_guardados ENABLE ROW LEVEL SECURITY;
ALTER TABLE foro_vistas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- foro_guardados: cada usuario gestiona solo sus propios guardados.
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_guardados' AND policyname='foro_guardados_select_propio') THEN
        CREATE POLICY foro_guardados_select_propio ON foro_guardados
            FOR SELECT USING (auth.uid() = perfil_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_guardados' AND policyname='foro_guardados_insert_propio') THEN
        CREATE POLICY foro_guardados_insert_propio ON foro_guardados
            FOR INSERT WITH CHECK (auth.uid() = perfil_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_guardados' AND policyname='foro_guardados_delete_propio') THEN
        CREATE POLICY foro_guardados_delete_propio ON foro_guardados
            FOR DELETE USING (auth.uid() = perfil_id);
    END IF;

    -- foro_vistas: solo INSERT del propio usuario (leído vía RPC/columna, no
    -- se expone la tabla para no filtrar comportamiento de lectura).
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='foro_vistas' AND policyname='foro_vistas_insert_propio') THEN
        CREATE POLICY foro_vistas_insert_propio ON foro_vistas
            FOR INSERT WITH CHECK (auth.uid() = perfil_id);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 10. Endurecimiento: las funciones auxiliares no deben ser invocables vía API
--     (PostgREST expone las funciones de public por defecto).
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.foro_sync_num_comentarios() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.foro_sync_num_votos() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.foro_tsv(TEXT, TEXT, TEXT[]) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.foro_registrar_vista(BIGINT) FROM anon;
GRANT EXECUTE ON FUNCTION public.foro_registrar_vista(BIGINT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 11. Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='foro_publicaciones' AND column_name IN
--   ('search_vector','num_vistas','num_comentarios','num_votos','portada_url','tipo_contenido');
--
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename IN ('foro_guardados','foro_vistas');
