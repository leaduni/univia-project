-- =============================================================================
-- Migración — DM: búsqueda de contactos + hardening RLS/grants + updated_at
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Objetivos:
--   1. Búsqueda autenticada de destinatarios por nombre, usuario (alias),
--      código de estudiante o email, con email enmascarado en el resultado.
--   2. El orden de la bandeja se basa en `conversaciones_dm.updated_at`, que
--      nunca se mantenía (sin política UPDATE ni trigger). Un trigger sobre
--      `mensajes_dm` lo actualiza al insertar.
--   3. Revocar permisos por defecto de Supabase (`anon` no toca DM) y dejar a
--      `authenticated` solo lectura/creación y `UPDATE(leido)` en mensajes.
--
-- Idempotente: puede ejecutarse varias veces sin efecto adicional.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Búsqueda de contactos (SOLO service_role; el backend valida la sesión)
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER: `perfiles` tiene RLS self-only, así que un rol autenticado
-- no puede leer perfiles ajenos ni siquiera dentro de una función invoker.
-- El backend autentica al usuario y pasa `p_usuario_excluir`; el rol cliente
-- JAMÁS ejecuta esta función (revoke público + grant service_role).
CREATE OR REPLACE FUNCTION public.buscar_perfiles_para_dm(
    p_texto text DEFAULT NULL,
    p_limite integer DEFAULT 10,
    p_usuario_excluir uuid DEFAULT NULL
)
RETURNS TABLE (
    perfil_id uuid,
    nombre_completo text,
    alias_publico text,
    avatar_url text,
    codigo_estudiante text,
    email_enmascarado text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $func$
    WITH q AS (
        SELECT
            replace(
                replace(
                    replace(btrim(coalesce(p_texto, '')), '%', ''),
                    '_', ''
                ),
                chr(92), ''
            ) AS termino,
            LEAST(GREATEST(coalesce(p_limite, 10), 1), 20) AS tope
    )
    SELECT
        p.id,
        p.nombre_completo,
        g.alias_publico,
        p.avatar_url,
        p.codigo_estudiante,
        CASE
            WHEN position('@' IN p.email) > 1 THEN
                left(p.email, 1) || '***@' || substr(p.email, position('@' IN p.email) + 1)
            ELSE NULL
        END
    FROM public.perfiles p
    LEFT JOIN public.gamificacion_usuarios g ON g.perfil_id = p.id
    CROSS JOIN q
    WHERE (p_usuario_excluir IS NULL OR p.id <> p_usuario_excluir)
      AND char_length(q.termino) >= 2
      AND (
          lower(coalesce(p.nombre_completo, '')) LIKE lower(q.termino) || '%'
          OR lower(coalesce(g.alias_publico, '')) LIKE lower(q.termino) || '%'
          OR lower(coalesce(p.codigo_estudiante, '')) LIKE lower(q.termino) || '%'
          OR lower(coalesce(p.email, '')) LIKE lower(q.termino) || '%'
      )
    ORDER BY
        CASE
            WHEN lower(coalesce(p.nombre_completo, '')) = lower(q.termino) THEN 0
            WHEN lower(coalesce(g.alias_publico, '')) = lower(q.termino) THEN 1
            WHEN lower(coalesce(p.codigo_estudiante, '')) = lower(q.termino) THEN 2
            WHEN lower(coalesce(p.email, '')) = lower(q.termino) THEN 3
            ELSE 4
        END,
        lower(coalesce(p.nombre_completo, '')) ASC,
        lower(coalesce(g.alias_publico, '')) ASC
    LIMIT (SELECT tope FROM q);
$func$;

REVOKE ALL ON FUNCTION public.buscar_perfiles_para_dm(text, integer, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.buscar_perfiles_para_dm(text, integer, uuid) TO service_role;

-- Índices funcionales de prefijo para que la búsqueda no haga seqscan a futuro.
CREATE INDEX IF NOT EXISTS idx_perfiles_nombre_busca
    ON public.perfiles (lower(nombre_completo) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_perfiles_email_busca
    ON public.perfiles (lower(email) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_perfiles_codigo_busca
    ON public.perfiles (lower(codigo_estudiante) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_gamificacion_alias_busca
    ON public.gamificacion_usuarios (lower(alias_publico) text_pattern_ops);

-- -----------------------------------------------------------------------------
-- 2. updated_at de conversaciones al insertar mensajes (trigger)
-- -----------------------------------------------------------------------------
-- El backend ya no hace UPDATE sobre conversaciones_dm (carecía de políticas y
-- GRANT). El trigger corre como definer (espacio de nombres fijo) para evitar
-- recursión con RLS y conseguir la semántica de bandeja "más recientes primero".
CREATE OR REPLACE FUNCTION public.tg_dm_actualizar_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
BEGIN
    UPDATE public.conversaciones_dm
       SET updated_at = now()
     WHERE id = NEW.conversacion_dm_id;
    RETURN NEW;
END;
$func$;

REVOKE ALL ON FUNCTION public.tg_dm_actualizar_updated_at() FROM public;

DROP TRIGGER IF EXISTS tg_conversaciones_dm_updated_at ON public.mensajes_dm;
CREATE TRIGGER tg_conversaciones_dm_updated_at
    AFTER INSERT ON public.mensajes_dm
    FOR EACH ROW
    EXECUTE FUNCTION public.tg_dm_actualizar_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Grants mínimos para los roles de cliente
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE public.conversaciones_dm FROM anon;
REVOKE ALL ON TABLE public.mensajes_dm FROM anon;

REVOKE ALL ON TABLE public.conversaciones_dm FROM authenticated;
REVOKE ALL ON TABLE public.mensajes_dm FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.conversaciones_dm TO authenticated;
GRANT SELECT, INSERT ON TABLE public.mensajes_dm TO authenticated;
-- Marcar leído: columna concreta, no toda la fila.
GRANT UPDATE (leido) ON TABLE public.mensajes_dm TO authenticated;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'conversaciones_dm_id_seq'
    ) THEN
        GRANT USAGE ON SEQUENCE public.conversaciones_dm_id_seq TO authenticated;
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'mensajes_dm_id_seq'
    ) THEN
        GRANT USAGE ON SEQUENCE public.mensajes_dm_id_seq TO authenticated;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Políticas RLS explícitas para authenticated
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS conversaciones_dm_select_miembro ON public.conversaciones_dm;
DROP POLICY IF EXISTS conversaciones_dm_insert_miembro ON public.conversaciones_dm;

CREATE POLICY conversaciones_dm_select_miembro ON public.conversaciones_dm
    FOR SELECT TO authenticated
    USING (auth.uid() IN (usuario_a, usuario_b));

CREATE POLICY conversaciones_dm_insert_miembro ON public.conversaciones_dm
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IN (usuario_a, usuario_b));

DROP POLICY IF EXISTS mensajes_dm_select_miembro ON public.mensajes_dm;
DROP POLICY IF EXISTS mensajes_dm_insert_remitente ON public.mensajes_dm;
DROP POLICY IF EXISTS mensajes_dm_update_leido_destinatario ON public.mensajes_dm;

CREATE POLICY mensajes_dm_select_miembro ON public.mensajes_dm
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversaciones_dm d
            WHERE d.id = mensajes_dm.conversacion_dm_id
              AND auth.uid() IN (d.usuario_a, d.usuario_b)
        )
    );

