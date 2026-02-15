BEGIN;

-- Clear existing learning path steps
DELETE FROM learning_path_steps;

-- Processing BF101-Fisica_learning_path.csv
-- Course code: BFI01
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Introducción y Vectores', 'Mediciones, cifras significativas, vectores y operaciones.', '5h', 1, '{Magnitudes físicas, Sistema de unidades, Vectores, Producto escalar y vectorial}', 'ruler'
FROM cursos 
WHERE code = 'BFI01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Introducción y Vectores', 'Mediciones, cifras significativas, vectores y operaciones.', '5h', 1, '{Magnitudes físicas, Sistema de unidades, Vectores, Producto escalar y vectorial}', 'ruler'
FROM cursos 
WHERE code = 'BFI01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Introducción y Vectores', 'Mediciones, cifras significativas, vectores y operaciones.', '5h', 1, '{Magnitudes físicas, Sistema de unidades, Vectores, Producto escalar y vectorial}', 'ruler'
FROM cursos 
WHERE code = 'BFI01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Cinemática', 'Movimiento rectilíneo, curvilíneo y relativo.', '6h', 2, '{MRU, MRUV, Caída libre, Movimiento parabólico, Movimiento circular}', 'activity'
FROM cursos 
WHERE code = 'BFI01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Cinemática', 'Movimiento rectilíneo, curvilíneo y relativo.', '6h', 2, '{MRU, MRUV, Caída libre, Movimiento parabólico, Movimiento circular}', 'activity'
FROM cursos 
WHERE code = 'BFI01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Cinemática', 'Movimiento rectilíneo, curvilíneo y relativo.', '6h', 2, '{MRU, MRUV, Caída libre, Movimiento parabólico, Movimiento circular}', 'activity'
FROM cursos 
WHERE code = 'BFI01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Estática', 'Leyes de Newton, equilibrio de partículas y cuerpo rígido.', '7h', 3, '{Leyes de Newton, Diagrama de cuerpo libre, Equilibrio, Momento de una fuerza}', 'anchor'
FROM cursos 
WHERE code = 'BFI01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Estática', 'Leyes de Newton, equilibrio de partículas y cuerpo rígido.', '7h', 3, '{Leyes de Newton, Diagrama de cuerpo libre, Equilibrio, Momento de una fuerza}', 'anchor'
FROM cursos 
WHERE code = 'BFI01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Estática', 'Leyes de Newton, equilibrio de partículas y cuerpo rígido.', '7h', 3, '{Leyes de Newton, Diagrama de cuerpo libre, Equilibrio, Momento de una fuerza}', 'anchor'
FROM cursos 
WHERE code = 'BFI01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 4: Dinámica', 'Aplicaciones de leyes de Newton y fuerzas.', '7h', 4, '{Fuerza y masa, Dinámica lineal, Dinámica curvilínea}', 'zap'
FROM cursos 
WHERE code = 'BFI01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 4: Dinámica', 'Aplicaciones de leyes de Newton y fuerzas.', '7h', 4, '{Fuerza y masa, Dinámica lineal, Dinámica curvilínea}', 'zap'
FROM cursos 
WHERE code = 'BFI01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 4: Dinámica', 'Aplicaciones de leyes de Newton y fuerzas.', '7h', 4, '{Fuerza y masa, Dinámica lineal, Dinámica curvilínea}', 'zap'
FROM cursos 
WHERE code = 'BFI01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 5: Trabajo y Energía', 'Teoremas de conservación, energía cinética y potencial.', '9h', 5, '{Trabajo, Energía Cinética, Energía Potencial, Conservación de energía}', 'battery-charging'
FROM cursos 
WHERE code = 'BFI01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 5: Trabajo y Energía', 'Teoremas de conservación, energía cinética y potencial.', '9h', 5, '{Trabajo, Energía Cinética, Energía Potencial, Conservación de energía}', 'battery-charging'
FROM cursos 
WHERE code = 'BFI01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 5: Trabajo y Energía', 'Teoremas de conservación, energía cinética y potencial.', '9h', 5, '{Trabajo, Energía Cinética, Energía Potencial, Conservación de energía}', 'battery-charging'
FROM cursos 
WHERE code = 'BFI01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 6: Sistema de Partículas', 'Centro de masa, momento lineal y choques.', '5h', 6, '{Centro de masa, Momento lineal, Impulso, Choques}', 'users'
FROM cursos 
WHERE code = 'BFI01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 6: Sistema de Partículas', 'Centro de masa, momento lineal y choques.', '5h', 6, '{Centro de masa, Momento lineal, Impulso, Choques}', 'users'
FROM cursos 
WHERE code = 'BFI01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 6: Sistema de Partículas', 'Centro de masa, momento lineal y choques.', '5h', 6, '{Centro de masa, Momento lineal, Impulso, Choques}', 'users'
FROM cursos 
WHERE code = 'BFI01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 7: Fluidos', 'Densidad, presión y Principio de Arquímedes.', '5h', 7, '{Densidad, Presión, Principio de Pascal, Principio de Arquímedes}', 'droplet'
FROM cursos 
WHERE code = 'BFI01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 7: Fluidos', 'Densidad, presión y Principio de Arquímedes.', '5h', 7, '{Densidad, Presión, Principio de Pascal, Principio de Arquímedes}', 'droplet'
FROM cursos 
WHERE code = 'BFI01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 7: Fluidos', 'Densidad, presión y Principio de Arquímedes.', '5h', 7, '{Densidad, Presión, Principio de Pascal, Principio de Arquímedes}', 'droplet'
FROM cursos 
WHERE code = 'BFI01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 8: Vibraciones y Ondas', 'Movimiento armónico simple y ondas sonoras.', '5h', 8, '{Movimiento armónico simple, Péndulo, Ondas, Sonido}', 'radio'
FROM cursos 
WHERE code = 'BFI01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 8: Vibraciones y Ondas', 'Movimiento armónico simple y ondas sonoras.', '5h', 8, '{Movimiento armónico simple, Péndulo, Ondas, Sonido}', 'radio'
FROM cursos 
WHERE code = 'BFI01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 8: Vibraciones y Ondas', 'Movimiento armónico simple y ondas sonoras.', '5h', 8, '{Movimiento armónico simple, Péndulo, Ondas, Sonido}', 'radio'
FROM cursos 
WHERE code = 'BFI01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 9: Termodinámica', 'Temperatura, calor y leyes de la termodinámica.', '7h', 9, '{Temperatura, Calor, Dilatación, Leyes de la termodinámica}', 'thermometer'
FROM cursos 
WHERE code = 'BFI01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 9: Termodinámica', 'Temperatura, calor y leyes de la termodinámica.', '7h', 9, '{Temperatura, Calor, Dilatación, Leyes de la termodinámica}', 'thermometer'
FROM cursos 
WHERE code = 'BFI01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 9: Termodinámica', 'Temperatura, calor y leyes de la termodinámica.', '7h', 9, '{Temperatura, Calor, Dilatación, Leyes de la termodinámica}', 'thermometer'
FROM cursos 
WHERE code = 'BFI01_IND'
ON CONFLICT DO NOTHING;

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

