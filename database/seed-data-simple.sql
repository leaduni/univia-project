-- ============================================================================
-- UniVia - Datos de Ejemplo (VERSIÓN SIMPLE - IDs NUMÉRICOS)
-- ============================================================================
-- Ejecutar DESPUÉS de supabase-schema-simple.sql
-- ============================================================================

-- ============================================================================
-- FACULTADES
-- ============================================================================

INSERT INTO facultades (codigo, nombre, descripcion) VALUES
('ING', 'Ingeniería', 'Facultad de Ingeniería y Tecnología');

-- ============================================================================
-- CARRERAS
-- ============================================================================

INSERT INTO carreras (codigo, nombre, facultad_id, descripcion, duracion_ciclos) VALUES
('CS', 'Ingeniería en Ciencias de la Computación', 1, 'Programa de formación en ciencias de la computación', 10),
('CE', 'Ingeniería Civil', 1, 'Programa de formación en ingeniería civil', 10),
('EE', 'Ingeniería Eléctrica', 1, 'Programa de formación en ingeniería eléctrica', 10),
('IE', 'Ingeniería Industrial', 1, 'Programa de formación en ingeniería industrial', 10);

-- ============================================================================
-- CICLOS
-- ============================================================================

INSERT INTO ciclos (carrera_id, numero, nombre, creditos_totales) VALUES
-- Ciencias de la Computación
(1, 1, 'Ciclo I', 18),
(1, 2, 'Ciclo II', 19),
(1, 3, 'Ciclo III', 20),
(1, 4, 'Ciclo IV', 20);

-- ============================================================================
-- CURSOS - CICLO I
-- ============================================================================

INSERT INTO cursos (codigo, nombre, creditos, descripcion, ciclo_id, orden_en_ciclo) VALUES
('CS101', 'Programación Fundamental', 4, 'Introducción a los conceptos básicos de programación using Python', 1, 1),
('MAT101', 'Cálculo I', 4, 'Fundamentos de límites, derivadas e integrales', 1, 2),
('FIS101', 'Física I', 4, 'Mecánica clásica y termodinámica básica', 1, 3),
('COM101', 'Comunicación', 3, 'Habilidades de comunicación académica y profesional', 1, 4),
('HUM101', 'Humanidades', 3, 'Introducción a la filosofía y ética', 1, 5);

-- ============================================================================
-- CURSOS - CICLO II
-- ============================================================================

INSERT INTO cursos (codigo, nombre, creditos, descripcion, ciclo_id, orden_en_ciclo) VALUES
('CS201', 'Estructuras de Datos', 4, 'Listas, pilas, colas, árboles y grafos', 2, 1),
('MAT201', 'Cálculo II', 4, 'Integrales múltiples y ecuaciones diferenciales', 2, 2),
('FIS201', 'Física II', 4, 'Electricidad y magnetismo', 2, 3),
('ALG101', 'Álgebra Lineal', 4, 'Matrices, vectores y transformaciones lineales', 2, 4),
('ENG101', 'Inglés Técnico', 3, 'Inglés para programación y documentación técnica', 2, 5);

-- ============================================================================
-- CURSOS - CICLO III
-- ============================================================================

INSERT INTO cursos (codigo, nombre, creditos, descripcion, ciclo_id, orden_en_ciclo) VALUES
('CS301', 'Algoritmos', 4, 'Análisis y diseño de algoritmos eficientes', 3, 1),
('DB301', 'Bases de Datos', 4, 'Modelado relacional, SQL y diseño de esquemas', 3, 2),
('SYS301', 'Sistemas Operativos', 4, 'Procesos, memoria, entrada/salida y gestión de recursos', 3, 3),
('STA301', 'Estadística', 4, 'Probabilidad, distribuciones e inferencia estadística', 3, 4),
('PRJ301', 'Proyecto I', 4, 'Proyecto práctico integrando conocimientos del ciclo', 3, 5);

-- ============================================================================
-- CURSOS - CICLO IV
-- ============================================================================

INSERT INTO cursos (codigo, nombre, creditos, descripcion, ciclo_id, orden_en_ciclo) VALUES
('WEB401', 'Desarrollo Web', 4, 'Frontend y backend con frameworks modernos', 4, 1),
('MOB401', 'Desarrollo Móvil', 4, 'Aplicaciones para iOS y Android', 4, 2),
('ML401', 'Machine Learning', 4, 'Algoritmos de aprendizaje automático y deep learning', 4, 3),
('SEC401', 'Seguridad Informática', 4, 'Criptografía, auditoría y seguridad en redes', 4, 4),
('PRJ401', 'Proyecto II', 4, 'Proyecto capstone integrando especializaciones', 4, 5);

-- ============================================================================
-- PREREQUISITOS
-- ============================================================================

INSERT INTO prerequisitos (curso_id, prerequisito_curso_id) VALUES
-- Ciclo II requiere Ciclo I
(6, 1),   -- Estructuras de Datos requiere Programación Fundamental
(7, 2),   -- Cálculo II requiere Cálculo I
(8, 3),   -- Física II requiere Física I

