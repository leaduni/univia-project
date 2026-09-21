-- =============================================================================
-- Migración — Optimización de rendimiento: índices B-Tree
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Objetivo: eliminar full scans y acelerar los filtros/joins más usados por
-- los endpoints de foro, DM, recursos, RAG, dashboard y malla.
--
-- Índices agregados:
--   - perfiles(carrera_id)          -> resolución de facultad del usuario
--   - carreras(facultad_id)         -> join carrera -> facultad
--   - recursos(profesor_id)         -> filtro por profesor en RAG/búsqueda
--   - resource_chunks(curso_id)     -> filtro principal de las RPC de RAG
--   - foro_publicaciones(autor_perfil_id) -> listados por autor
--   - foro_comentarios(autor_perfil_id)   -> listados por autor
--   - foro_comentarios(parent_id)         -> respuestas anidadas
--   - mensajes_dm(remitente_id)           -> mensajes enviados por usuario
--
-- Idempotente: puede ejecutarse varias veces sin efecto adicional.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- Perfiles: filtrar por carrera (usado en _facultad_del_usuario, foro, DM).
CREATE INDEX IF NOT EXISTS idx_perfiles_carrera_id
    ON public.perfiles (carrera_id);

-- Carreras: filtrar por facultad (join carrera -> facultad).
CREATE INDEX IF NOT EXISTS idx_carreras_facultad_id
    ON public.carreras (facultad_id);

-- Recursos: filtrar por profesor (RAG / búsqueda por docente).
CREATE INDEX IF NOT EXISTS idx_recursos_profesor_id
    ON public.recursos (profesor_id);

-- Chunks RAG: filtrar por curso (filtro principal de las RPC de búsqueda).
CREATE INDEX IF NOT EXISTS idx_resource_chunks_curso_id
    ON public.resource_chunks (curso_id);

-- Foro: listar publicaciones de un autor.
CREATE INDEX IF NOT EXISTS idx_foro_publicaciones_autor
    ON public.foro_publicaciones (autor_perfil_id);

-- Foro: listar comentarios de un autor.
CREATE INDEX IF NOT EXISTS idx_foro_comentarios_autor
    ON public.foro_comentarios (autor_perfil_id);

-- Foro: respuestas anidadas por parent_id.
CREATE INDEX IF NOT EXISTS idx_foro_comentarios_parent
    ON public.foro_comentarios (parent_id);

-- DM: mensajes enviados por un remitente.
CREATE INDEX IF NOT EXISTS idx_mensajes_dm_remitente
    ON public.mensajes_dm (remitente_id);

-- -----------------------------------------------------------------------------
-- Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT indexname, tablename, indexdef FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--     'idx_perfiles_carrera_id', 'idx_carreras_facultad_id',
--     'idx_recursos_profesor_id',
--     'idx_resource_chunks_curso_id', 'idx_foro_publicaciones_autor',
--     'idx_foro_comentarios_autor', 'idx_foro_comentarios_parent',
--     'idx_mensajes_dm_remitente'
--   ) ORDER BY tablename, indexname;