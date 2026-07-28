-- =============================================================================
-- SEMILLA DE CATÁLOGO ACADÉMICO — UniVia
-- =============================================================================
--
-- Reproduce el catálogo académico (facultades, carreras, cursos y
-- prerrequisitos) en una base de datos vacía.
--
-- Generado a partir de la base de datos real, que es la fuente de verdad.
-- Reemplaza a los seeds anteriores (db_seed.sql, seed_requirements.sql,
-- seed_industrial.sql), que usaban IDs fijos ya desincronizados.
--
-- Todas las relaciones se resuelven por CÓDIGO, nunca por ID: los IDs son
-- SERIAL y cambian entre entornos. Es IDEMPOTENTE.
--
-- Orden de ejecución:
--   1. esquema/db_schema.sql
--   2. esquema/migracion_fase1_fundacion.sql
--   3. semillas/seed_catalogo.sql   <-- este archivo
--   4. semillas/seed_learning_paths*.sql
-- =============================================================================

BEGIN;

-- --- Facultades ---
INSERT INTO facultades (codigo, nombre, descripcion)
VALUES ('FIIS', 'Facultad de Ingeniería Industrial y de Sistemas', 'Ingeniería y ciencias aplicadas')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

-- --- Carreras (facultad resuelta por código) ---
INSERT INTO carreras (facultad_id, codigo, name, description, duracion_ciclos)
VALUES ((SELECT id FROM facultades WHERE codigo = 'FIIS'), 'IND', 'Ingeniería Industrial', 'Formación en optimización de procesos y sistemas', 10)
ON CONFLICT (codigo) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    duracion_ciclos = EXCLUDED.duracion_ciclos;
INSERT INTO carreras (facultad_id, codigo, name, description, duracion_ciclos)
VALUES ((SELECT id FROM facultades WHERE codigo = 'FIIS'), 'SI', 'Ingeniería de Sistemas', 'Formación en ingeniería de sistemas', 10)
ON CONFLICT (codigo) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    duracion_ciclos = EXCLUDED.duracion_ciclos;
INSERT INTO carreras (facultad_id, codigo, name, description, duracion_ciclos)
VALUES ((SELECT id FROM facultades WHERE codigo = 'FIIS'), 'SW', 'Ingeniería de Software', 'Formación en desarrollo y gestión de software', 10)
ON CONFLICT (codigo) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    duracion_ciclos = EXCLUDED.duracion_ciclos;

-- --- Cursos (carrera resuelta por código) ---
-- Ingeniería Industrial (IND)
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BEF01_IND', 'Ética y Filosofía Política', 2, 1, 'Principios éticos y filosofía política'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BMA01_IND', 'Cálculo Diferencial', 4, 1, 'Fundamentos de límites, derivadas e integrales'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BQU01_IND', 'Química I', 3, 1, 'Introducción a la química general'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BRC01_IND', 'Redacción y Comunicación', 3, 1, 'Técnicas de comunicación efectiva'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB101_IND', 'Geometría Analítica', 4, 1, 'Fundamentos de geometría analítica'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'GE101_IND', 'Introducción a Ingeniería Industrial', 3, 1, 'Conceptos fundamentales de ingeniería industrial'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'TE101_IND', 'Dibujo de Ingeniería', 3, 1, 'Técnicas de dibujo técnico'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BIC01_IND', 'Introducción a la Computación', 3, 2, 'Fundamentos de programación'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BMA02_IND', 'Cálculo Integral', 4, 2, 'Métodos de integración y aplicaciones'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BMA03_IND', 'Álgebra Lineal', 4, 2, 'Vectores, matrices y sistemas lineales'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BRN01_IND', 'Realidad Nacional, Constitución y Derechos Humanos', 2, 2, 'Contexto nacional y derechos fundamentales'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB202_IND', 'Química II', 3, 2, 'Química avanzada y aplicaciones'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'HU102_IND', 'Desarrollo Personal', 2, 2, 'Habilidades blandas y desarrollo personal'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SI204_IND', 'Teoría General de Sistemas', 3, 2, 'Conceptos de teoría de sistemas'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BFI01_IND', 'Física I', 4, 3, 'Mecánica clásica y cinemática'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB301_IND', 'Matemática Discreta', 3, 3, 'Teoría de conjuntos, grafos y lógica'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB303_IND', 'Cálculo Multivariable', 4, 3, 'Cálculo en varias variables'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'HU301_IND', 'Metodología de la Investigación', 3, 3, 'Métodos de investigación científica'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'TE301_IND', 'Físico Química y Operaciones Unitarias', 4, 3, 'Operaciones unitarias en ingeniería'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'TE302_IND', 'Diseño Asistido por Computador', 3, 3, 'Software CAD para diseño técnico'
FROM carreras ca WHERE ca.codigo = 'IND'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;

