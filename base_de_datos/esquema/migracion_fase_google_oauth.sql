-- ============================================================================
-- FASE 1 · INTEGRACIÓN GOOGLE OAUTH (SUPABASE TRIGGER)
-- ============================================================================
-- Procesa la creación de usuarios en auth.users (incluidos los que ingresan por
-- Google SSO). Redefine public.handle_new_user() de forma idempotente y recrea
-- el trigger AFTER INSERT sobre auth.users.
--
-- Cambios frente a la versión original (base_de_datos/esquema/db_schema.sql):
--   a) Valida estrictamente que el correo termine en @uni.pe; si no, lanza
--      RAISE EXCEPTION y aborta la creación de la cuenta.
--   b) Extrae nombre y avatar desde raw_user_meta_data soportando la clave de
--      Google (full_name / avatar_url) con fallback al registro manual.
--   c) Persiste en public.perfiles: id, email, nombre_completo, avatar_url,
--      onboarding_completado = FALSE y codigo_estudiante = NULL.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- a) Dominio institucional obligatorio y estricto: cualquier correo que no
  --    termine en @uni.pe rechaza la cuenta (RAISE EXCEPTION aborta el INSERT).
  IF new.email IS NULL OR NOT new.email ~* '^[^@]+@uni\.pe$' THEN
    RAISE EXCEPTION 'El correo institucional es obligatorio y debe pertenecer al dominio @uni.pe';
  END IF;

  -- b) Metadatos del proveedor: Google SSO expone `full_name` y `avatar_url`;
  --    el registro manual histórico expone `nombre_completo`. Se da prioridad
  --    al primero con fallback para no romper el flujo de registro existente.
  -- c) Registro en public.perfiles con onboarding pendiente (FALSO) y sin
  --    código de estudiante (NULL) hasta completar el onboarding.
  INSERT INTO public.perfiles (id, email, nombre_completo, avatar_url, onboarding_completado, codigo_estudiante, malla_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nombre_completo', ''),
    new.raw_user_meta_data->>'avatar_url',
    FALSE,
    NULL,
    NULL
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Se elimina el trigger previo y se recrea con la nueva función, para que la
-- migración sea idempotente (se pueda volver a aplicar sin errores).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();