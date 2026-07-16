-- UNI_VIA SEED DATA
-- Datos iniciales basados en mockData.ts

-- 1. Facultades
INSERT INTO facultades (codigo, nombre, descripcion) VALUES
('FI', 'Facultad de Ingeniería', 'Ingeniería y ciencias aplicadas');

-- 2. Carreras
INSERT INTO carreras (facultad_id, codigo, name, description) VALUES
(1, 'CS', 'Ingeniería en Ciencias de la Computación', 'Formación en ciencias de la computación'),
(1, 'CE', 'Ingeniería Civil', 'Formación en ingeniería civil'),
(1, 'EE', 'Ingeniería Eléctrica', 'Formación en ingeniería eléctrica'),
(1, 'IE', 'Ingeniería Industrial', 'Formación en ingeniería industrial');

-- 3. Cursos (Ciclo I - Ciencias de la Computación)
INSERT INTO cursos (id, carrera_id, code, name, credits, description, ciclo) VALUES
(101, 1, 'CS101', 'Programación Fundamental', 4, 'Introducción a los conceptos básicos de programación using Python', 1),
(102, 1, 'MAT101', 'Cálculo I', 4, 'Fundamentos de límites, derivadas e integrales', 1),
(103, 1, 'FIS101', 'Física I', 4, 'Mecánica clásica y termodinámica básica', 1),
(104, 1, 'COM101', 'Comunicación', 3, 'Habilidades de comunicación académica y profesional', 1),
(105, 1, 'HUM101', 'Humanidades', 3, 'Introducción a la filosofía y ética', 1);

-- 4. Cursos (Ciclo II - Ciencias de la Computación)
INSERT INTO cursos (id, carrera_id, code, name, credits, description, ciclo) VALUES
(201, 1, 'CS201', 'Estructuras de Datos', 4, 'Listas, pilas, colas, árboles y grafos', 2),
(202, 1, 'MAT201', 'Cálculo II', 4, 'Integrales múltiples y ecuaciones diferenciales', 2),
(203, 1, 'FIS201', 'Física II', 4, 'Electricidad y magnetismo', 2),
(204, 1, 'ALG101', 'Álgebra Lineal', 4, 'Matrices, vectores y transformaciones lineales', 2),
(205, 1, 'ENG101', 'Inglés Técnico', 3, 'Inglés para programación y documentación técnica', 2);

-- 5. Cursos (Ciclo III - Ciencias de la Computación)
INSERT INTO cursos (id, carrera_id, code, name, credits, description, ciclo) VALUES
(301, 1, 'CS301', 'Algoritmos', 4, 'Análisis y diseño de algoritmos eficientes', 3),
(302, 1, 'DB301', 'Bases de Datos', 4, 'Modelado relacional, SQL y diseño de esquemas', 3),
(303, 1, 'SYS301', 'Sistemas Operativos', 4, 'Procesos, memoria, entrada/salida y gestión de recursos', 3),
(304, 1, 'STA301', 'Estadística', 4, 'Probabilidad, distribuciones e inferencia estadística', 3),
(305, 1, 'PRJ301', 'Proyecto I', 4, 'Proyecto práctico integrando conocimientos del ciclo', 3);

-- 6. Cursos (Ciclo IV - Ciencias de la Computación)
INSERT INTO cursos (id, carrera_id, code, name, credits, description, ciclo) VALUES
(401, 1, 'WEB401', 'Desarrollo Web', 4, 'Frontend y backend con frameworks modernos', 4),
(402, 1, 'MOB401', 'Desarrollo Móvil', 4, 'Aplicaciones para iOS y Android', 4),
(403, 1, 'ML401', 'Machine Learning', 4, 'Algoritmos de aprendizaje automático y deep learning', 4),
(404, 1, 'SEC401', 'Seguridad Informática', 4, 'Criptografía, auditoría y seguridad en redes', 4),
(405, 1, 'PRJ401', 'Proyecto II', 4, 'Proyecto capstone integrando especializaciones', 4);