-- Processing BMA02-Integral_learning_path.csv
-- Course code: BMA02
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 1: Integral Indefinida', 'Propiedades, integración por sustitución algebraica.', '4h', 1, '{Integral indefinida, Sustitución algebraica, Integración por partes}', 'plus-square'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 1: Integral Indefinida', 'Propiedades, integración por sustitución algebraica.', '4h', 1, '{Integral indefinida, Sustitución algebraica, Integración por partes}', 'plus-square'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 1: Integral Indefinida', 'Propiedades, integración por sustitución algebraica.', '4h', 1, '{Integral indefinida, Sustitución algebraica, Integración por partes}', 'plus-square'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 2: Integración Trigonométrica', 'Integrales de funciones trigonométricas e inversas.', '4h', 2, '{Funciones trigonométricas, Sustitución trigonométrica}', 'triangle'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 2: Integración Trigonométrica', 'Integrales de funciones trigonométricas e inversas.', '4h', 2, '{Funciones trigonométricas, Sustitución trigonométrica}', 'triangle'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 2: Integración Trigonométrica', 'Integrales de funciones trigonométricas e inversas.', '4h', 2, '{Funciones trigonométricas, Sustitución trigonométrica}', 'triangle'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 3: La Integral Definida', 'Sumas de Riemann y propiedades.', '4h', 3, '{Sumatoria, Suma de Riemann, Área bajo la curva}', 'bar-chart'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 3: La Integral Definida', 'Sumas de Riemann y propiedades.', '4h', 3, '{Sumatoria, Suma de Riemann, Área bajo la curva}', 'bar-chart'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 3: La Integral Definida', 'Sumas de Riemann y propiedades.', '4h', 3, '{Sumatoria, Suma de Riemann, Área bajo la curva}', 'bar-chart'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 4: Teoremas Fundamentales', 'Teorema fundamental del cálculo y valor medio.', '4h', 4, '{Teorema Fundamental del Cálculo, Teorema del Valor Medio}', 'book'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 4: Teoremas Fundamentales', 'Teorema fundamental del cálculo y valor medio.', '4h', 4, '{Teorema Fundamental del Cálculo, Teorema del Valor Medio}', 'book'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 4: Teoremas Fundamentales', 'Teorema fundamental del cálculo y valor medio.', '4h', 4, '{Teorema Fundamental del Cálculo, Teorema del Valor Medio}', 'book'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 5: Funciones Trascendentes', 'Logaritmo y exponencial.', '4h', 5, '{Función Logaritmo, Función Exponencial, Derivadas e Integrales}', 'log-in'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 5: Funciones Trascendentes', 'Logaritmo y exponencial.', '4h', 5, '{Función Logaritmo, Función Exponencial, Derivadas e Integrales}', 'log-in'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 5: Funciones Trascendentes', 'Logaritmo y exponencial.', '4h', 5, '{Función Logaritmo, Función Exponencial, Derivadas e Integrales}', 'log-in'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 6: Funciones Hiperbólicas', 'Definición y propiedades.', '4h', 6, '{Funciones Hiperbólicas, Inversas}', 'activity'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 6: Funciones Hiperbólicas', 'Definición y propiedades.', '4h', 6, '{Funciones Hiperbólicas, Inversas}', 'activity'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 6: Funciones Hiperbólicas', 'Definición y propiedades.', '4h', 6, '{Funciones Hiperbólicas, Inversas}', 'activity'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 7: Otras Bases', 'Exponenciales en otras bases y derivación logarítmica.', '4h', 7, '{Bases generales, Derivación logarítmica}', 'code'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 7: Otras Bases', 'Exponenciales en otras bases y derivación logarítmica.', '4h', 7, '{Bases generales, Derivación logarítmica}', 'code'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 7: Otras Bases', 'Exponenciales en otras bases y derivación logarítmica.', '4h', 7, '{Bases generales, Derivación logarítmica}', 'code'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 8: Examen Parcial', 'Evaluación parcial.', '2h', 8, '{Examen Parcial}', 'edit-3'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 8: Examen Parcial', 'Evaluación parcial.', '2h', 8, '{Examen Parcial}', 'edit-3'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 8: Examen Parcial', 'Evaluación parcial.', '2h', 8, '{Examen Parcial}', 'edit-3'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 9: Técnicas de Integración I', 'Potencias trigonométricas y fracciones parciales.', '4h', 9, '{Potencias trigonométricas, Fracciones parciales}', 'divide'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 9: Técnicas de Integración I', 'Potencias trigonométricas y fracciones parciales.', '4h', 9, '{Potencias trigonométricas, Fracciones parciales}', 'divide'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 9: Técnicas de Integración I', 'Potencias trigonométricas y fracciones parciales.', '4h', 9, '{Potencias trigonométricas, Fracciones parciales}', 'divide'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 10: Técnicas de Integración II', 'Funciones racionales de senos y cosenos.', '4h', 10, '{Funciones racionales, Sustitución de Weierstrass}', 'refresh-cw'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 10: Técnicas de Integración II', 'Funciones racionales de senos y cosenos.', '4h', 10, '{Funciones racionales, Sustitución de Weierstrass}', 'refresh-cw'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 10: Técnicas de Integración II', 'Funciones racionales de senos y cosenos.', '4h', 10, '{Funciones racionales, Sustitución de Weierstrass}', 'refresh-cw'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 11: Integrales Impropias', 'Sustituciones de Euler e integrales impropias.', '4h', 11, '{Sustituciones de Euler, Integrales impropias}', 'alert-circle'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 11: Integrales Impropias', 'Sustituciones de Euler e integrales impropias.', '4h', 11, '{Sustituciones de Euler, Integrales impropias}', 'alert-circle'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 11: Integrales Impropias', 'Sustituciones de Euler e integrales impropias.', '4h', 11, '{Sustituciones de Euler, Integrales impropias}', 'alert-circle'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 12: Funciones Gamma y Beta', 'Aplicaciones y funciones especiales.', '4h', 12, '{Función Gamma, Función Beta, Áreas}', 'star'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 12: Funciones Gamma y Beta', 'Aplicaciones y funciones especiales.', '4h', 12, '{Función Gamma, Función Beta, Áreas}', 'star'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 12: Funciones Gamma y Beta', 'Aplicaciones y funciones especiales.', '4h', 12, '{Función Gamma, Función Beta, Áreas}', 'star'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 13: Coordenadas Polares', 'Áreas y gráficas en polares.', '4h', 13, '{Coordenadas polares, Áreas en polares, Volumen disco}', 'compass'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 13: Coordenadas Polares', 'Áreas y gráficas en polares.', '4h', 13, '{Coordenadas polares, Áreas en polares, Volumen disco}', 'compass'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 13: Coordenadas Polares', 'Áreas y gráficas en polares.', '4h', 13, '{Coordenadas polares, Áreas en polares, Volumen disco}', 'compass'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 14: Volúmenes', 'Métodos del anillo y corteza cilíndrica.', '4h', 14, '{Volúmenes de revolución, Corteza cilíndrica}', 'layers'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 14: Volúmenes', 'Métodos del anillo y corteza cilíndrica.', '4h', 14, '{Volúmenes de revolución, Corteza cilíndrica}', 'layers'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 14: Volúmenes', 'Métodos del anillo y corteza cilíndrica.', '4h', 14, '{Volúmenes de revolución, Corteza cilíndrica}', 'layers'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 15: Longitud de Arco y Series', 'Aplicaciones físicas y Series de Taylor.', '4h', 15, '{Longitud de arco, Trabajo, Presión, Series de Taylor}', 'trending-up'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 15: Longitud de Arco y Series', 'Aplicaciones físicas y Series de Taylor.', '4h', 15, '{Longitud de arco, Trabajo, Presión, Series de Taylor}', 'trending-up'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 15: Longitud de Arco y Series', 'Aplicaciones físicas y Series de Taylor.', '4h', 15, '{Longitud de arco, Trabajo, Presión, Series de Taylor}', 'trending-up'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 16: Examen Final', 'Evaluación final.', '2h', 16, '{Examen Final}', 'file-text'
FROM cursos 
WHERE code = 'BMA02_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 16: Examen Final', 'Evaluación final.', '2h', 16, '{Examen Final}', 'file-text'
FROM cursos 
WHERE code = 'BMA02_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 16: Examen Final', 'Evaluación final.', '2h', 16, '{Examen Final}', 'file-text'
FROM cursos 
WHERE code = 'BMA02_IND'
ON CONFLICT DO NOTHING;

