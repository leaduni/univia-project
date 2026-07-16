-- Seed Industrial Engineering Courses and Prerequisites
-- Cycles I, II, and III

BEGIN;

-- Get the carrera_id for Industrial Engineering
-- According to previous queries, it should be ID 6 with codigo 'IND'

-- ==============================================
-- CICLO I - Industrial Engineering
-- ==============================================

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'BMA01_IND', 'Cálculo Diferencial', 4, 1, 'Fundamentos de límites, derivadas e integrales'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'BMA01_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'BQU01_IND', 'Química I', 3, 1, 'Introducción a la química general'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'BQU01_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'BRC01_IND', 'Redacción y Comunicación', 3, 1, 'Técnicas de comunicación efectiva'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'BRC01_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'BEF01_IND', 'Ética y Filosofía Política', 2, 1, 'Principios éticos y filosofía política'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'BEF01_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'FB101_IND', 'Geometría Analítica', 4, 1, 'Fundamentos de geometría analítica'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'FB101_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'TE101_IND', 'Dibujo de Ingeniería', 3, 1, 'Técnicas de dibujo técnico'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'TE101_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'GE101_IND', 'Introducción a Ingeniería Industrial', 3, 1, 'Conceptos fundamentales de ingeniería industrial'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'GE101_IND');

-- ==============================================
-- CICLO II - Industrial Engineering
-- ==============================================

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'BMA03_IND', 'Álgebra Lineal', 4, 2, 'Vectores, matrices y sistemas lineales'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'BMA03_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'BMA02_IND', 'Cálculo Integral', 4, 2, 'Métodos de integración y aplicaciones'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'BMA02_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'BIC01_IND', 'Introducción a la Computación', 3, 2, 'Fundamentos de programación'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'BIC01_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'BRN01_IND', 'Realidad Nacional, Constitución y Derechos Humanos', 2, 2, 'Contexto nacional y derechos fundamentales'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'BRN01_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'HU102_IND', 'Desarrollo Personal', 2, 2, 'Habilidades blandas y desarrollo personal'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'HU102_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'SI204_IND', 'Teoría General de Sistemas', 3, 2, 'Conceptos de teoría de sistemas'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'SI204_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'FB202_IND', 'Química II', 3, 2, 'Química avanzada y aplicaciones'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'FB202_IND');

-- ==============================================
-- CICLO III - Industrial Engineering
-- ==============================================

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'BFI01_IND', 'Física I', 4, 3, 'Mecánica clásica y cinemática'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'BFI01_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'HU301_IND', 'Metodología de la Investigación', 3, 3, 'Métodos de investigación científica'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'HU301_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'FB301_IND', 'Matemática Discreta', 3, 3, 'Teoría de conjuntos, grafos y lógica'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'FB301_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'FB303_IND', 'Cálculo Multivariable', 4, 3, 'Cálculo en varias variables'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'FB303_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'TE302_IND', 'Diseño Asistido por Computador', 3, 3, 'Software CAD para diseño técnico'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'TE302_IND');

INSERT INTO cursos (carrera_id, code, name, credits, ciclo, description) 
SELECT 6, 'TE301_IND', 'Físico Química y Operaciones Unitarias', 4, 3, 'Operaciones unitarias en ingeniería'
WHERE NOT EXISTS (SELECT 1 FROM cursos WHERE code = 'TE301_IND');

-- ==============================================
-- PREREQUISITES - CICLO II (IND)
-- ==============================================

-- BMA03 (Álgebra Lineal) requires FB101 (Geometría Analítica)
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'BMA03_IND' AND p.code = 'FB101_IND'
ON CONFLICT DO NOTHING;

-- BMA02 (Cálculo Integral) requires BMA01 (Cálculo Diferencial)
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'BMA02_IND' AND p.code = 'BMA01_IND'
ON CONFLICT DO NOTHING;

-- BRN01 requires BRC01
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'BRN01_IND' AND p.code = 'BRC01_IND'
ON CONFLICT DO NOTHING;

-- HU102 (Desarrollo Personal) requires BEF01
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'HU102_IND' AND p.code = 'BEF01_IND'
ON CONFLICT DO NOTHING;

-- FB202 (Química II) requires BQU01 (Química I)
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'FB202_IND' AND p.code = 'BQU01_IND'
ON CONFLICT DO NOTHING;

-- ==============================================
-- PREREQUISITES - CICLO III (IND)
-- ==============================================

-- BFI01 (Física I) requires BMA02 (Cálculo Integral)
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'BFI01_IND' AND p.code = 'BMA02_IND'
ON CONFLICT DO NOTHING;

-- BFI01 (Física I) requires FB101 (Geometría Analítica)
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'BFI01_IND' AND p.code = 'FB101_IND'
ON CONFLICT DO NOTHING;

-- HU301 (Metodología) requires BRC01
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'HU301_IND' AND p.code = 'BRC01_IND'
ON CONFLICT DO NOTHING;

-- FB301 (Matemática Discreta) requires BMA03 (Álgebra Lineal)
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'FB301_IND' AND p.code = 'BMA03_IND'
ON CONFLICT DO NOTHING;

-- FB301 (Matemática Discreta) requires BIC01 (Introducción a la Computación)
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'FB301_IND' AND p.code = 'BIC01_IND'
ON CONFLICT DO NOTHING;

-- FB303 (Cálculo Multivariable) requires BMA02 (Cálculo Integral)
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'FB303_IND' AND p.code = 'BMA02_IND'
ON CONFLICT DO NOTHING;

-- FB303 (Cálculo Multivariable) requires BMA03 (Álgebra Lineal)
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'FB303_IND' AND p.code = 'BMA03_IND'
ON CONFLICT DO NOTHING;

-- TE302 (Diseño Asistido por Computador) requires TE101 (Dibujo de Ingeniería)
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'TE302_IND' AND p.code = 'TE101_IND'
ON CONFLICT DO NOTHING;

-- TE301 (Físico Química) requires FB202 (Química II)
INSERT INTO curso_prerrequisitos (curso_id, prerrequisito_id)
SELECT c.id, p.id
FROM cursos c, cursos p
WHERE c.code = 'TE301_IND' AND p.code = 'FB202_IND'
ON CONFLICT DO NOTHING;

COMMIT;