-- Ciclo III requiere Ciclo II
(11, 6),  -- Algoritmos requiere Estructuras de Datos
(12, 6),  -- Bases de Datos requiere Estructuras de Datos
(13, 6),  -- Sistemas Operativos requiere Estructuras de Datos

-- Ciclo IV requiere Ciclo III
(16, 12), -- Desarrollo Web requiere Bases de Datos
(17, 11), -- Desarrollo Móvil requiere Algoritmos
(18, 14), -- Machine Learning requiere Estadística
(19, 13); -- Seguridad requiere Sistemas Operativos

-- ============================================================================
-- PROFESORES
-- ============================================================================

INSERT INTO profesores (nombre_completo, titulo, email, especialidad) VALUES
('Ana García', 'Mg.', 'ana.garcia@univia.edu', 'Programación y Algoritmos'),
('Carlos Mendez', 'Dr.', 'carlos.mendez@univia.edu', 'Estructuras de Datos y Algoritmos'),
('Roberto Fernández', 'Dr.', 'roberto.fernandez@univia.edu', 'Matemáticas Aplicadas');

-- ============================================================================
-- SECCIONES DE CURSO (Semestre actual: 2024-II)
-- ============================================================================

INSERT INTO secciones_curso (curso_id, profesor_id, codigo_seccion, semestre, fecha_inicio, fecha_fin, cupo_maximo) VALUES
-- Ciclo II - Semestre actual
(6, 2, 'A', '2024-II', '2024-08-01', '2024-12-20', 30),  -- CS201
(7, 3, 'A', '2024-II', '2024-08-01', '2024-12-20', 35),  -- MAT201
(8, 1, 'A', '2024-II', '2024-08-01', '2024-12-20', 30),  -- FIS201
(9, 3, 'A', '2024-II', '2024-08-01', '2024-12-20', 35),  -- ALG101
(10, 1, 'A', '2024-II', '2024-08-01', '2024-12-20', 25); -- ENG101

-- ============================================================================
-- TIMELINE DE APRENDIZAJE - CS201 (Estructuras de Datos)
-- ============================================================================

INSERT INTO timeline_pasos (seccion_curso_id, titulo, descripcion, duracion, orden, icono, topicos) VALUES
(1, 'Introducción a Estructuras de Datos', 'Conceptos fundamentales y clasificación de estructuras de datos', '1 semana', 1, 'BookOpen', ARRAY['Arrays', 'Linked Lists', 'Memory Management']),
(1, 'Arrays y Listas Dinámicas', 'Implementación y operaciones en arrays y listas enlazadas', '2 semanas', 2, 'Code', ARRAY['Array Operations', 'Linked Lists Implementation', 'Dynamic Memory']),
(1, 'Pilas y Colas', 'Estructuras LIFO y FIFO con aplicaciones prácticas', '2 semanas', 3, 'Circle', ARRAY['Stack Implementation', 'Queue Implementation', 'Applications']),
(1, 'Árboles Binarios', 'Estructuras jerárquicas y algoritmos de búsqueda en árboles', '3 semanas', 4, 'Circle', ARRAY['Binary Trees', 'Tree Traversal', 'BST Operations']),
(1, 'Grafos y Algoritmos de Búsqueda', 'Representación de grafos y algoritmos BFS, DFS', '2 semanas', 5, 'Lock', ARRAY['Graph Representation', 'BFS/DFS', 'Shortest Path']);

-- ============================================================================
-- RECURSOS DE TIMELINE
-- ============================================================================

INSERT INTO recursos_timeline (timeline_paso_id, tipo, titulo, duracion, orden) VALUES
-- Paso 1
(1, 'video', 'Introducción a ED', '15 min', 1),
(1, 'document', 'Guía de Conceptos Fundamentales', NULL, 2),

-- Paso 2
(2, 'video', 'Arrays en Profundidad', '22 min', 1),
(2, 'code', 'Ejemplos de Código - Arrays', NULL, 2),
(2, 'document', 'Ejercicios Prácticos', NULL, 3),

-- Paso 3
(3, 'video', 'Pilas y Colas', '18 min', 1),
(3, 'code', 'Implementaciones', NULL, 2),

-- Paso 4
(4, 'video', 'Árboles Binarios', '25 min', 1),
(4, 'code', 'Implementación de BST', NULL, 2),

-- Paso 5
(5, 'video', 'Grafos', '28 min', 1),
(5, 'code', 'Algoritmos de Grafos', NULL, 2);

-- ============================================================================
-- RECURSOS (BIBLIOTECA CENTRAL)
-- ============================================================================

