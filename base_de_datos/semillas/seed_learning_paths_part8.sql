-- Part 8 of 10
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

