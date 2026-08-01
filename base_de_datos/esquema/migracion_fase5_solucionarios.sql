-- =============================================================================
-- Migración — Fase 5: Columnas para vinculación directa de Solucionarios
-- =============================================================================
-- Permite almacenar la URL y el Drive File ID del solucionario directamente
-- en la fila del recurso principal, facilitando la renderización de una sola
-- tarjeta con botón "Ver Solucionario".
-- =============================================================================

ALTER TABLE recursos ADD COLUMN IF NOT EXISTS url_solucionario TEXT;
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS drive_id_solucionario TEXT;