-- Processing BMA03-Lineal_learning_path.csv
-- Course code: BMA03
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Álgebra Matricial', 'Definiciones y operaciones con matrices.', '3h', 1, '{Matrices, Tipos de matrices, Operaciones, Transpuesta}', 'grid'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Álgebra Matricial', 'Definiciones y operaciones con matrices.', '3h', 1, '{Matrices, Tipos de matrices, Operaciones, Transpuesta}', 'grid'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Álgebra Matricial', 'Definiciones y operaciones con matrices.', '3h', 1, '{Matrices, Tipos de matrices, Operaciones, Transpuesta}', 'grid'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Determinantes', 'Cálculo y propiedades de determinantes.', '3h', 2, '{Determinantes, Cofactores, Propiedades}', 'maximize'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Determinantes', 'Cálculo y propiedades de determinantes.', '3h', 2, '{Determinantes, Cofactores, Propiedades}', 'maximize'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Determinantes', 'Cálculo y propiedades de determinantes.', '3h', 2, '{Determinantes, Cofactores, Propiedades}', 'maximize'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Rango e Inversa', 'Operaciones elementales y cálculo de inversa.', '3h', 3, '{Rango, Matriz Inversa, Operaciones elementales}', 'minimize-2'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Rango e Inversa', 'Operaciones elementales y cálculo de inversa.', '3h', 3, '{Rango, Matriz Inversa, Operaciones elementales}', 'minimize-2'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Rango e Inversa', 'Operaciones elementales y cálculo de inversa.', '3h', 3, '{Rango, Matriz Inversa, Operaciones elementales}', 'minimize-2'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 4: Sistemas de Ecuaciones', 'Solución de sistemas lineales.', '3h', 4, '{Sistemas lineales, Regla de Cramer, Métodos matriciales}', 'list'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 4: Sistemas de Ecuaciones', 'Solución de sistemas lineales.', '3h', 4, '{Sistemas lineales, Regla de Cramer, Métodos matriciales}', 'list'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 4: Sistemas de Ecuaciones', 'Solución de sistemas lineales.', '3h', 4, '{Sistemas lineales, Regla de Cramer, Métodos matriciales}', 'list'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 5: Geometría en el Espacio', 'Vectores en R3.', '3h', 5, '{Vectores en R3, Producto escalar, Norma}', 'box'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 5: Geometría en el Espacio', 'Vectores en R3.', '3h', 5, '{Vectores en R3, Producto escalar, Norma}', 'box'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 5: Geometría en el Espacio', 'Vectores en R3.', '3h', 5, '{Vectores en R3, Producto escalar, Norma}', 'box'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 6: Producto Vectorial', 'Proyección y producto vectorial.', '3h', 6, '{Proyección ortogonal, Producto vectorial, Triple producto}', 'crosshair'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 6: Producto Vectorial', 'Proyección y producto vectorial.', '3h', 6, '{Proyección ortogonal, Producto vectorial, Triple producto}', 'crosshair'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 6: Producto Vectorial', 'Proyección y producto vectorial.', '3h', 6, '{Proyección ortogonal, Producto vectorial, Triple producto}', 'crosshair'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 7: Independencia Lineal', 'Conceptos de dependencia e independencia.', '3h', 7, '{Independencia lineal, Dependencia lineal}', 'git-branch'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 7: Independencia Lineal', 'Conceptos de dependencia e independencia.', '3h', 7, '{Independencia lineal, Dependencia lineal}', 'git-branch'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 7: Independencia Lineal', 'Conceptos de dependencia e independencia.', '3h', 7, '{Independencia lineal, Dependencia lineal}', 'git-branch'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 8: Rectas y Planos', 'Ecuaciones de rectas y planos en el espacio.', '3h', 8, '{Rectas en R3, Planos, Intersecciones}', 'map'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 8: Rectas y Planos', 'Ecuaciones de rectas y planos en el espacio.', '3h', 8, '{Rectas en R3, Planos, Intersecciones}', 'map'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 8: Rectas y Planos', 'Ecuaciones de rectas y planos en el espacio.', '3h', 8, '{Rectas en R3, Planos, Intersecciones}', 'map'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 9: Espacios Vectoriales', 'Definición y propiedades generales.', '3h', 9, '{Espacios vectoriales, Subespacios, Base, Dimensión}', 'layout'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 9: Espacios Vectoriales', 'Definición y propiedades generales.', '3h', 9, '{Espacios vectoriales, Subespacios, Base, Dimensión}', 'layout'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 9: Espacios Vectoriales', 'Definición y propiedades generales.', '3h', 9, '{Espacios vectoriales, Subespacios, Base, Dimensión}', 'layout'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 10: Transformaciones Lineales', 'Definición, núcleo e imagen.', '3h', 10, '{Transformaciones lineales, Núcleo, Imagen}', 'repeat'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 10: Transformaciones Lineales', 'Definición, núcleo e imagen.', '3h', 10, '{Transformaciones lineales, Núcleo, Imagen}', 'repeat'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 10: Transformaciones Lineales', 'Definición, núcleo e imagen.', '3h', 10, '{Transformaciones lineales, Núcleo, Imagen}', 'repeat'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 11: Rep. Matricial', 'Matriz asociada a una transformación.', '3h', 11, '{Representación matricial, Operadores lineales}', 'monitor'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 11: Rep. Matricial', 'Matriz asociada a una transformación.', '3h', 11, '{Representación matricial, Operadores lineales}', 'monitor'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 11: Rep. Matricial', 'Matriz asociada a una transformación.', '3h', 11, '{Representación matricial, Operadores lineales}', 'monitor'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 12: Valores Propios', 'Autovalores y autovectores.', '3h', 12, '{Valores propios, Vectores propios, Diagonalización}', 'target'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 12: Valores Propios', 'Autovalores y autovectores.', '3h', 12, '{Valores propios, Vectores propios, Diagonalización}', 'target'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 12: Valores Propios', 'Autovalores y autovectores.', '3h', 12, '{Valores propios, Vectores propios, Diagonalización}', 'target'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 13: Diag. Transformaciones', 'Diagonalización de operadores.', '3h', 13, '{Diagonalización de transformaciones, Ortogonalización}', 'sliders'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 13: Diag. Transformaciones', 'Diagonalización de operadores.', '3h', 13, '{Diagonalización de transformaciones, Ortogonalización}', 'sliders'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 13: Diag. Transformaciones', 'Diagonalización de operadores.', '3h', 13, '{Diagonalización de transformaciones, Ortogonalización}', 'sliders'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 14: Formas Cuadráticas', 'Aplicación a cónicas y superficies.', '3h', 14, '{Formas cuadráticas, Cónicas, Superficies}', 'circle'
FROM cursos 
WHERE code = 'BMA03_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 14: Formas Cuadráticas', 'Aplicación a cónicas y superficies.', '3h', 14, '{Formas cuadráticas, Cónicas, Superficies}', 'circle'
FROM cursos 
WHERE code = 'BMA03_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 14: Formas Cuadráticas', 'Aplicación a cónicas y superficies.', '3h', 14, '{Formas cuadráticas, Cónicas, Superficies}', 'circle'
FROM cursos 
WHERE code = 'BMA03_IND'
ON CONFLICT DO NOTHING;

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

