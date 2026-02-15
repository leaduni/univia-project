-- Part 7 of 10
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