-- 8. Sílabos Semanales (Learning Path Steps)
-- Programación Fundamental (CS101)
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon) VALUES
(101, 'Semana 1: Introducción', 'Conceptos básicos de computación y algoritmos', '4h', 1, ARRAY['Hardware y Software', 'Algoritmos y pseudocódigo'], 'monitor'),
(101, 'Semana 2: Elementos de Programación', 'Variables, tipos de datos y operadores', '4h', 2, ARRAY['Variables', 'Tipos Primitivos', 'Expresiones'], 'code'),
(101, 'Semana 3: Estructuras Secuenciales', 'Flujo de ejecución y entrada/salida', '4h', 3, ARRAY['Input/Output', 'Formateo de datos'], 'arrow-down'),
(101, 'Semana 4: Estructuras Selectivas I', 'Toma de decisiones con IF', '4h', 4, ARRAY['If Simple', 'If-Else'], 'git-branch'),
(101, 'Semana 5: Estructuras Selectivas II', 'Decisiones anidadas y múltiples', '4h', 5, ARRAY['Switch Case', 'Lógica Booleana'], 'split'),
(101, 'Semana 6: Estructuras Repetitivas I', 'Bucles determinados (FOR)', '4h', 6, ARRAY['Bucle FOR', 'Rangos'], 'rotate-cw'),
(101, 'Semana 7: Estructuras Repetitivas II', 'Bucles indeterminados (WHILE)', '4h', 7, ARRAY['While', 'Do-While'], 'repeat'),
(101, 'Semana 8: EXAMEN PARCIAL', 'Evaluación de los temas 1-7', '2h', 8, ARRAY['Repaso General', 'Exámen de medio ciclo'], 'file-text'),
(101, 'Semana 9: Funciones I', 'Modularización de código', '4h', 9, ARRAY['Definición de funciones', 'Parámetros'], 'package'),
(101, 'Semana 10: Funciones II', 'Ámbito de variables y recursividad', '4h', 10, ARRAY['Scope', 'Recursión básica'], 'layers'),
(101, 'Semana 11: Listas y Arreglos', 'Estructuras de datos lineales', '4h', 11, ARRAY['Arrays', 'Listas en Python'], 'list'),
(101, 'Semana 12: Cadenas de Texto', 'Manipulación de strings', '4h', 12, ARRAY['Métodos de String', 'Slicing'], 'type'),
(101, 'Semana 13: Diccionarios y Tuplas', 'Colecciones avanzadas', '4h', 13, ARRAY['Key-Value pairs', 'Imutabilidad'], 'database'),
(101, 'Semana 14: Manejo de Errores', 'Excepciones y depuración', '4h', 14, ARRAY['Try-Except', 'Debugging'], 'bug'),
(101, 'Semana 15: Archivos', 'Lectura y escritura de datos persistentes', '4h', 15, ARRAY['Text Files', 'CSV basics'], 'save'),
(101, 'Semana 16: EXAMEN FINAL', 'Evaluación integral de todo el curso', '2h', 16, ARRAY['Repaso Final', 'Evaluación Final'], 'award');

-- Cálculo I (MAT101)
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon) VALUES
(102, 'Semana 1: Funciones Reales', 'Definición, dominio y rango', '6h', 1, ARRAY['Funciones', 'Gráficas'], 'function'),
(102, 'Semana 4: Límites', 'Cálculo de límites finitos e infinitos', '6h', 4, ARRAY['Límites', 'Indeterminaciones'], 'arrow-right'),
(102, 'Semana 8: EXAMEN PARCIAL', 'Cálculo diferencial básico', '3h', 8, ARRAY['Derivadas', 'Límites'], 'edit-3'),
(102, 'Semana 12: La Derivada', 'Reglas de derivación y aplicaciones', '6h', 12, ARRAY['Cadena', 'Máximos y Mínimos'], 'trending-up');