-- Processing FB101-Analítica_learning_path.csv
-- Course code: FB101
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Vectores 2D', 'Sistema de coordenadas y vectores en el plano.', '4h', 1, '{Coordenadas, Vectores R2, Operaciones}', 'move'
FROM cursos 
WHERE code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Vectores 2D', 'Sistema de coordenadas y vectores en el plano.', '4h', 1, '{Coordenadas, Vectores R2, Operaciones}', 'move'
FROM cursos 
WHERE code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Vectores 2D', 'Sistema de coordenadas y vectores en el plano.', '4h', 1, '{Coordenadas, Vectores R2, Operaciones}', 'move'
FROM cursos 
WHERE code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Producto Escalar', 'Ortogonalidad y proyección.', '4h', 2, '{Producto escalar, Norma, Ortogonalidad}', 'minimize'
FROM cursos 
WHERE code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Producto Escalar', 'Ortogonalidad y proyección.', '4h', 2, '{Producto escalar, Norma, Ortogonalidad}', 'minimize'
FROM cursos 
WHERE code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Producto Escalar', 'Ortogonalidad y proyección.', '4h', 2, '{Producto escalar, Norma, Ortogonalidad}', 'minimize'
FROM cursos 
WHERE code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Proyección y Área', 'Componentes y áreas de polígonos.', '4h', 3, '{Proyección ortogonal, Área de triángulos}', 'triangle'
FROM cursos 
WHERE code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Proyección y Área', 'Componentes y áreas de polígonos.', '4h', 3, '{Proyección ortogonal, Área de triángulos}', 'triangle'
FROM cursos 
WHERE code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Proyección y Área', 'Componentes y áreas de polígonos.', '4h', 3, '{Proyección ortogonal, Área de triángulos}', 'triangle'
FROM cursos 
WHERE code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 4: Independencia Lineal', 'Dependencia lineal y división de segmentos.', '4h', 4, '{Independencia lineal, Punto medio}', 'git-commit'
FROM cursos 
WHERE code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 4: Independencia Lineal', 'Dependencia lineal y división de segmentos.', '4h', 4, '{Independencia lineal, Punto medio}', 'git-commit'
FROM cursos 
WHERE code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 4: Independencia Lineal', 'Dependencia lineal y división de segmentos.', '4h', 4, '{Independencia lineal, Punto medio}', 'git-commit'
FROM cursos 
WHERE code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 5: La Recta', 'Ecuaciones y propiedades de la recta.', '4h', 5, '{Ecuación de la recta, Pendiente, Distancia punto-recta}', 'minus'
FROM cursos 
WHERE code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 5: La Recta', 'Ecuaciones y propiedades de la recta.', '4h', 5, '{Ecuación de la recta, Pendiente, Distancia punto-recta}', 'minus'
FROM cursos 
WHERE code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 5: La Recta', 'Ecuaciones y propiedades de la recta.', '4h', 5, '{Ecuación de la recta, Pendiente, Distancia punto-recta}', 'minus'
FROM cursos 
WHERE code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 6: Transformación Coordenadas', 'Traslación y rotación de ejes.', '4h', 6, '{Traslación, Rotación}', 'refresh-ccw'
FROM cursos 
WHERE code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 6: Transformación Coordenadas', 'Traslación y rotación de ejes.', '4h', 6, '{Traslación, Rotación}', 'refresh-ccw'
FROM cursos 
WHERE code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 6: Transformación Coordenadas', 'Traslación y rotación de ejes.', '4h', 6, '{Traslación, Rotación}', 'refresh-ccw'
FROM cursos 
WHERE code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 7: La Circunferencia', 'Ecuación y recta tangente.', '4h', 7, '{Circunferencia, Recta tangente}', 'circle'
FROM cursos 
WHERE code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 7: La Circunferencia', 'Ecuación y recta tangente.', '4h', 7, '{Circunferencia, Recta tangente}', 'circle'
FROM cursos 
WHERE code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 7: La Circunferencia', 'Ecuación y recta tangente.', '4h', 7, '{Circunferencia, Recta tangente}', 'circle'
FROM cursos 
WHERE code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 8: La Parábola', 'Definición, elementos y ecuaciones.', '4h', 8, '{Parábola, Foco, Directriz}', 'wifi'
FROM cursos 
WHERE code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 8: La Parábola', 'Definición, elementos y ecuaciones.', '4h', 8, '{Parábola, Foco, Directriz}', 'wifi'
FROM cursos 
WHERE code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 8: La Parábola', 'Definición, elementos y ecuaciones.', '4h', 8, '{Parábola, Foco, Directriz}', 'wifi'
FROM cursos 
WHERE code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 9: La Elipse', 'Propiedades y ecuaciones.', '4h', 9, '{Elipse, Ejes, Excentricidad}', 'loader'
FROM cursos 
WHERE code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 9: La Elipse', 'Propiedades y ecuaciones.', '4h', 9, '{Elipse, Ejes, Excentricidad}', 'loader'
FROM cursos 
WHERE code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 9: La Elipse', 'Propiedades y ecuaciones.', '4h', 9, '{Elipse, Ejes, Excentricidad}', 'loader'
FROM cursos 
WHERE code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 10: La Hipérbola', 'Asíntotas y ecuaciones.', '4h', 10, '{Hipérbola, Asíntotas}', 'code'
FROM cursos 
WHERE code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 10: La Hipérbola', 'Asíntotas y ecuaciones.', '4h', 10, '{Hipérbola, Asíntotas}', 'code'
FROM cursos 
WHERE code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 10: La Hipérbola', 'Asíntotas y ecuaciones.', '4h', 10, '{Hipérbola, Asíntotas}', 'code'
FROM cursos 
WHERE code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 11: Ecuación General 2do Grado', 'Clasificación de cónicas.', '4h', 11, '{Ecuación general, Cónicas}', 'grid'
FROM cursos 
WHERE code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 11: Ecuación General 2do Grado', 'Clasificación de cónicas.', '4h', 11, '{Ecuación general, Cónicas}', 'grid'
FROM cursos 
WHERE code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 11: Ecuación General 2do Grado', 'Clasificación de cónicas.', '4h', 11, '{Ecuación general, Cónicas}', 'grid'
FROM cursos 
WHERE code = 'FB101_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 12: Invariantes', 'Identificación de cónicas por invariantes.', '4h', 12, '{Invariantes, Rotación de cónicas}', 'shield'
FROM cursos 
WHERE code = 'FB101_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 12: Invariantes', 'Identificación de cónicas por invariantes.', '4h', 12, '{Invariantes, Rotación de cónicas}', 'shield'
FROM cursos 
WHERE code = 'FB101_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 12: Invariantes', 'Identificación de cónicas por invariantes.', '4h', 12, '{Invariantes, Rotación de cónicas}', 'shield'
FROM cursos 
WHERE code = 'FB101_IND'
ON CONFLICT DO NOTHING;

