-- Part 9 of 10
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

