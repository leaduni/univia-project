-- Part 10 of 10
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