INSERT INTO recursos (titulo, curso_codigo, semestre, tipo, ciclo, facultad_id, anio, descargas, calificacion, tiene_preview, tiene_solucionario) VALUES
('Estructuras de Datos', 'CS201', '2024-II', 'Examen', 2, 1, 2024, 2450, 4.8, true, true),
('Algoritmos Avanzados', 'CS301', '2024-II', 'Práctica', 3, 1, 2024, 1890, 4.6, true, true),
('Cálculo II - Parcial 1', 'MAT201', '2024-I', 'Examen', 2, 1, 2024, 3200, 4.7, true, true),
('Introducción a Bases de Datos', 'DB301', '2024-II', 'Libro', 3, 1, 2023, 1450, 4.5, true, false),
('Apunte de Física I', 'FIS101', '2024-I', 'Apunte', 1, 1, 2023, 980, 4.3, true, false),
('Seguridad Informática - Final', 'SEC401', '2024-I', 'Examen', 4, 1, 2023, 756, 4.4, true, true),
('Física II - Guía de Problemas', 'FIS201', '2024-II', 'Práctica', 2, 1, 2024, 1123, 4.5, true, false),
('Álgebra Lineal - Apuntes Completos', 'ALG101', '2024-II', 'Apunte', 2, 1, 2024, 1567, 4.7, true, false);

-- ============================================================================
-- BANCO DE EXÁMENES - CS201
-- ============================================================================

INSERT INTO banco_examenes (curso_id, titulo, tipo, anio, dificultad, num_preguntas, duracion_minutos, descargas, tiene_respuestas) VALUES
(6, 'Examen Parcial - Ciclo II 2024', 'midterm', 2024, 'hard', 45, 120, 342, true),
(6, 'Examen Parcial - Ciclo II 2023', 'midterm', 2023, 'medium', 40, 120, 521, true),
(6, 'Examen Final - Ciclo II 2024', 'final', 2024, 'hard', 60, 180, 289, true),
(6, 'Examen Final - Ciclo II 2023', 'final', 2023, 'medium', 58, 180, 412, true),
(6, 'Quiz 1 - Introducción a ED', 'quiz', 2024, 'easy', 15, 30, 156, true),
(6, 'Problemas de Práctica - Semana 3', 'practice', 2024, 'medium', 20, 90, 234, false);

-- ============================================================================
-- LOGROS
-- ============================================================================

INSERT INTO logros (nombre, descripcion, icono, criterio_tipo, criterio_valor, puntos) VALUES
('Primer Paso', 'Completar el primer curso', '🎓', 'cursos_completados', 1, 10),
('Ritmo Acelerado', 'Aprobar 3 cursos en un ciclo', '⚡', 'cursos_por_ciclo', 3, 25),
('Dedicación Premium', 'Completar 90 horas de estudio', '🏆', 'horas_estudio', 90, 50),
('Perfeccionista', 'Obtener nota perfecta en 2 exámenes', '⭐', 'notas_perfectas', 2, 30),
('Experto en Datos', 'Completar todos los cursos de Data Science', '📊', 'cursos_especializacion', 5, 100);

-- ============================================================================
-- DATOS DE EJEMPLO PARA USUARIOS (Comentado - requiere Supabase Auth)
-- ============================================================================

/*
-- Primero debes crear un usuario en Supabase Auth, luego usar su UUID aquí
-- Ejemplo de cómo insertar datos de usuario:

INSERT INTO usuarios (id, email, nombre_completo, rol) VALUES
('uuid-from-supabase-auth', 'estudiante@univia.edu', 'Juan Pérez', 'estudiante');

INSERT INTO estudiantes (id, carrera_id, ciclo_actual, codigo_estudiante, fecha_ingreso, onboarding_completado) VALUES
('uuid-from-supabase-auth', 1, 2, '2024001', '2024-01-15', true);

-- Matrículas del estudiante (Ciclo I completado, Ciclo II en progreso)
INSERT INTO matriculas (estudiante_id, seccion_curso_id, estado, nota_final, progreso_porcentaje) VALUES
('uuid-from-supabase-auth', 1, 'in_progress', NULL, 45),
('uuid-from-supabase-auth', 2, 'in_progress', NULL, 65);

-- Estadísticas del estudiante
INSERT INTO estadisticas_estudiante (estudiante_id, cursos_activos, progreso_semestre, habilidades_dominadas) VALUES
('uuid-from-supabase-auth', 5, 68, 12);

-- Logros desbloqueados
INSERT INTO logros_estudiantes (estudiante_id, logro_id, fecha_desbloqueo) VALUES
('uuid-from-supabase-auth', 1, '2024-01-15'),
('uuid-from-supabase-auth', 2, '2024-03-20');

-- AI Insights
INSERT INTO ai_insights (matricula_id, tipo, titulo, descripcion, impacto, accion_sugerida, prioridad) VALUES
(1, 'strength', 'Dominio de Conceptos Básicos', 'Tu desempeño en arrays y operaciones fundamentales es excelente (92% de precisión)', '+15% en pruebas', 'Ver análisis detallado', 1);
*/

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ejecuta estas consultas para verificar que todo se insertó correctamente:
-- SELECT COUNT(*) FROM cursos;        -- Debería ser 20
-- SELECT COUNT(*) FROM carreras;      -- Debería ser 4
-- SELECT COUNT(*) FROM recursos;      -- Debería ser 8
-- SELECT COUNT(*) FROM logros;        -- Debería ser 5
-- SELECT COUNT(*) FROM profesores;    -- Debería ser 3