-- Ingeniería de Sistemas (SI)
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BIC01_SIS', 'Introducción a la Computación', 3, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BMA01_SIS', 'Cálculo Diferencial', 4, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BQU01_SIS', 'Química I', 3, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BRC01_SIS', 'Redacción y Comunicación', 3, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB101_SIS', 'Geometría Analítica', 4, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SI101_SIS', 'Introducción al Pensamiento y a la Ingeniería de Sistemas', 3, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BEF01_SIS', 'Ética y Filosofía Política', 2, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BMA02_SIS', 'Cálculo Integral', 4, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BMA03_SIS', 'Álgebra Lineal', 4, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SI201_SIS', 'Psicología Sistémica', 3, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SI203_SIS', 'Teoría y Ciencia de Sistemas', 3, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SI205_SIS', 'Algoritmia y Estructura de Datos', 4, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SI207_SIS', 'Sistemas Biológicos y Ecológicos', 3, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BFI01_SIS', 'Física I', 4, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB301_SIS', 'Matemática Discreta', 4, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB303_SIS', 'Cálculo Multivariable', 4, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB305_SIS', 'Estadística y Probabilidades', 4, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'HU301_SIS', 'Metodología de la Investigación', 3, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SI301_SIS', 'Teoría y Ciencia de Sistemas Aplicados', 3, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SI302_SIS', 'Programación Orientada a Objetos', 4, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SI'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;

-- Ingeniería de Software (SW)
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BIC01_SOFT', 'Introducción a la Computación', 3, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BMA01_SOFT', 'Cálculo Diferencial', 4, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BQU01_SOFT', 'Química I', 3, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BRC01_SOFT', 'Redacción y Comunicación', 3, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB101_SOFT', 'Geometría Analítica', 4, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'HU102_SOFT', 'Desarrollo Personal', 2, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SW101_SOFT', 'Introducción a la Ingeniería de Software', 3, 1, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BFI01_SOFT', 'Física I', 4, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BMA02_SOFT', 'Cálculo Integral', 4, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'BMA03_SOFT', 'Álgebra Lineal', 4, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB301_SOFT', 'Matemática Discreta', 4, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SI205_SOFT', 'Algoritmia y Estructura de Datos', 4, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'TE205_SOFT', 'Dibujo y Geometría Descriptiva', 3, 2, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB303_SOFT', 'Cálculo Multivariable', 4, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB305_SOFT', 'Estadística y Probabilidades', 4, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'FB401_SOFT', 'Física II', 4, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SW301_SOFT', 'Arquitectura de Computadoras I', 4, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SW303_SOFT', 'Lenguajes de Programación I (Imperativo)', 4, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;
INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description)
SELECT ca.id, 'SW305_SOFT', 'Algoritmia y Estructura de Datos Avanzada', 4, 3, NULL
FROM carreras ca WHERE ca.codigo = 'SW'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, credits = EXCLUDED.credits,
    ciclo = EXCLUDED.ciclo, description = EXCLUDED.description;

-- --- Prerrequisitos (ambos cursos resueltos por código) ---
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'BFI01_IND' AND p.code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'BFI01_IND' AND p.code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'BMA02_IND' AND p.code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'BMA02_SIS' AND p.code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'BMA02_SOFT' AND p.code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'BMA03_IND' AND p.code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'BMA03_SIS' AND p.code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'BMA03_SOFT' AND p.code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'BRN01_IND' AND p.code = 'BRC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB202_IND' AND p.code = 'BQU01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB301_IND' AND p.code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB301_IND' AND p.code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB301_SIS' AND p.code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB301_SOFT' AND p.code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB303_IND' AND p.code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB303_IND' AND p.code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB303_SIS' AND p.code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB303_SOFT' AND p.code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB303_SOFT' AND p.code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB305_SIS' AND p.code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB305_SOFT' AND p.code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'FB401_SOFT' AND p.code = 'BFI01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'HU102_IND' AND p.code = 'BEF01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'HU301_IND' AND p.code = 'BRC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'HU301_SIS' AND p.code = 'BRC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'HU301_SIS' AND p.code = 'SI203_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'SI201_SIS' AND p.code = 'SI101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'SI203_SIS' AND p.code = 'SI101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'SI205_SIS' AND p.code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'SI205_SOFT' AND p.code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'SI205_SOFT' AND p.code = 'SW101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'SI207_SIS' AND p.code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'SI301_SIS' AND p.code = 'SI201_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'SI302_SIS' AND p.code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'SW301_SOFT' AND p.code = 'FB301_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'SW303_SOFT' AND p.code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'SW305_SOFT' AND p.code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'TE205_SOFT' AND p.code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'TE301_IND' AND p.code = 'FB202_IND'
ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p
WHERE c.code = 'TE302_IND' AND p.code = 'TE101_IND'
ON CONFLICT DO NOTHING;

COMMIT;
