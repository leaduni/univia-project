-- =============================================================================
-- REMEDIACIÓN RLS — Habilita Row Level Security en las 9 tablas expuestas
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Contexto (hallazgo del advisor de Supabase, auditoría vía MCP):
--   Estas tablas tenían RLS deshabilitado, lo que las deja totalmente visibles
--   (lectura y escritura) para los roles `anon` y `authenticated` usados por las
--   bibliotecas cliente. Cualquier persona con la anon key podía leer o modificar
--   todas las filas.
--
-- Decisión de diseño:
--   - Se habilita RLS y se otorga SOLO lectura pública (`FOR SELECT USING (true)`)
--     para `anon`/`authenticated`. Es un catálogo de datos de la universidad
--     (facultades, carreras, recursos, chunks vectoriales, profesores) cuya
--     naturaleza es pública de lectura.
--   - NO se otorga INSERT/UPDATE/DELETE a los roles de cliente: la escritura se
--     delega exclusivamente en `service_role` (backend con clave de servicio) y
--     en las RPC protegidas que ya existen (p. ej. replace_resource_chunks).
--   - No habilitar RLS sin políticas bloquearía todo el acceso, por eso cada
--     ALTER va acompañado de su política de SELECT.
--
-- Idempotente: puede ejecutarse varias veces sin efecto adicional.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. facultades — catálogo público de facultades
-- -----------------------------------------------------------------------------
ALTER TABLE public.facultades ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'facultades'
          AND policyname = 'facultades_select_publico'
    ) THEN
        CREATE POLICY facultades_select_publico ON public.facultades
            FOR SELECT USING (true);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. progreso_cursos — avance de cada estudiante por curso
-- -----------------------------------------------------------------------------
-- Nota: el avance académico es dato personal. A diferencia de las demás, aquí
-- la lectura pública no tiene sentido; se expone el avance solo a su dueño,
-- replicando el patrón de chat_mensajes. La escritura sigue siendo del backend.
ALTER TABLE public.progreso_cursos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'progreso_cursos'
          AND policyname = 'progreso_cursos_select_propio'
    ) THEN
        CREATE POLICY progreso_cursos_select_propio ON public.progreso_cursos
            FOR SELECT USING (auth.uid() = perfil_id);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. recursos — banco de exámenes, prácticas, sílabos y libros (lectura pública)
-- -----------------------------------------------------------------------------
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'recursos'
          AND policyname = 'recursos_select_publico'
    ) THEN
        CREATE POLICY recursos_select_publico ON public.recursos
            FOR SELECT USING (true);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. logros — catálogo de logros (lectura pública)
-- -----------------------------------------------------------------------------
ALTER TABLE public.logros ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'logros'
          AND policyname = 'logros_select_publico'
    ) THEN
        CREATE POLICY logros_select_publico ON public.logros
            FOR SELECT USING (true);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. logros_usuarios — logros desbloqueados por cada estudiante (solo propio)
-- -----------------------------------------------------------------------------
ALTER TABLE public.logros_usuarios ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'logros_usuarios'
          AND policyname = 'logros_usuarios_select_propio'
    ) THEN
        CREATE POLICY logros_usuarios_select_propio ON public.logros_usuarios
            FOR SELECT USING (auth.uid() = perfil_id);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. curso_prerrequisitos — estructura de prerrequisitos (lectura pública)
-- -----------------------------------------------------------------------------
ALTER TABLE public.curso_prerrequisitos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'curso_prerrequisitos'
          AND policyname = 'curso_prerrequisitos_select_publico'
    ) THEN
        CREATE POLICY curso_prerrequisitos_select_publico ON public.curso_prerrequisitos
            FOR SELECT USING (true);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 7. resource_chunks — corpus vectorial del RAG (lectura pública, no escritura)
-- -----------------------------------------------------------------------------
-- La escritura se hace exclusivamente por las RPC protegidas replace_resource_chunks
-- y las inserciones directas del service_role; no se otorga INSERT/UPDATE/DELETE
-- a los roles de cliente.
ALTER TABLE public.resource_chunks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'resource_chunks'
          AND policyname = 'resource_chunks_select_publico'
    ) THEN
        CREATE POLICY resource_chunks_select_publico ON public.resource_chunks
            FOR SELECT USING (true);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 8. profesores — catálogo de docentes (lectura pública)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profesores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profesores'
          AND policyname = 'profesores_select_publico'
    ) THEN
        CREATE POLICY profesores_select_publico ON public.profesores
            FOR SELECT USING (true);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 9. curso_profesores — relación N:N cursos <-> profesores (lectura pública)
-- -----------------------------------------------------------------------------
ALTER TABLE public.curso_profesores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'curso_profesores'
          AND policyname = 'curso_profesores_select_publico'
    ) THEN
        CREATE POLICY curso_profesores_select_publico ON public.curso_profesores
            FOR SELECT USING (true);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
--
-- SELECT relname, relrowsecurity FROM pg_class
-- WHERE relname IN ('facultades','progreso_cursos','recursos','logros',
--                   'logros_usuarios','curso_prerrequisitos','resource_chunks',
--                   'profesores','curso_profesores');