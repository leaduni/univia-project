-- Part 2 of 10
-- Processing BIC01-Intro_Computacion_learning_path.csv
-- Course code: BIC01
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 1: Introducción', 'Definiciones básicas, lenguajes y algoritmos.', '3h', 1, '{Algoritmos, Lenguajes, C++}', 'terminal'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 1: Introducción', 'Definiciones básicas, lenguajes y algoritmos.', '3h', 1, '{Algoritmos, Lenguajes, C++}', 'terminal'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 1: Introducción', 'Definiciones básicas, lenguajes y algoritmos.', '3h', 1, '{Algoritmos, Lenguajes, C++}', 'terminal'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 2: Operadores', 'Operadores aritméticos, relacionales y lógicos.', '3h', 2, '{Operadores, Variables}', 'code'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 2: Operadores', 'Operadores aritméticos, relacionales y lógicos.', '3h', 2, '{Operadores, Variables}', 'code'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 2: Operadores', 'Operadores aritméticos, relacionales y lógicos.', '3h', 2, '{Operadores, Variables}', 'code'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 3: Proc. Secuenciales', 'Tipos de datos y estructuras secuenciales.', '3h', 3, '{Tipos de datos, Secuencia}', 'arrow-right'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 3: Proc. Secuenciales', 'Tipos de datos y estructuras secuenciales.', '3h', 3, '{Tipos de datos, Secuencia}', 'arrow-right'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 3: Proc. Secuenciales', 'Tipos de datos y estructuras secuenciales.', '3h', 3, '{Tipos de datos, Secuencia}', 'arrow-right'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 4: Est. Selectivas', 'Sentencias if-else y switch.', '3h', 4, '{If-Else, Switch}', 'git-branch'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 4: Est. Selectivas', 'Sentencias if-else y switch.', '3h', 4, '{If-Else, Switch}', 'git-branch'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 4: Est. Selectivas', 'Sentencias if-else y switch.', '3h', 4, '{If-Else, Switch}', 'git-branch'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 5: Estructura For', 'Bucles con número de repeticiones definido.', '3h', 5, '{Bucle For}', 'repeat'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 5: Estructura For', 'Bucles con número de repeticiones definido.', '3h', 5, '{Bucle For}', 'repeat'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 5: Estructura For', 'Bucles con número de repeticiones definido.', '3h', 5, '{Bucle For}', 'repeat'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 6: Estructura While', 'Bucles con entrada controlada.', '3h', 6, '{Bucle While}', 'rotate-cw'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 6: Estructura While', 'Bucles con entrada controlada.', '3h', 6, '{Bucle While}', 'rotate-cw'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 6: Estructura While', 'Bucles con entrada controlada.', '3h', 6, '{Bucle While}', 'rotate-cw'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 7: Estructura Do While', 'Bucles con salida controlada.', '3h', 7, '{Do While}', 'refresh-ccw'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 7: Estructura Do While', 'Bucles con salida controlada.', '3h', 7, '{Do While}', 'refresh-ccw'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 7: Estructura Do While', 'Bucles con salida controlada.', '3h', 7, '{Do While}', 'refresh-ccw'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 8: Examen Parcial', 'Evaluación parcial.', '2h', 8, '{Examen Parcial}', 'edit-3'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 8: Examen Parcial', 'Evaluación parcial.', '2h', 8, '{Examen Parcial}', 'edit-3'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 8: Examen Parcial', 'Evaluación parcial.', '2h', 8, '{Examen Parcial}', 'edit-3'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 9: Vectores', 'Arreglos unidimensionales.', '3h', 9, '{Vectores, Arreglos}', 'list'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 9: Vectores', 'Arreglos unidimensionales.', '3h', 9, '{Vectores, Arreglos}', 'list'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 9: Vectores', 'Arreglos unidimensionales.', '3h', 9, '{Vectores, Arreglos}', 'list'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 10: Matrices', 'Arreglos bidimensionales.', '3h', 10, '{Matrices, Arreglos 2D}', 'grid'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 10: Matrices', 'Arreglos bidimensionales.', '3h', 10, '{Matrices, Arreglos 2D}', 'grid'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 10: Matrices', 'Arreglos bidimensionales.', '3h', 10, '{Matrices, Arreglos 2D}', 'grid'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 11: Cadenas', 'Manipulación de textos y strings.', '3h', 11, '{Strings, Cadenas}', 'type'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 11: Cadenas', 'Manipulación de textos y strings.', '3h', 11, '{Strings, Cadenas}', 'type'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 11: Cadenas', 'Manipulación de textos y strings.', '3h', 11, '{Strings, Cadenas}', 'type'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 12: Funciones', 'Funciones definidas por el usuario.', '3h', 12, '{Funciones, Ámbito}', 'box'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 12: Funciones', 'Funciones definidas por el usuario.', '3h', 12, '{Funciones, Ámbito}', 'box'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 12: Funciones', 'Funciones definidas por el usuario.', '3h', 12, '{Funciones, Ámbito}', 'box'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 13: Punteros', 'Introducción a punteros.', '3h', 13, '{Punteros, Memoria}', 'cpu'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 13: Punteros', 'Introducción a punteros.', '3h', 13, '{Punteros, Memoria}', 'cpu'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 13: Punteros', 'Introducción a punteros.', '3h', 13, '{Punteros, Memoria}', 'cpu'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 14: Parámetros', 'Paso por valor y por referencia.', '3h', 14, '{Paso por valor, Paso por referencia}', 'sliders'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 14: Parámetros', 'Paso por valor y por referencia.', '3h', 14, '{Paso por valor, Paso por referencia}', 'sliders'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 14: Parámetros', 'Paso por valor y por referencia.', '3h', 14, '{Paso por valor, Paso por referencia}', 'sliders'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 15: Recursividad', 'Funciones recursivas.', '3h', 15, '{Recursividad, Backtracking}', 'corner-down-left'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 15: Recursividad', 'Funciones recursivas.', '3h', 15, '{Recursividad, Backtracking}', 'corner-down-left'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 15: Recursividad', 'Funciones recursivas.', '3h', 15, '{Recursividad, Backtracking}', 'corner-down-left'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 16: Examen Final', 'Evaluación final.', '2h', 16, '{Examen Final}', 'file-text'
FROM cursos 
WHERE code = 'BIC01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 16: Examen Final', 'Evaluación final.', '2h', 16, '{Examen Final}', 'file-text'
FROM cursos 
WHERE code = 'BIC01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 16: Examen Final', 'Evaluación final.', '2h', 16, '{Examen Final}', 'file-text'
FROM cursos 
WHERE code = 'BIC01_IND'
ON CONFLICT DO NOTHING;

