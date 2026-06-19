-- ============================================================================
-- RPC: search_resource_chunks_by_nombre
-- ----------------------------------------------------------------------------
-- Búsqueda semántica de fragmentos (resource_chunks) filtrando por el NOMBRE
-- del curso en lugar de por un curso_id específico.
--
-- Motivo: cada curso existe varias veces en la tabla `cursos` (una fila por
-- carrera: _SIS, _SOFT, _IND). Un mismo compendio/examen aplica a todas esas
-- versiones del curso. Filtrar por nombre permite ingestar el material UNA sola
-- vez (bajo un único curso_id) y recuperarlo para cualquier carrera que comparta
-- el mismo nombre de curso (ej. "Geometría Analítica").
--
-- Aplicar este script en el SQL Editor de Supabase (requiere rol con permisos
-- DDL; la anon key del backend NO puede crear funciones).
-- ============================================================================

CREATE OR REPLACE FUNCTION search_resource_chunks_by_nombre(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_curso_nombre text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    recurso_id integer,
    curso_id integer,
    contenido text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rc.id,
        rc.recurso_id,
        rc.curso_id,
        rc.contenido,
        1 - (rc.embedding <=> query_embedding) AS similarity
    FROM resource_chunks rc
    JOIN cursos c ON c.id = rc.curso_id
    WHERE (
            filter_curso_nombre IS NULL
            OR lower(trim(c.name)) = lower(trim(filter_curso_nombre))
          )
      AND 1 - (rc.embedding <=> query_embedding) > match_threshold
    ORDER BY rc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
