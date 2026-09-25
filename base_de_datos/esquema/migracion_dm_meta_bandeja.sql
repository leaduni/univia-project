-- =============================================================================
-- Migración — Meta de bandeja DM (último mensaje + no leídos sin full-scan)
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Sustituye el patrón del backend que descargaba TODOS los mensajes_dm de las
-- conversaciones del usuario para calcular último mensaje y no_leídos.
--
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- SECURITY INVOKER: respeta RLS de mensajes_dm (solo miembros).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.dm_meta_bandeja(
    p_user_id uuid,
    p_conv_ids bigint[]
)
RETURNS TABLE (
    conversacion_dm_id bigint,
    ultimo_cuerpo text,
    ultimo_created_at timestamptz,
    no_leidos bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    WITH ultimos AS (
        SELECT DISTINCT ON (m.conversacion_dm_id)
            m.conversacion_dm_id,
            m.cuerpo AS ultimo_cuerpo,
            m.created_at AS ultimo_created_at
        FROM public.mensajes_dm m
        WHERE m.conversacion_dm_id = ANY (p_conv_ids)
        ORDER BY m.conversacion_dm_id, m.created_at DESC
    ),
    unread AS (
        SELECT
            m.conversacion_dm_id,
            COUNT(*)::bigint AS no_leidos
        FROM public.mensajes_dm m
        WHERE m.conversacion_dm_id = ANY (p_conv_ids)
          AND m.leido = false
          AND m.remitente_id <> p_user_id
        GROUP BY m.conversacion_dm_id
    )
    SELECT
        c.id AS conversacion_dm_id,
        u.ultimo_cuerpo,
        u.ultimo_created_at,
        COALESCE(ur.no_leidos, 0) AS no_leidos
    FROM unnest(p_conv_ids) AS c(id)
    LEFT JOIN ultimos u ON u.conversacion_dm_id = c.id
    LEFT JOIN unread ur ON ur.conversacion_dm_id = c.id;
$$;

GRANT EXECUTE ON FUNCTION public.dm_meta_bandeja(uuid, bigint[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dm_meta_bandeja(uuid, bigint[]) TO service_role;
