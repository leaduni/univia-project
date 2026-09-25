-- =============================================================================
-- Migración — Fase 13: verificación manual asistida de donaciones
-- =============================================================================
-- Contexto:
--   El flujo de aprobación deja de ser "estado = dinero ya contado". Ahora un
--   aporte solo suma cuando un admin lo cruza contra el historial real de Yape:
--       reportada  →  confirmada  (suma; el abono apareció)
--       reportada  →  rechazada   (queda auditada, nunca suma)
--
--   La tabla ya tenía `confirmado_en`; lo que faltaba era el estado
--   'rechazada' en el CHECK, porque borrar la fila perdería la evidencia del
--   intento (quién, cuánto, cuándo) y permitiría reintentos infinitos con el
--   mismo mensaje.
--
-- Idempotente: se puede ejecutar varias veces sin efectos adicionales.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- 1. Se reemplaza el CHECK del estado para admitir 'rechazada'.
ALTER TABLE donaciones DROP CONSTRAINT IF EXISTS donaciones_estado_check;
ALTER TABLE donaciones ADD CONSTRAINT donaciones_estado_check
    CHECK (estado IN ('iniciada', 'reportada', 'confirmada', 'rechazada', 'expirada'));

-- 2. Índice para la bandeja del panel admin: pendientes, más reciente primero.
CREATE INDEX IF NOT EXISTS idx_donaciones_pendientes
    ON donaciones (reportado_en DESC)
    WHERE estado = 'reportada';


-- -----------------------------------------------------------------------------
-- Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint WHERE conrelid = 'donaciones'::regclass AND contype = 'c';
