-- Create Prerrequisitos Table
CREATE TABLE IF NOT EXISTS curso_prerrequisitos (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    prerrequisito_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(curso_id, prerrequisito_id)
);

-- Insert Additional Careers if not exist
INSERT INTO carreras (facultad_id, codigo, name, description) VALUES
(1, 'SI', 'Ingeniería de Sistemas', 'Formación en ingeniería de sistemas'),
(1, 'SW', 'Ingeniería de Software', 'Formación en ingeniería de software')
ON CONFLICT (codigo) DO UPDATE SET name = EXCLUDED.name;

-- Clear relevant courses to avoid duplication/issues (optional, but safer for re-seeding)
-- DELETE FROM cursos WHERE carrera_id IN (2, 3, 4); -- Use with caution in prod

-- Seed Methodology: 
-- 1. Insert Courses for Cycles I-III
-- 2. Insert Prerequisites

-- ==========================================
-- INGENIERÍA INDUSTRIAL (ID 4)
-- ==========================================

-- Ciclo I
INSERT INTO cursos (carrera_id, code, name, credits, ciclo) VALUES
(4, 'BMA01_IND', 'Cálculo Diferencial', 4, 1),
(4, 'BQU01_IND', 'Química I', 3, 1),
(4, 'BRC01_IND', 'Redacción y Comunicación', 3, 1),
(4, 'BEF01_IND', 'Ética y Filosofía Política', 2, 1),
(4, 'FB101_IND', 'Geometría Analítica', 4, 1),
(4, 'TE101_IND', 'Dibujo de Ingeniería', 3, 1),
(4, 'GE101_IND', 'Introducción a Ingeniería Industrial', 3, 1)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, credits = EXCLUDED.credits, ciclo = EXCLUDED.ciclo;

-- Ciclo II
INSERT INTO cursos (carrera_id, code, name, credits, ciclo) VALUES
(4, 'BMA03_IND', 'Álgebra Lineal', 4, 2),
(4, 'BMA02_IND', 'Cálculo Integral', 4, 2),
(4, 'BIC01_IND', 'Introducción a la Computación', 3, 2),
(4, 'BRN01_IND', 'Realidad Nacional, Constitución y Derechos Humanos', 2, 2),
(4, 'HU102_IND', 'Desarrollo Personal', 2, 2),
(4, 'SI204_IND', 'Teoría General de Sistemas', 3, 2),
(4, 'FB202_IND', 'Química II', 3, 2)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, credits = EXCLUDED.credits, ciclo = EXCLUDED.ciclo;

-- Ciclo III
INSERT INTO cursos (carrera_id, code, name, credits, ciclo) VALUES
(4, 'BFI01_IND', 'Física I', 4, 3),
(4, 'HU301_IND', 'Metodología de la Investigación', 3, 3),
(4, 'FB301_IND', 'Matemática Discreta', 4, 3),
(4, 'FB303_IND', 'Cálculo Multivariable', 4, 3),
(4, 'TE302_IND', 'Diseño Asistido por Computador', 3, 3),
(4, 'TE301_IND', 'Físico Química y Operaciones Unitarias', 3, 3)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, credits = EXCLUDED.credits, ciclo = EXCLUDED.ciclo;

-- Prerequisites Industrial
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'BMA03_IND' AND p.code = 'FB101_IND' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'BMA02_IND' AND p.code = 'BMA01_IND' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'BRN01_IND' AND p.code = 'BRC01_IND' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'HU102_IND' AND p.code = 'BEF01_IND' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB202_IND' AND p.code = 'BQU01_IND' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'BFI01_IND' AND p.code = 'BMA02_IND' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'BFI01_IND' AND p.code = 'FB101_IND' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'HU301_IND' AND p.code = 'BRC01_IND' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB301_IND' AND p.code = 'BMA03_IND' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB301_IND' AND p.code = 'BIC01_IND' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB303_IND' AND p.code = 'BMA02_IND' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB303_IND' AND p.code = 'BMA03_IND' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'TE302_IND' AND p.code = 'TE101_IND' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'TE301_IND' AND p.code = 'FB202_IND' ON CONFLICT DO NOTHING;


-- ==========================================
-- INGENIERÍA DE SISTEMAS (ID 2)
-- ==========================================

-- Ciclo I
INSERT INTO cursos (carrera_id, code, name, credits, ciclo) VALUES
(2, 'FB101_SIS', 'Geometría Analítica', 4, 1),
(2, 'BMA01_SIS', 'Cálculo Diferencial', 4, 1),
(2, 'BQU01_SIS', 'Química I', 3, 1),
(2, 'BIC01_SIS', 'Introducción a la Computación', 3, 1),
(2, 'BRC01_SIS', 'Redacción y Comunicación', 3, 1),
(2, 'SI101_SIS', 'Introducción al Pensamiento y a la Ingeniería de Sistemas', 3, 1)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, credits = EXCLUDED.credits, ciclo = EXCLUDED.ciclo;

-- Ciclo II
INSERT INTO cursos (carrera_id, code, name, credits, ciclo) VALUES
(2, 'BMA03_SIS', 'Álgebra Lineal', 4, 2),
(2, 'BMA02_SIS', 'Cálculo Integral', 4, 2),
(2, 'BEF01_SIS', 'Ética y Filosofía Política', 2, 2),
(2, 'SI201_SIS', 'Psicología Sistémica', 3, 2),
(2, 'SI203_SIS', 'Teoría y Ciencia de Sistemas', 3, 2),
(2, 'SI207_SIS', 'Sistemas Biológicos y Ecológicos', 3, 2),
(2, 'SI205_SIS', 'Algoritmia y Estructura de Datos', 4, 2)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, credits = EXCLUDED.credits, ciclo = EXCLUDED.ciclo;

