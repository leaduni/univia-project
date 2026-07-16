-- Part 1 of 10
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

