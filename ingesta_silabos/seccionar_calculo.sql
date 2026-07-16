-- Curso 12
DELETE FROM learning_path_steps WHERE curso_id = 12;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon) VALUES
  (12, 'Unidad 1: Lógica proposicional y conjuntos', 'Proposiciones, conectivos, cuantificadores y teoría de conjuntos.', '4h', 1, ARRAY['Proposiciones y conectivos logicos', 'Tablas de verdad', 'Cuantificadores', 'Operaciones con conjuntos'], 'check-square'),
  (12, 'Unidad 2: Funciones', 'Números reales, inecuaciones y estudio de funciones.', '4h', 2, ARRAY['Numeros reales e inecuaciones', 'Dominio y rango de funciones', 'Tipos de funciones', 'Operaciones y composicion de funciones', 'Funciones inversas'], 'function-square'),
  (12, 'Unidad 3: Límites y continuidad', 'Límites de funciones, límites laterales y continuidad.', '4h', 3, ARRAY['Limite de una funcion', 'Limites laterales e infinitos', 'Continuidad de funciones'], 'trending-up'),
  (12, 'Unidad 4: Derivación', 'Definición de derivada y reglas de derivación.', '4h', 4, ARRAY['Definicion de derivada', 'Reglas de derivacion', 'Regla de la cadena', 'Derivada implicita'], 'activity'),
  (12, 'Unidad 5: Aplicaciones de las derivadas y teoremas importantes', 'Optimización, razón de cambio y teoremas del valor medio.', '4h', 5, ARRAY['Optimizacion', 'Razon de cambio', 'Maximos y minimos', 'Teoremas del valor medio'], 'target');

-- Curso 32
DELETE FROM learning_path_steps WHERE curso_id = 32;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon) VALUES
  (32, 'Unidad 1: Lógica proposicional y conjuntos', 'Proposiciones, conectivos, cuantificadores y teoría de conjuntos.', '4h', 1, ARRAY['Proposiciones y conectivos logicos', 'Tablas de verdad', 'Cuantificadores', 'Operaciones con conjuntos'], 'check-square'),
  (32, 'Unidad 2: Funciones', 'Números reales, inecuaciones y estudio de funciones.', '4h', 2, ARRAY['Numeros reales e inecuaciones', 'Dominio y rango de funciones', 'Tipos de funciones', 'Operaciones y composicion de funciones', 'Funciones inversas'], 'function-square'),
  (32, 'Unidad 3: Límites y continuidad', 'Límites de funciones, límites laterales y continuidad.', '4h', 3, ARRAY['Limite de una funcion', 'Limites laterales e infinitos', 'Continuidad de funciones'], 'trending-up'),
  (32, 'Unidad 4: Derivación', 'Definición de derivada y reglas de derivación.', '4h', 4, ARRAY['Definicion de derivada', 'Reglas de derivacion', 'Regla de la cadena', 'Derivada implicita'], 'activity'),
  (32, 'Unidad 5: Aplicaciones de las derivadas y teoremas importantes', 'Optimización, razón de cambio y teoremas del valor medio.', '4h', 5, ARRAY['Optimizacion', 'Razon de cambio', 'Maximos y minimos', 'Teoremas del valor medio'], 'target');

-- Curso 50
DELETE FROM learning_path_steps WHERE curso_id = 50;
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon) VALUES
  (50, 'Unidad 1: Lógica proposicional y conjuntos', 'Proposiciones, conectivos, cuantificadores y teoría de conjuntos.', '4h', 1, ARRAY['Proposiciones y conectivos logicos', 'Tablas de verdad', 'Cuantificadores', 'Operaciones con conjuntos'], 'check-square'),
  (50, 'Unidad 2: Funciones', 'Números reales, inecuaciones y estudio de funciones.', '4h', 2, ARRAY['Numeros reales e inecuaciones', 'Dominio y rango de funciones', 'Tipos de funciones', 'Operaciones y composicion de funciones', 'Funciones inversas'], 'function-square'),
  (50, 'Unidad 3: Límites y continuidad', 'Límites de funciones, límites laterales y continuidad.', '4h', 3, ARRAY['Limite de una funcion', 'Limites laterales e infinitos', 'Continuidad de funciones'], 'trending-up'),
  (50, 'Unidad 4: Derivación', 'Definición de derivada y reglas de derivación.', '4h', 4, ARRAY['Definicion de derivada', 'Reglas de derivacion', 'Regla de la cadena', 'Derivada implicita'], 'activity'),
  (50, 'Unidad 5: Aplicaciones de las derivadas y teoremas importantes', 'Optimización, razón de cambio y teoremas del valor medio.', '4h', 5, ARRAY['Optimizacion', 'Razon de cambio', 'Maximos y minimos', 'Teoremas del valor medio'], 'target');