CREATE POLICY mensajes_dm_insert_remitente ON public.mensajes_dm
    FOR INSERT TO authenticated
    WITH CHECK (
        remitente_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversaciones_dm d
            WHERE d.id = mensajes_dm.conversacion_dm_id
              AND auth.uid() IN (d.usuario_a, d.usuario_b)
        )
    );

-- Marcar leído: solo mensajes RECIBIDOS (remitente distinto de auth.uid()),
-- nunca el propio. El GRANT column-level de `leido` complementa esta regla.
CREATE POLICY mensajes_dm_update_leido_destinatario ON public.mensajes_dm
    FOR UPDATE TO authenticated
    USING (
        remitente_id <> auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversaciones_dm d
            WHERE d.id = mensajes_dm.conversacion_dm_id
              AND auth.uid() IN (d.usuario_a, d.usuario_b)
        )
    )
    WITH CHECK (
        remitente_id <> auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversaciones_dm d
            WHERE d.id = mensajes_dm.conversacion_dm_id
              AND auth.uid() IN (d.usuario_a, d.usuario_b)
        )
    );

-- -----------------------------------------------------------------------------
-- Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT tablename, policyname, roles, cmd FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('conversaciones_dm','mensajes_dm');
--
-- SELECT table_name, grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public'
--   AND table_name IN ('conversaciones_dm','mensajes_dm')
-- ORDER BY table_name, grantee, privilege_type;
--
-- SELECT proname, prosecdef, proconfig FROM pg_proc
-- WHERE proname IN ('buscar_perfiles_para_dm','tg_dm_actualizar_updated_at');