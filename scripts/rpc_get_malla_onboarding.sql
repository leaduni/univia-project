-- =============================================================================
-- RPC: get_malla_onboarding — Optimización de Onboarding
-- =============================================================================
-- Proyecto: UniVia (leaduni/univia-project)
-- Propósito: Reemplazar 3 consultas HTTP + BFS en Python por 1 sola llamada RPC
-- Schema:    public (accesible vía supabase.rpc())
-- 
-- Ejecutar en: Supabase SQL Editor (https://supabase.com/dashboard)
-- 
-- IDEMPOTENTE: CREATE OR REPLACE — se puede ejecutar múltiples veces
-- =============================================================================

CREATE OR REPLACE FUNCTION get_malla_onboarding(
    p_malla_id INTEGER,
    p_perfil_id UUID,
    p_ciclo_actual INTEGER DEFAULT 1
)
RETURNS TABLE (
    curso_id INTEGER,
    code VARCHAR,
    name VARCHAR,
    credits INTEGER,
    ciclo INTEGER,
    tipo VARCHAR,
    status VARCHAR,
    prerrequisito_ids INTEGER[],
    prerrequisitos_faltantes JSONB
)
LANGUAGE sql
STABLE
AS $$
    WITH RECURSIVE
    -- 1. Cursos visibles de la malla (hasta el ciclo actual del estudiante)
    cursos_malla AS (
        SELECT
            mc.id AS mc_id,
            mc.curso_id,
            mc.ciclo,
            mc.credits,
            mc.tipo,
            c.code,
            c.name
        FROM malla_cursos mc
        JOIN cursos c ON c.id = mc.curso_id
        WHERE mc.malla_id = p_malla_id
          AND mc.ciclo <= p_ciclo_actual
    ),

    -- 2. Prerrequisitos directos (traducidos de malla_curso_id a curso_id)
    prereqs_directos AS (
        SELECT
            mc_src.curso_id AS curso_id,
            mc_prq.curso_id AS prereq_curso_id
        FROM malla_curso_prerrequisitos mcp
        JOIN cursos_malla mc_src ON mc_src.mc_id = mcp.malla_curso_id
        JOIN cursos_malla mc_prq ON mc_prq.mc_id = mcp.prerrequisito_malla_curso_id
    ),

    -- 3. Prerrequisitos transitivos (recursive CTE — reemplaza el BFS en Python)
    prereqs_transitivos AS (
        -- Base: prerrequisitos directos
        SELECT curso_id, prereq_curso_id, 1 AS depth
        FROM prereqs_directos

        UNION ALL

        -- Recursivo: prerrequisitos de prerrequisitos
        SELECT pt.curso_id, pd.prereq_curso_id, pt.depth + 1
        FROM prereqs_transitivos pt
        JOIN prereqs_directos pd ON pd.curso_id = pt.prereq_curso_id
        WHERE pt.depth < 10  -- safety limit: max 10 niveles de profundidad
    ),

    -- 4. Progreso del estudiante (solo cursos completados)
    progreso AS (
        SELECT curso_id
        FROM progreso_cursos
        WHERE perfil_id = p_perfil_id
          AND status = 'completed'
    ),

    -- 5. Evaluar estado de cada curso (misma lógica que check_course_status)
    estado_curso AS (
        SELECT
            cm.curso_id,
            cm.code,
            cm.name,
            cm.credits,
            cm.ciclo,
            cm.tipo,
            CASE
                WHEN pc.status = 'completed'   THEN 'completed'
                WHEN pc.status = 'in_progress' THEN 'in_progress'
                WHEN pt_all.prereq_curso_id IS NULL THEN 'available'
                WHEN bool_and(
                    pt_all.prereq_curso_id IS NULL
                    OR pg.curso_id IS NOT NULL
                ) THEN 'available'
                ELSE 'locked'
            END AS status,
            -- IDs de prerrequisitos directos (solo los inmediatos, no transitivos)
            COALESCE(
                array_agg(DISTINCT pd.prereq_curso_id)
                    FILTER (WHERE pd.prereq_curso_id IS NOT NULL),
                ARRAY[]::INTEGER[]
            ) AS prerrequisito_ids,
            -- Prerrequisitos faltantes como JSONB (listo para el frontend)
            COALESCE(
                jsonb_agg(
                    DISTINCT jsonb_build_object(
                        'id', cm_prq.curso_id,
                        'code', cm_prq.code,
                        'name', cm_prq.name
                    )
                ) FILTER (
                    WHERE pt_all.prereq_curso_id IS NOT NULL
                      AND pg.curso_id IS NULL
                ),
                '[]'::jsonb
            ) AS prerrequisitos_faltantes
        FROM cursos_malla cm
        LEFT JOIN progreso_cursos pc
            ON pc.perfil_id = p_perfil_id AND pc.curso_id = cm.curso_id
        LEFT JOIN prereqs_transitivos pt_all
            ON pt_all.curso_id = cm.curso_id
        LEFT JOIN progreso pg
            ON pg.curso_id = pt_all.prereq_curso_id
        LEFT JOIN prereqs_directos pd
            ON pd.curso_id = cm.curso_id
        LEFT JOIN cursos_malla cm_prq
            ON cm_prq.curso_id = pt_all.prereq_curso_id
            AND pg.curso_id IS NULL
        GROUP BY
            cm.curso_id, cm.code, cm.name, cm.credits,
            cm.ciclo, cm.tipo, pc.status
    )

    SELECT * FROM estado_curso
    ORDER BY ciclo, name;
$$;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Reemplazar <malla_id> y <perfil_id> con valores reales para probar:
--
-- SELECT * FROM get_malla_onboarding(
--     p_malla_id := 16,
--     p_perfil_id := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
--     p_ciclo_actual := 3
-- );
