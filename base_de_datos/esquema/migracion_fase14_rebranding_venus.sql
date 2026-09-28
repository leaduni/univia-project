-- =============================================================================
-- Migración — Fase 14: actualizar el texto predeterminado de donaciones a Venus
-- =============================================================================
-- Idempotente: solo modifica el valor inicial exacto de UniVia y conserva
-- cualquier destino personalizado que ya haya configurado el equipo.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

UPDATE public.donaciones_config
SET valor = 'Infraestructura del servidor y dominio de Venus',
    actualizado_en = NOW()
WHERE clave = 'destino_aporte'
  AND valor = 'Infraestructura del servidor y dominio de UniVia';

-- Verificación posterior:
-- SELECT clave, valor
-- FROM public.donaciones_config
-- WHERE clave = 'destino_aporte';
