-- ============================================================================
-- UNI-VIA: MIGRACIÓN A SUPABASE AUTH
-- ============================================================================
-- Este script aplica solo los cambios necesarios sin borrar tus datos actuales.
-- Ejecuta esto en el SQL Editor de Supabase.

-- 1. Eliminar la columna password de la tabla usuarios
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS password;

-- 2. Crear la función para manejar nuevos usuarios de Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, nombre_completo, rol)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'rol', 'estudiante')
    );
    
    -- También crear el registro en la tabla estudiantes si el rol es estudiante
    IF COALESCE(NEW.raw_user_meta_data->>'rol', 'estudiante') = 'estudiante' THEN
        INSERT INTO public.estudiantes (id, onboarding_completado)
        VALUES (NEW.id, FALSE);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el trigger en la tabla auth.users
-- Primero lo borramos por si ya existe para evitar errores
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- NOTA: Tus tablas de carreras, cursos, etc., no se verán afectadas.
-- Los datos de 'usuarios' que creaste manualmente no funcionarán con el nuevo login 
-- a menos que el ID coincida con un usuario real en Supabase Auth.
-- Te recomiendo registrarte como usuario nuevo desde el frontend para probar el flujo.
