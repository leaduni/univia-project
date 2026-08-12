-- =============================================================================
-- Migración — Fase 6: Modelado de profesores
-- =============================================================================
-- Contexto:
--   No existe ninguna tabla de profesores en el esquema. El endpoint de curso
--   (GET /api/cursos/{id}, en cursos.py) devuelve hoy un placeholder fijo
--   ("Ing. Docente UNI") para todo curso, sin dato real. Esta migración solo
--   crea el modelo de datos; la carga de filas reales (scraping/recopilación)
--   es una tarea aparte y posterior.
--
-- Decisión de diseño:
--   Un profesor puede dictar varios cursos y un curso puede tener varios
--   profesores (secciones/grupos distintos), así que la relación es N:N vía
--   tabla intermedia `curso_profesores`, mismo patrón que
--   `curso_prerrequisitos` en db_schema.sql (tabla puente con UNIQUE
--   compuesto, sin PK compuesta para mantener consistencia con el resto del
--   esquema que siempre usa `id SERIAL` propio).
--   `profesores` guarda por ahora solo el dato mínimo (nombre); no se agregan
--   columnas de contacto/departamento/foto hasta que el scraping confirme qué
--   datos hay disponibles realmente — evita columnas vacías especulativas.
--
-- Idempotente: puede ejecutarse varias veces sin efecto adicional.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tabla de profesores
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profesores (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 2. Relación N:N curso <-> profesor
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curso_profesores (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    profesor_id INTEGER REFERENCES profesores(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(curso_id, profesor_id)
);


-- -----------------------------------------------------------------------------
-- 3. Índices
-- -----------------------------------------------------------------------------
-- GET /api/cursos/{id} necesita resolver profesores por curso en cada carga.
CREATE INDEX IF NOT EXISTS idx_curso_profesores_curso_id ON curso_profesores (curso_id);
CREATE INDEX IF NOT EXISTS idx_curso_profesores_profesor_id ON curso_profesores (profesor_id);


-- -----------------------------------------------------------------------------
-- 4. Verificación posterior
-- -----------------------------------------------------------------------------
-- Ejecutar para confirmar que la migración quedó aplicada:
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name IN ('profesores', 'curso_profesores');
--
-- SELECT indexname FROM pg_indexes WHERE tablename = 'curso_profesores';