-- Processing FB301-Discreta_learning_path.csv
-- Course code: FB301
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Sistemas Numéricos', 'Representación de datos y aritmética binaria.', '8h', 1, '{Binario, IEEE 754, Punto flotante}', 'cpu'
FROM cursos 
WHERE code = 'FB301_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Sistemas Numéricos', 'Representación de datos y aritmética binaria.', '8h', 1, '{Binario, IEEE 754, Punto flotante}', 'cpu'
FROM cursos 
WHERE code = 'FB301_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Sistemas Numéricos', 'Representación de datos y aritmética binaria.', '8h', 1, '{Binario, IEEE 754, Punto flotante}', 'cpu'
FROM cursos 
WHERE code = 'FB301_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Lógica Proposicional', 'Métodos de demostración e inducción.', '4h', 2, '{Lógica, Cuantificadores, Inducción}', 'check-square'
FROM cursos 
WHERE code = 'FB301_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Lógica Proposicional', 'Métodos de demostración e inducción.', '4h', 2, '{Lógica, Cuantificadores, Inducción}', 'check-square'
FROM cursos 
WHERE code = 'FB301_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Lógica Proposicional', 'Métodos de demostración e inducción.', '4h', 2, '{Lógica, Cuantificadores, Inducción}', 'check-square'
FROM cursos 
WHERE code = 'FB301_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Relaciones Binarias', 'Relaciones de equivalencia y orden.', '8h', 3, '{Relaciones, Digrafos, Orden parcial, Hasse}', 'git-merge'
FROM cursos 
WHERE code = 'FB301_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Relaciones Binarias', 'Relaciones de equivalencia y orden.', '8h', 3, '{Relaciones, Digrafos, Orden parcial, Hasse}', 'git-merge'
FROM cursos 
WHERE code = 'FB301_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Relaciones Binarias', 'Relaciones de equivalencia y orden.', '8h', 3, '{Relaciones, Digrafos, Orden parcial, Hasse}', 'git-merge'
FROM cursos 
WHERE code = 'FB301_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 4: Grafos', 'Teoría de grafos y trayectorias.', '4h', 4, '{Grafos, Euler, Matriz adyacencia}', 'share'
FROM cursos 
WHERE code = 'FB301_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 4: Grafos', 'Teoría de grafos y trayectorias.', '4h', 4, '{Grafos, Euler, Matriz adyacencia}', 'share'
FROM cursos 
WHERE code = 'FB301_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 4: Grafos', 'Teoría de grafos y trayectorias.', '4h', 4, '{Grafos, Euler, Matriz adyacencia}', 'share'
FROM cursos 
WHERE code = 'FB301_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 5: Árboles', 'Árboles binarios y algoritmos de optimización.', '8h', 5, '{Árboles, Huffman, Prim, Kruskal}', 'git-pull-request'
FROM cursos 
WHERE code = 'FB301_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 5: Árboles', 'Árboles binarios y algoritmos de optimización.', '8h', 5, '{Árboles, Huffman, Prim, Kruskal}', 'git-pull-request'
FROM cursos 
WHERE code = 'FB301_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 5: Árboles', 'Árboles binarios y algoritmos de optimización.', '8h', 5, '{Árboles, Huffman, Prim, Kruskal}', 'git-pull-request'
FROM cursos 
WHERE code = 'FB301_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 6: Álgebra de Boole', 'Circuitos lógicos y mapas de Karnaugh.', '8h', 6, '{Álgebra Booleana, Compuertas lógicas, Karnaugh}', 'toggle-left'
FROM cursos 
WHERE code = 'FB301_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 6: Álgebra de Boole', 'Circuitos lógicos y mapas de Karnaugh.', '8h', 6, '{Álgebra Booleana, Compuertas lógicas, Karnaugh}', 'toggle-left'
FROM cursos 
WHERE code = 'FB301_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 6: Álgebra de Boole', 'Circuitos lógicos y mapas de Karnaugh.', '8h', 6, '{Álgebra Booleana, Compuertas lógicas, Karnaugh}', 'toggle-left'
FROM cursos 
WHERE code = 'FB301_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 7: Estructuras Algebraicas', 'Grupos, semigrupos y codificación.', '8h', 7, '{Grupos, Semigrupos, Hammin, Paridad}', 'box'
FROM cursos 
WHERE code = 'FB301_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 7: Estructuras Algebraicas', 'Grupos, semigrupos y codificación.', '8h', 7, '{Grupos, Semigrupos, Hammin, Paridad}', 'box'
FROM cursos 
WHERE code = 'FB301_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 7: Estructuras Algebraicas', 'Grupos, semigrupos y codificación.', '8h', 7, '{Grupos, Semigrupos, Hammin, Paridad}', 'box'
FROM cursos 
WHERE code = 'FB301_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 8: Teoría de Lenguajes', 'Autómatas y máquinas de estado finito.', '4h', 8, '{Lenguajes, Autómatas, Máquinas de estado}', 'terminal'
FROM cursos 
WHERE code = 'FB301_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 8: Teoría de Lenguajes', 'Autómatas y máquinas de estado finito.', '4h', 8, '{Lenguajes, Autómatas, Máquinas de estado}', 'terminal'
FROM cursos 
WHERE code = 'FB301_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 8: Teoría de Lenguajes', 'Autómatas y máquinas de estado finito.', '4h', 8, '{Lenguajes, Autómatas, Máquinas de estado}', 'terminal'
FROM cursos 
WHERE code = 'FB301_IND'
ON CONFLICT DO NOTHING;

