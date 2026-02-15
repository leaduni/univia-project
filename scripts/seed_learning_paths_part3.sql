-- Part 3 of 10
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

