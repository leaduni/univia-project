-- =============================================================================
-- SEED — Primer Moderador del Foro
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Asigna el PRIMER moderador del foro. La gestión de moderadores está
-- restringida al service_role (no se expone INSERT al cliente), y el endpoint
-- POST /foro/moderadores exige que el llamador ya sea moderador — por lo que se
-- necesita este bootstrap para arrancar.
--
-- ⚠️  IMPORTANTE: Reemplaza '<REEMPLAZAR_CON_PERFIL_ID>' por el UUID real del
-- perfil (auth.users.id / perfiles.id) que será el primer moderador. No se
-- puede usar un UUID falso: violaría la restricción de clave foránea hacia
-- perfiles(id).
--
--   Para obtener el perfil_id correcto, ejecuta antes:
--     SELECT id, email, nombre_completo FROM public.perfiles;
--
-- Re-ejecutable: usa ON CONFLICT (perfil_id) DO NOTHING.
-- Ejecutar en el SQL Editor de Supabase después de migracion_foro_fase1.sql.
-- =============================================================================

INSERT INTO public.foro_moderadores (perfil_id)
VALUES ('<REEMPLAZAR_CON_PERFIL_ID>')
ON CONFLICT (perfil_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT m.perfil_id, p.email, p.nombre_completo, m.created_at
-- FROM public.foro_moderadores m
-- JOIN public.perfiles p ON p.id = m.perfil_id;