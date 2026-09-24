-- Ruta de aprendizaje para el curso FB305 / ID 12: Estadística y Probabilidades.
-- La ausencia de una restricción única en learning_path_steps se cubre con NOT EXISTS.
INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT 12, pasos.title, pasos.description, pasos.duration, pasos.order_index, pasos.topics, pasos.icon
FROM (
    VALUES
        ('Unidad 1: Estadística descriptiva', 'Conceptos básicos, población, muestra y tipos de variables.', '4h', 1, ARRAY['Población y muestra', 'Variables estadísticas', 'Escalas de medición'], 'bar-chart-3'),
        ('Unidad 2: Organización de datos', 'Tablas de frecuencia y representación gráfica de datos.', '4h', 2, ARRAY['Tablas de frecuencia', 'Histogramas', 'Gráficos estadísticos'], 'table-2'),
        ('Unidad 3: Medidas descriptivas', 'Medidas de tendencia central, posición y dispersión.', '4h', 3, ARRAY['Media, mediana y moda', 'Cuartiles y percentiles', 'Varianza y desviación estándar'], 'calculator'),
        ('Unidad 4: Probabilidad', 'Espacio muestral, eventos y reglas fundamentales de probabilidad.', '4h', 4, ARRAY['Espacio muestral', 'Eventos', 'Reglas de probabilidad'], 'dice-5'),
        ('Unidad 5: Probabilidad condicional', 'Probabilidad condicional, independencia y teorema de Bayes.', '4h', 5, ARRAY['Probabilidad condicional', 'Independencia', 'Teorema de Bayes'], 'git-branch'),
        ('Unidad 6: Variables aleatorias', 'Variables aleatorias discretas y continuas, esperanza y varianza.', '4h', 6, ARRAY['Variables discretas', 'Variables continuas', 'Esperanza y varianza'], 'sigma'),
        ('Unidad 7: Distribuciones de probabilidad', 'Distribuciones binomial, normal y sus aplicaciones.', '4h', 7, ARRAY['Distribución binomial', 'Distribución normal', 'Distribución normal estándar'], 'bell-curve'),
        ('Unidad 8: Inferencia estadística', 'Muestreo, estimación e introducción a pruebas de hipótesis.', '4h', 8, ARRAY['Muestreo', 'Intervalos de confianza', 'Pruebas de hipótesis'], 'chart-no-axes-combined')
) AS pasos(title, description, duration, order_index, topics, icon)
WHERE NOT EXISTS (
    SELECT 1
    FROM learning_path_steps existente
    WHERE existente.curso_id = 12
      AND existente.order_index = pasos.order_index
)
ON CONFLICT DO NOTHING;
