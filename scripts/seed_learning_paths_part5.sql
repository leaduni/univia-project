-- Part 5 of 10
-- Processing BQU01-Química_1_learning_path.csv
-- Course code: BQU01
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 1: Estequiometría', 'Teoría atómica y cálculos estequiométricos.', '4h', 1, '{Átomo, Mol, Ecuación química, Balance de materia}', 'flask'
FROM cursos 
WHERE code = 'BQU01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 1: Estequiometría', 'Teoría atómica y cálculos estequiométricos.', '4h', 1, '{Átomo, Mol, Ecuación química, Balance de materia}', 'flask'
FROM cursos 
WHERE code = 'BQU01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 1: Estequiometría', 'Teoría atómica y cálculos estequiométricos.', '4h', 1, '{Átomo, Mol, Ecuación química, Balance de materia}', 'flask'
FROM cursos 
WHERE code = 'BQU01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 2: Termoquímica', 'Cambios de energía en reacciones.', '4h', 2, '{Entalpía, Ley de Hess, Calor de reacción}', 'flame'
FROM cursos 
WHERE code = 'BQU01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 2: Termoquímica', 'Cambios de energía en reacciones.', '4h', 2, '{Entalpía, Ley de Hess, Calor de reacción}', 'flame'
FROM cursos 
WHERE code = 'BQU01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 2: Termoquímica', 'Cambios de energía en reacciones.', '4h', 2, '{Entalpía, Ley de Hess, Calor de reacción}', 'flame'
FROM cursos 
WHERE code = 'BQU01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 3: Estructura Atómica', 'Teoría cuántica y tabla periódica.', '8h', 3, '{Teoría cuántica, Configuración electrónica, Tabla periódica}', 'atom'
FROM cursos 
WHERE code = 'BQU01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 3: Estructura Atómica', 'Teoría cuántica y tabla periódica.', '8h', 3, '{Teoría cuántica, Configuración electrónica, Tabla periódica}', 'atom'
FROM cursos 
WHERE code = 'BQU01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 3: Estructura Atómica', 'Teoría cuántica y tabla periódica.', '8h', 3, '{Teoría cuántica, Configuración electrónica, Tabla periódica}', 'atom'
FROM cursos 
WHERE code = 'BQU01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 4: Enlace Químico', 'Tipos de enlace y propiedades moleculares.', '8h', 4, '{Enlace iónico, Enlace covalente, Geometría molecular, Fuerzas intermoleculares}', 'share-2'
FROM cursos 
WHERE code = 'BQU01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 4: Enlace Químico', 'Tipos de enlace y propiedades moleculares.', '8h', 4, '{Enlace iónico, Enlace covalente, Geometría molecular, Fuerzas intermoleculares}', 'share-2'
FROM cursos 
WHERE code = 'BQU01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 4: Enlace Químico', 'Tipos de enlace y propiedades moleculares.', '8h', 4, '{Enlace iónico, Enlace covalente, Geometría molecular, Fuerzas intermoleculares}', 'share-2'
FROM cursos 
WHERE code = 'BQU01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 5: Estados de la Materia', 'Gases, líquidos y sólidos.', '8h', 5, '{Gases ideales, Presión de vapor, Estado sólido, Cristales}', 'package'
FROM cursos 
WHERE code = 'BQU01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 5: Estados de la Materia', 'Gases, líquidos y sólidos.', '8h', 5, '{Gases ideales, Presión de vapor, Estado sólido, Cristales}', 'package'
FROM cursos 
WHERE code = 'BQU01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 5: Estados de la Materia', 'Gases, líquidos y sólidos.', '8h', 5, '{Gases ideales, Presión de vapor, Estado sólido, Cristales}', 'package'
FROM cursos 
WHERE code = 'BQU01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 6: Soluciones', 'Propiedades de las disoluciones.', '4h', 6, '{Solubilidad, Concentración, Propiedades coligativas}', 'droplet'
FROM cursos 
WHERE code = 'BQU01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 6: Soluciones', 'Propiedades de las disoluciones.', '4h', 6, '{Solubilidad, Concentración, Propiedades coligativas}', 'droplet'
FROM cursos 
WHERE code = 'BQU01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 6: Soluciones', 'Propiedades de las disoluciones.', '4h', 6, '{Solubilidad, Concentración, Propiedades coligativas}', 'droplet'
FROM cursos 
WHERE code = 'BQU01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 7: Cinética Química', 'Velocidad de reacción.', '4h', 7, '{Rapidez de reacción, Energía de activación, Catalizadores}', 'clock'
FROM cursos 
WHERE code = 'BQU01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 7: Cinética Química', 'Velocidad de reacción.', '4h', 7, '{Rapidez de reacción, Energía de activación, Catalizadores}', 'clock'
FROM cursos 
WHERE code = 'BQU01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 7: Cinética Química', 'Velocidad de reacción.', '4h', 7, '{Rapidez de reacción, Energía de activación, Catalizadores}', 'clock'
FROM cursos 
WHERE code = 'BQU01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 8: Equilibrio Químico', 'Principio de Le Chatelier y espontaneidad.', '4h', 8, '{Equilibrio químico, Le Chatelier, Energía libre}', 'scales'
FROM cursos 
WHERE code = 'BQU01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 8: Equilibrio Químico', 'Principio de Le Chatelier y espontaneidad.', '4h', 8, '{Equilibrio químico, Le Chatelier, Energía libre}', 'scales'
FROM cursos 
WHERE code = 'BQU01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 8: Equilibrio Químico', 'Principio de Le Chatelier y espontaneidad.', '4h', 8, '{Equilibrio químico, Le Chatelier, Energía libre}', 'scales'
FROM cursos 
WHERE code = 'BQU01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 9: Equilibrio Iónico', 'Ácidos, bases y pH.', '4h', 9, '{pH, Ácidos y Bases, Buffer, Hidrólisis}', 'test-tube'
FROM cursos 
WHERE code = 'BQU01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 9: Equilibrio Iónico', 'Ácidos, bases y pH.', '4h', 9, '{pH, Ácidos y Bases, Buffer, Hidrólisis}', 'test-tube'
FROM cursos 
WHERE code = 'BQU01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 9: Equilibrio Iónico', 'Ácidos, bases y pH.', '4h', 9, '{pH, Ácidos y Bases, Buffer, Hidrólisis}', 'test-tube'
FROM cursos 
WHERE code = 'BQU01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 10: Electroquímica', 'Redox y celdas galvánicas.', '4h', 10, '{Redox, Celdas galvánicas, Electrólisis, Corrosión}', 'battery'
FROM cursos 
WHERE code = 'BQU01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 10: Electroquímica', 'Redox y celdas galvánicas.', '4h', 10, '{Redox, Celdas galvánicas, Electrólisis, Corrosión}', 'battery'
FROM cursos 
WHERE code = 'BQU01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 10: Electroquímica', 'Redox y celdas galvánicas.', '4h', 10, '{Redox, Celdas galvánicas, Electrólisis, Corrosión}', 'battery'
FROM cursos 
WHERE code = 'BQU01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 11: Materiales', 'Metales, aleaciones y polímeros.', '4h', 11, '{Metales, Aleaciones, Polímeros, Aceros}', 'tool'
FROM cursos 
WHERE code = 'BQU01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 11: Materiales', 'Metales, aleaciones y polímeros.', '4h', 11, '{Metales, Aleaciones, Polímeros, Aceros}', 'tool'
FROM cursos 
WHERE code = 'BQU01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Capítulo 11: Materiales', 'Metales, aleaciones y polímeros.', '4h', 11, '{Metales, Aleaciones, Polímeros, Aceros}', 'tool'
FROM cursos 
WHERE code = 'BQU01_IND'
ON CONFLICT DO NOTHING;

