-- ============================================================================
-- UniVia - Seed Data Completo
-- ============================================================================

-- Limpiar datos existentes (opcional, cuidado con las FK)
-- TRUNCATE usuarios, estudiantes, matriculas, cursos, ciclos, carreras, facultades CASCADE;

-- 1. FACULTADES
INSERT INTO facultades (codigo, nombre, descripcion) VALUES
('Fisi', 'Facultad de Ingeniería de Sistemas e Informática', 'Facultad líder en tecnología');

-- 2. CARRERAS
INSERT INTO carreras (codigo, nombre, facultad_id, descripcion, duracion_ciclos) VALUES
('Sistemas', 'Ingeniería de Sistemas', 1, 'Formación integral en sistemas', 10);

-- 3. CICLOS
INSERT INTO ciclos (carrera_id, numero, nombre, creditos_totales) VALUES
(1, 1, 'Ciclo I', 22),
(1, 2, 'Ciclo II', 20);

-- 4. CURSOS
INSERT INTO cursos (codigo, nombre, creditos, descripcion, ciclo_id, orden_en_ciclo) VALUES
('SI101', 'Introducción a Sistemas', 4, 'Conceptos básicos', 1, 1),
('MA101', 'Cálculo I', 5, 'Matemática básica', 1, 2),
('SI201', 'Programación I', 4, 'Fundamentos de programación', 2, 1);

-- 5. USUARIO DE PRUEBA (UUID manual para facilitar)
-- Importante: El ID debe ser un UUID válido.
INSERT INTO usuarios (id, email, nombre_completo, rol, password) VALUES
('d290f1ee-6c54-4b01-90e6-d701748f0851', 'estudiante@univia.edu', 'Diego Marín', 'estudiante', 'password123');

-- 6. PERFIL DE ESTUDIANTE
INSERT INTO estudiantes (id, carrera_id, ciclo_actual, codigo_estudiante, onboarding_completado) VALUES
('d290f1ee-6c54-4b01-90e6-d701748f0851', 1, 2, '2024001', true);

-- 7. ESTADÍSTICAS
INSERT INTO estadisticas_estudiante (estudiante_id, cursos_activos, progreso_semestre, habilidades_dominadas) VALUES
('d290f1ee-6c54-4b01-90e6-d701748f0851', 5, 45, 8);
