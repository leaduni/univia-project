-- Part 4 of 10
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

