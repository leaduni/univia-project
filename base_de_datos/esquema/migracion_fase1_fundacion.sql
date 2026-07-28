-- =============================================================================
-- MIGRACIÓN — FASE 1: Núcleo de datos, seguridad y validaciones transversales
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Contexto (auditoría del esquema, subtarea 1 de la Fase 1):
--   Al comparar db_schema.sql contra lo que el backend realmente consulta se
--   encontraron dos desviaciones que rompen cualquier base recreada desde cero:
--
--   1. 'perfiles.codigo_estudiante' se lee y escribe en el registro y el login,
--      pero NO estaba declarada en ningún archivo SQL del repositorio. Existía
--      solo en la base de datos viva, aplicada a mano.
--   2. 'curso_prerrequisitos' se consulta en onboarding, malla y cursos, pero
--      su CREATE TABLE vivía dentro de un archivo de semillas
--      (semillas/seed_requirements.sql) en vez del esquema canónico.
--
-- Esta migración consolida ambas en el esquema y agrega las restricciones de
-- integridad que sostienen RF-EST-01, RF-EST-02 y RF-EST-03.
--
-- Es IDEMPOTENTE: se puede ejecutar varias veces sin efectos secundarios.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. RF-EST-01 — Datos mínimos de perfil: código universitario
-- -----------------------------------------------------------------------------
ALTER TABLE perfiles
    ADD COLUMN IF NOT EXISTS codigo_estudiante VARCHAR(9);


-- -----------------------------------------------------------------------------
-- 2. RF-EST-02 — Unicidad del código universitario
-- -----------------------------------------------------------------------------
-- El backend ya valida duplicados a nivel de servicio, pero sin esta
-- restricción dos registros simultáneos podrían insertar el mismo código.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'perfiles_codigo_estudiante_key'
    ) THEN
        ALTER TABLE perfiles
            ADD CONSTRAINT perfiles_codigo_estudiante_key UNIQUE (codigo_estudiante);
    END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 3. RF-EST-02 — Formato de correo institucional y de código
-- -----------------------------------------------------------------------------
-- Se agregan como NOT VALID a propósito: la restricción se aplica a las filas
-- nuevas y actualizadas, pero no falla la migración si quedaron cuentas de
-- prueba con datos fuera de formato. Para exigirla también sobre lo histórico,
-- limpiar esas filas y ejecutar:
--     ALTER TABLE perfiles VALIDATE CONSTRAINT perfiles_email_institucional_check;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'perfiles_email_institucional_check'
    ) THEN
        ALTER TABLE perfiles
            ADD CONSTRAINT perfiles_email_institucional_check
            CHECK (email ~* '^[A-Za-z0-9._%+-]+@uni\.pe$') NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'perfiles_codigo_estudiante_formato_check'
    ) THEN
        ALTER TABLE perfiles
            ADD CONSTRAINT perfiles_codigo_estudiante_formato_check
            CHECK (codigo_estudiante IS NULL OR codigo_estudiante ~ '^[0-9]{8}[A-Za-z]$') NOT VALID;
    END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 4. RF-EST-03 — Modelo de prerrequisitos en el esquema canónico
-- -----------------------------------------------------------------------------
-- Definición trasladada desde semillas/seed_requirements.sql. El seed puede
-- seguir ejecutándose: su CREATE TABLE IF NOT EXISTS es compatible con esta.
CREATE TABLE IF NOT EXISTS curso_prerrequisitos (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    prerrequisito_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(curso_id, prerrequisito_id)
);

-- Un curso no puede ser prerrequisito de sí mismo: ese ciclo trivial dejaría
-- el curso permanentemente bloqueado al resolver la cadena de prerrequisitos.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'curso_prerrequisitos_no_autorreferencia_check'
    ) THEN
        ALTER TABLE curso_prerrequisitos
            ADD CONSTRAINT curso_prerrequisitos_no_autorreferencia_check
            CHECK (curso_id <> prerrequisito_id) NOT VALID;
    END IF;
END $$;

-- Índices para las consultas de malla y onboarding, que recorren la tabla
-- completa en cada carga de pantalla.
CREATE INDEX IF NOT EXISTS idx_curso_prerrequisitos_curso
    ON curso_prerrequisitos (curso_id);
CREATE INDEX IF NOT EXISTS idx_curso_prerrequisitos_prerrequisito
    ON curso_prerrequisitos (prerrequisito_id);


-- -----------------------------------------------------------------------------
-- 5. Índices de apoyo al login (RF-01)
-- -----------------------------------------------------------------------------
-- El login por código universitario resuelve código -> correo antes de
-- autenticar; sin índice esa consulta hace scan secuencial de 'perfiles'.
CREATE INDEX IF NOT EXISTS idx_perfiles_codigo_estudiante
    ON perfiles (codigo_estudiante);
CREATE INDEX IF NOT EXISTS idx_progreso_cursos_perfil
    ON progreso_cursos (perfil_id);


-- -----------------------------------------------------------------------------
-- 6. Verificación posterior
-- -----------------------------------------------------------------------------
-- Ejecutar para confirmar que la migración quedó aplicada:
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'perfiles' AND column_name = 'codigo_estudiante';
--
-- SELECT conname FROM pg_constraint
-- WHERE conrelid IN ('perfiles'::regclass, 'curso_prerrequisitos'::regclass);