-- Processing FB303-Multivariable_learning_path.csv
-- Course code: FB303
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Cálculo Diferencial Vectorial', 'Derivadas parciales, gradientes y optimización.', '16h', 1, '{Derivadas parciales, Gradiente, Multiplicadores de Lagrange, Máximos y Mínimos}', 'layers'
FROM cursos 
WHERE code = 'FB303_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Cálculo Diferencial Vectorial', 'Derivadas parciales, gradientes y optimización.', '16h', 1, '{Derivadas parciales, Gradiente, Multiplicadores de Lagrange, Máximos y Mínimos}', 'layers'
FROM cursos 
WHERE code = 'FB303_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 1: Cálculo Diferencial Vectorial', 'Derivadas parciales, gradientes y optimización.', '16h', 1, '{Derivadas parciales, Gradiente, Multiplicadores de Lagrange, Máximos y Mínimos}', 'layers'
FROM cursos 
WHERE code = 'FB303_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Integrales Múltiples', 'Integrales dobles y triples, cambio de variable.', '14h', 2, '{Integrales dobles, Integrales triples, Coordenadas cilíndricas, Coordenadas esféricas}', 'box'
FROM cursos 
WHERE code = 'FB303_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Integrales Múltiples', 'Integrales dobles y triples, cambio de variable.', '14h', 2, '{Integrales dobles, Integrales triples, Coordenadas cilíndricas, Coordenadas esféricas}', 'box'
FROM cursos 
WHERE code = 'FB303_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 2: Integrales Múltiples', 'Integrales dobles y triples, cambio de variable.', '14h', 2, '{Integrales dobles, Integrales triples, Coordenadas cilíndricas, Coordenadas esféricas}', 'box'
FROM cursos 
WHERE code = 'FB303_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Cálculo Vectorial Integral', 'Integrales de línea y superficie, teoremas integrales.', '14h', 3, '{Integral de línea, Teorema de Green, Teorema de Stokes, Teorema de Gauss}', 'globe'
FROM cursos 
WHERE code = 'FB303_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Cálculo Vectorial Integral', 'Integrales de línea y superficie, teoremas integrales.', '14h', 3, '{Integral de línea, Teorema de Green, Teorema de Stokes, Teorema de Gauss}', 'globe'
FROM cursos 
WHERE code = 'FB303_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Unidad 3: Cálculo Vectorial Integral', 'Integrales de línea y superficie, teoremas integrales.', '14h', 3, '{Integral de línea, Teorema de Green, Teorema de Stokes, Teorema de Gauss}', 'globe'
FROM cursos 
WHERE code = 'FB303_IND'
ON CONFLICT DO NOTHING;