-- Ciclo III
INSERT INTO cursos (carrera_id, code, name, credits, ciclo) VALUES
(2, 'FB301_SIS', 'Matemática Discreta', 4, 3),
(2, 'FB303_SIS', 'Cálculo Multivariable', 4, 3),
(2, 'BFI01_SIS', 'Física I', 4, 3),
(2, 'HU301_SIS', 'Metodología de la Investigación', 3, 3),
(2, 'FB305_SIS', 'Estadística y Probabilidades', 4, 3),
(2, 'SI301_SIS', 'Teoría y Ciencia de Sistemas Aplicados', 3, 3),
(2, 'SI302_SIS', 'Programación Orientada a Objetos', 4, 3)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, credits = EXCLUDED.credits, ciclo = EXCLUDED.ciclo;

-- Prerequisites Sistemas
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'BMA03_SIS' AND p.code = 'FB101_SIS' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'BMA02_SIS' AND p.code = 'BMA01_SIS' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'SI201_SIS' AND p.code = 'SI101_SIS' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'SI203_SIS' AND p.code = 'SI101_SIS' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'SI207_SIS' AND p.code = 'BMA01_SIS' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'SI205_SIS' AND p.code = 'BIC01_SIS' ON CONFLICT DO NOTHING;


INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB301_SIS' AND p.code = 'BMA03_SIS' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB303_SIS' AND p.code = 'BMA02_SIS' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'HU301_SIS' AND p.code = 'BRC01_SIS' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'HU301_SIS' AND p.code = 'SI203_SIS' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB305_SIS' AND p.code = 'BMA02_SIS' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'SI301_SIS' AND p.code = 'SI201_SIS' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'SI302_SIS' AND p.code = 'SI205_SIS' ON CONFLICT DO NOTHING;


-- ==========================================
-- INGENIERÍA DE SOFTWARE (ID 3)
-- ==========================================

-- Ciclo I
INSERT INTO cursos (carrera_id, code, name, credits, ciclo) VALUES
(3, 'FB101_SOFT', 'Geometría Analítica', 4, 1),
(3, 'BMA01_SOFT', 'Cálculo Diferencial', 4, 1),
(3, 'BQU01_SOFT', 'Química I', 3, 1),
(3, 'BRC01_SOFT', 'Redacción y Comunicación', 3, 1),
(3, 'SW101_SOFT', 'Introducción a la Ingeniería de Software', 3, 1),
(3, 'BIC01_SOFT', 'Introducción a la Computación', 3, 1),
(3, 'HU102_SOFT', 'Desarrollo Personal', 2, 1)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, credits = EXCLUDED.credits, ciclo = EXCLUDED.ciclo;

-- Ciclo II
INSERT INTO cursos (carrera_id, code, name, credits, ciclo) VALUES
(3, 'BMA03_SOFT', 'Álgebra Lineal', 4, 2),
(3, 'BMA02_SOFT', 'Cálculo Integral', 4, 2),
(3, 'FB301_SOFT', 'Matemática Discreta', 4, 2),
(3, 'BFI01_SOFT', 'Física I', 4, 2),
(3, 'TE205_SOFT', 'Dibujo y Geometría Descriptiva', 3, 2),
(3, 'SI205_SOFT', 'Algoritmia y Estructura de Datos', 4, 2)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, credits = EXCLUDED.credits, ciclo = EXCLUDED.ciclo;

-- Ciclo III
INSERT INTO cursos (carrera_id, code, name, credits, ciclo) VALUES
(3, 'FB303_SOFT', 'Cálculo Multivariable', 4, 3),
(3, 'FB305_SOFT', 'Estadística y Probabilidades', 4, 3),
(3, 'FB401_SOFT', 'Física II', 4, 3),
(3, 'SW305_SOFT', 'Algoritmia y Estructura de Datos Avanzada', 4, 3),
(3, 'SW301_SOFT', 'Arquitectura de Computadoras I', 4, 3),
(3, 'SW303_SOFT', 'Lenguajes de Programación I (Imperativo)', 4, 3)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, credits = EXCLUDED.credits, ciclo = EXCLUDED.ciclo;

-- Prerequisites Software
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'BMA03_SOFT' AND p.code = 'FB101_SOFT' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'BMA02_SOFT' AND p.code = 'BMA01_SOFT' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB301_SOFT' AND p.code = 'BMA03_SOFT' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'TE205_SOFT' AND p.code = 'FB101_SOFT' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'SI205_SOFT' AND p.code = 'BIC01_SOFT' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'SI205_SOFT' AND p.code = 'SW101_SOFT' ON CONFLICT DO NOTHING;


INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB303_SOFT' AND p.code = 'BMA03_SOFT' ON CONFLICT DO NOTHING;
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB303_SOFT' AND p.code = 'BMA02_SOFT' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB305_SOFT' AND p.code = 'BMA02_SOFT' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'FB401_SOFT' AND p.code = 'BFI01_SOFT' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'SW305_SOFT' AND p.code = 'SI205_SOFT' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'SW301_SOFT' AND p.code = 'FB301_SOFT' ON CONFLICT DO NOTHING;

INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id FROM cursos c, cursos p WHERE c.code = 'SW303_SOFT' AND p.code = 'SI205_SOFT' ON CONFLICT DO NOTHING;
