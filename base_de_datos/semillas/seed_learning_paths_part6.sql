-- Part 6 of 10
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