-- Processing SI205-Algorítmia-I2_learning_path.csv
-- Course code: SI205
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 1: Estructuras de Control', 'Secuenciales y selectivas.', '2h', 1, '{Control secuencial, If-Else, Anidamiento}', 'code'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 1: Estructuras de Control', 'Secuenciales y selectivas.', '2h', 1, '{Control secuencial, If-Else, Anidamiento}', 'code'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 1: Estructuras de Control', 'Secuenciales y selectivas.', '2h', 1, '{Control secuencial, If-Else, Anidamiento}', 'code'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 2: Estructuras Repetitivas', 'Bucles y repeticiones.', '2h', 2, '{For, While, Do-While}', 'repeat'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 2: Estructuras Repetitivas', 'Bucles y repeticiones.', '2h', 2, '{For, While, Do-While}', 'repeat'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 2: Estructuras Repetitivas', 'Bucles y repeticiones.', '2h', 2, '{For, While, Do-While}', 'repeat'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 3: Arreglos', 'Arreglos unidimensionales.', '2h', 3, '{Arrays, Vectores}', 'list'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 3: Arreglos', 'Arreglos unidimensionales.', '2h', 3, '{Arrays, Vectores}', 'list'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 3: Arreglos', 'Arreglos unidimensionales.', '2h', 3, '{Arrays, Vectores}', 'list'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 4: Ordenamiento', 'Algoritmos de ordenamiento.', '2h', 4, '{Bubble sort, Selection sort}', 'bar-chart-2'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 4: Ordenamiento', 'Algoritmos de ordenamiento.', '2h', 4, '{Bubble sort, Selection sort}', 'bar-chart-2'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 4: Ordenamiento', 'Algoritmos de ordenamiento.', '2h', 4, '{Bubble sort, Selection sort}', 'bar-chart-2'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 5: Búsqueda', 'Algoritmos de búsqueda.', '2h', 5, '{Búsqueda lineal, Búsqueda binaria}', 'search'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 5: Búsqueda', 'Algoritmos de búsqueda.', '2h', 5, '{Búsqueda lineal, Búsqueda binaria}', 'search'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 5: Búsqueda', 'Algoritmos de búsqueda.', '2h', 5, '{Búsqueda lineal, Búsqueda binaria}', 'search'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 6: Matrices', 'Arreglos multidimensionales.', '2h', 6, '{Matrices 2D, Operaciones matrices}', 'grid'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 6: Matrices', 'Arreglos multidimensionales.', '2h', 6, '{Matrices 2D, Operaciones matrices}', 'grid'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 6: Matrices', 'Arreglos multidimensionales.', '2h', 6, '{Matrices 2D, Operaciones matrices}', 'grid'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 7: Registros', 'Structs y arreglos de registros.', '2h', 7, '{Structs, Registros}', 'database'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 7: Registros', 'Structs y arreglos de registros.', '2h', 7, '{Structs, Registros}', 'database'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 7: Registros', 'Structs y arreglos de registros.', '2h', 7, '{Structs, Registros}', 'database'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 8: Examen Parcial', 'Evaluación parcial.', '2h', 8, '{Examen Parcial}', 'edit'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 8: Examen Parcial', 'Evaluación parcial.', '2h', 8, '{Examen Parcial}', 'edit'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 8: Examen Parcial', 'Evaluación parcial.', '2h', 8, '{Examen Parcial}', 'edit'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 9: Cadenas', 'Manejo de strings.', '2h', 9, '{Strings, Operaciones con texto}', 'type'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 9: Cadenas', 'Manejo de strings.', '2h', 9, '{Strings, Operaciones con texto}', 'type'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 9: Cadenas', 'Manejo de strings.', '2h', 9, '{Strings, Operaciones con texto}', 'type'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 10: Subprogramas', 'Funciones y procedimientos.', '2h', 10, '{Funciones, Parámetros}', 'box'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 10: Subprogramas', 'Funciones y procedimientos.', '2h', 10, '{Funciones, Parámetros}', 'box'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 10: Subprogramas', 'Funciones y procedimientos.', '2h', 10, '{Funciones, Parámetros}', 'box'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 11: Recursividad', 'Conceptos de recursión.', '2h', 11, '{Recursividad}', 'refresh-cw'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 11: Recursividad', 'Conceptos de recursión.', '2h', 11, '{Recursividad}', 'refresh-cw'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 11: Recursividad', 'Conceptos de recursión.', '2h', 11, '{Recursividad}', 'refresh-cw'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 12: Archivos', 'Manejo de archivos secuenciales y aleatorios.', '2h', 12, '{Archivos, Lectura/Escritura}', 'save'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 12: Archivos', 'Manejo de archivos secuenciales y aleatorios.', '2h', 12, '{Archivos, Lectura/Escritura}', 'save'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 12: Archivos', 'Manejo de archivos secuenciales y aleatorios.', '2h', 12, '{Archivos, Lectura/Escritura}', 'save'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 13: Punteros y Listas', 'Listas enlazadas.', '2h', 13, '{Punteros, Listas enlazadas}', 'link'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 13: Punteros y Listas', 'Listas enlazadas.', '2h', 13, '{Punteros, Listas enlazadas}', 'link'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 13: Punteros y Listas', 'Listas enlazadas.', '2h', 13, '{Punteros, Listas enlazadas}', 'link'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 14: Pilas y Colas', 'Estructuras LIFO y FIFO.', '2h', 14, '{Stacks, Queues}', 'layers'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 14: Pilas y Colas', 'Estructuras LIFO y FIFO.', '2h', 14, '{Stacks, Queues}', 'layers'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 14: Pilas y Colas', 'Estructuras LIFO y FIFO.', '2h', 14, '{Stacks, Queues}', 'layers'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 15: Árboles', 'Árboles binarios.', '2h', 15, '{Árboles binarios, Recorridos}', 'git-merge'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 15: Árboles', 'Árboles binarios.', '2h', 15, '{Árboles binarios, Recorridos}', 'git-merge'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 15: Árboles', 'Árboles binarios.', '2h', 15, '{Árboles binarios, Recorridos}', 'git-merge'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 16: Examen Final', 'Evaluación final.', '2h', 16, '{Examen Final}', 'file-text'
FROM cursos 
WHERE code = 'SI205_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 16: Examen Final', 'Evaluación final.', '2h', 16, '{Examen Final}', 'file-text'
FROM cursos 
WHERE code = 'SI205_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 16: Examen Final', 'Evaluación final.', '2h', 16, '{Examen Final}', 'file-text'
FROM cursos 
WHERE code = 'SI205_IND'
ON CONFLICT DO NOTHING;

