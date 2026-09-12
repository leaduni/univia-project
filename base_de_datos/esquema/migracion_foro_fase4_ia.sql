-- =============================================================================
-- Migración — Fase 4: Triaje y respuestas IA asíncronas en el foro
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Añade la infraestructura para que el bot UniVia sugiera soluciones a dudas
-- académicas del foro de forma asíncrona y con costo controlado:
--   - foro_publicaciones.sugerencia_ia JSONB: respuesta del bot, fuentes citadas
--     y si fue aceptada por el autor.
--   - foro_comentarios.es_solucion BOOLEAN: marca la respuesta que resuelve el
--     hilo.
--
-- Idempotente: puede ejecutarse varias veces sin efecto adicional.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Sugerencia IA en publicaciones
-- -----------------------------------------------------------------------------
ALTER TABLE foro_publicaciones
    ADD COLUMN IF NOT EXISTS sugerencia_ia JSONB;

-- -----------------------------------------------------------------------------
-- 2. Marca de solución en comentarios
-- -----------------------------------------------------------------------------
ALTER TABLE foro_comentarios
    ADD COLUMN IF NOT EXISTS es_solucion BOOLEAN NOT NULL DEFAULT FALSE;

-- -----------------------------------------------------------------------------
-- Índice opcional para buscar hilos con sugerencia o soluciones marcadas.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_foro_publicaciones_sugerencia_ia
    ON foro_publicaciones (sugerencia_ia)
    WHERE sugerencia_ia IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_foro_comentarios_es_solucion
    ON foro_comentarios (publicacion_id, es_solucion)
    WHERE es_solucion = TRUE;

-- -----------------------------------------------------------------------------
-- Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name IN ('foro_publicaciones','foro_comentarios')
--   AND column_name IN ('sugerencia_ia','es_solucion')
-- ORDER BY table_name;