-- Processing ilide.info-silabo-de-calculo-diferencial_learning_path.csv
-- Course code: BMA01
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 1: Lógica y Conjuntos', 'Introducción a la lógica proposicional y teoría de conjuntos.', '4h', 1, '{Lógica Proposicional, Conectivos, Conjuntos}', 'brain'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 1: Lógica y Conjuntos', 'Introducción a la lógica proposicional y teoría de conjuntos.', '4h', 1, '{Lógica Proposicional, Conectivos, Conjuntos}', 'brain'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 1: Lógica y Conjuntos', 'Introducción a la lógica proposicional y teoría de conjuntos.', '4h', 1, '{Lógica Proposicional, Conectivos, Conjuntos}', 'brain'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 2: Números Reales', 'Sistema de números reales y desigualdades.', '4h', 2, '{Números reales, Desigualdades}', 'hash'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 2: Números Reales', 'Sistema de números reales y desigualdades.', '4h', 2, '{Números reales, Desigualdades}', 'hash'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 2: Números Reales', 'Sistema de números reales y desigualdades.', '4h', 2, '{Números reales, Desigualdades}', 'hash'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 3: Valor Absoluto', 'Valor absoluto y máximo entero.', '4h', 3, '{Valor absoluto, Máximo entero}', 'maximize'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 3: Valor Absoluto', 'Valor absoluto y máximo entero.', '4h', 3, '{Valor absoluto, Máximo entero}', 'maximize'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 3: Valor Absoluto', 'Valor absoluto y máximo entero.', '4h', 3, '{Valor absoluto, Máximo entero}', 'maximize'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 4: Funciones', 'Dominio, rango y funciones especiales.', '4h', 4, '{Funciones, Dominio, Rango}', 'activity'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 4: Funciones', 'Dominio, rango y funciones especiales.', '4h', 4, '{Funciones, Dominio, Rango}', 'activity'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 4: Funciones', 'Dominio, rango y funciones especiales.', '4h', 4, '{Funciones, Dominio, Rango}', 'activity'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 5: Operaciones Funciones', 'Álgebra y composición de funciones.', '4h', 5, '{Álgebra de funciones, Composición}', 'plus-circle'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 5: Operaciones Funciones', 'Álgebra y composición de funciones.', '4h', 5, '{Álgebra de funciones, Composición}', 'plus-circle'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 5: Operaciones Funciones', 'Álgebra y composición de funciones.', '4h', 5, '{Álgebra de funciones, Composición}', 'plus-circle'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 6: Funciones Inversas', 'Función inversa y propiedades.', '4h', 6, '{Función inversa, Univalente}', 'rotate-ccw'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 6: Funciones Inversas', 'Función inversa y propiedades.', '4h', 6, '{Función inversa, Univalente}', 'rotate-ccw'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 6: Funciones Inversas', 'Función inversa y propiedades.', '4h', 6, '{Función inversa, Univalente}', 'rotate-ccw'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 7: Límites', 'Cálculo de límites.', '4h', 7, '{Límites algebraicos, Límites trigonométricos}', 'arrow-right'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 7: Límites', 'Cálculo de límites.', '4h', 7, '{Límites algebraicos, Límites trigonométricos}', 'arrow-right'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 7: Límites', 'Cálculo de límites.', '4h', 7, '{Límites algebraicos, Límites trigonométricos}', 'arrow-right'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 8: Examen Parcial', 'Evaluación parcial.', '2h', 8, '{Examen Parcial}', 'edit-2'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 8: Examen Parcial', 'Evaluación parcial.', '2h', 8, '{Examen Parcial}', 'edit-2'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 8: Examen Parcial', 'Evaluación parcial.', '2h', 8, '{Examen Parcial}', 'edit-2'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 9: Continuidad', 'Continuidad y asíntotas.', '4h', 9, '{Continuidad, Asíntotas}', 'git-commit'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 9: Continuidad', 'Continuidad y asíntotas.', '4h', 9, '{Continuidad, Asíntotas}', 'git-commit'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 9: Continuidad', 'Continuidad y asíntotas.', '4h', 9, '{Continuidad, Asíntotas}', 'git-commit'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 10: Teoremas Continuidad', 'Bolzano y Valor Intermedio.', '4h', 10, '{Teorema Valor Intermedio, Bolzano}', 'bookmark'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 10: Teoremas Continuidad', 'Bolzano y Valor Intermedio.', '4h', 10, '{Teorema Valor Intermedio, Bolzano}', 'bookmark'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 10: Teoremas Continuidad', 'Bolzano y Valor Intermedio.', '4h', 10, '{Teorema Valor Intermedio, Bolzano}', 'bookmark'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 11: La Derivada', 'Definición y reglas de derivación.', '4h', 11, '{Derivada, Regla de la cadena}', 'zap'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 11: La Derivada', 'Definición y reglas de derivación.', '4h', 11, '{Derivada, Regla de la cadena}', 'zap'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 11: La Derivada', 'Definición y reglas de derivación.', '4h', 11, '{Derivada, Regla de la cadena}', 'zap'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 12: Diferenciabilidad', 'Derivación implícita.', '4h', 12, '{Diferenciabilidad, Derivada implícita}', 'git-pull-request'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 12: Diferenciabilidad', 'Derivación implícita.', '4h', 12, '{Diferenciabilidad, Derivada implícita}', 'git-pull-request'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 12: Diferenciabilidad', 'Derivación implícita.', '4h', 12, '{Diferenciabilidad, Derivada implícita}', 'git-pull-request'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 13: Aplicaciones Derivada', 'Teorema del Valor Medio y Rolle.', '4h', 13, '{Valor Medio, Rolle, Lagrange}', 'trending-up'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 13: Aplicaciones Derivada', 'Teorema del Valor Medio y Rolle.', '4h', 13, '{Valor Medio, Rolle, Lagrange}', 'trending-up'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 13: Aplicaciones Derivada', 'Teorema del Valor Medio y Rolle.', '4h', 13, '{Valor Medio, Rolle, Lagrange}', 'trending-up'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 14: Extremos', 'Máximos y mínimos.', '4h', 14, '{Máximos, Mínimos, Optimización}', 'bar-chart'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 14: Extremos', 'Máximos y mínimos.', '4h', 14, '{Máximos, Mínimos, Optimización}', 'bar-chart'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 14: Extremos', 'Máximos y mínimos.', '4h', 14, '{Máximos, Mínimos, Optimización}', 'bar-chart'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 15: Concavidad', 'L''Hopital y gráficas.', '4h', 15, '{Concavidad, L'Hopital}', 'curve'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 15: Concavidad', 'L''Hopital y gráficas.', '4h', 15, '{Concavidad, L'Hopital}', 'curve'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 15: Concavidad', 'L''Hopital y gráficas.', '4h', 15, '{Concavidad, L'Hopital}', 'curve'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 16: Examen Final', 'Evaluación final.', '2h', 16, '{Examen Final}', 'award'
FROM cursos 
WHERE code = 'BMA01_SIS'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 16: Examen Final', 'Evaluación final.', '2h', 16, '{Examen Final}', 'award'
FROM cursos 
WHERE code = 'BMA01_SOFT'
ON CONFLICT DO NOTHING;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, 'Semana 16: Examen Final', 'Evaluación final.', '2h', 16, '{Examen Final}', 'award'
FROM cursos 
WHERE code = 'BMA01_IND'
ON CONFLICT DO NOTHING;

COMMIT;