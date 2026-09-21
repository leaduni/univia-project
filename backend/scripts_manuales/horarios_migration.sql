-- =====================================================================
-- Módulo Horarios (Institucionales) — Tablas de Supabase
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =====================================================================

-- 1. Secciones disponibles de un curso por periodo académico
CREATE TABLE IF NOT EXISTS malla_secciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curso_id BIGINT REFERENCES cursos(id) ON DELETE CASCADE,
    periodo VARCHAR(10) NOT NULL, -- Ej: "2026-1"
    codigo_seccion VARCHAR(20) NOT NULL, -- Ej: "U", "V", "X"
    codigo_completo VARCHAR(30) NOT NULL, -- Ej: "BMA02-U"
    creditos INT,
    UNIQUE(periodo, codigo_completo)
);

ALTER TABLE malla_secciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de secciones" ON malla_secciones FOR SELECT USING (true);
CREATE POLICY "Solo admin modifica secciones" ON malla_secciones FOR ALL USING (auth.role() = 'service_role');

-- 2. Bloques de tiempo (Teoría, Práctica, Laboratorio)
CREATE TABLE IF NOT EXISTS malla_bloques_horario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seccion_id UUID REFERENCES malla_secciones(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL, -- 'TEORIA', 'PRACTICA', 'LABORATORIO'
    docente VARCHAR(150),
    dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1=Lunes, 6=Sábado
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    aula VARCHAR(50) -- Ej: "S4-211", "LAB-D"
);

ALTER TABLE malla_bloques_horario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de bloques" ON malla_bloques_horario FOR SELECT USING (true);
CREATE POLICY "Solo admin modifica bloques" ON malla_bloques_horario FOR ALL USING (auth.role() = 'service_role');

-- 3. Inscripción/Horario asignado al estudiante
CREATE TABLE IF NOT EXISTS horario_estudiante (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    perfil_id TEXT REFERENCES perfiles(id) ON DELETE CASCADE,
    seccion_id UUID REFERENCES malla_secciones(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(perfil_id, seccion_id)
);

ALTER TABLE horario_estudiante ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura propia horario" ON horario_estudiante FOR SELECT USING (perfil_id = auth.uid()::TEXT);
CREATE POLICY "Insertar propio horario" ON horario_estudiante FOR INSERT WITH CHECK (perfil_id = auth.uid()::TEXT);
CREATE POLICY "Borrar propio horario" ON horario_estudiante FOR DELETE USING (perfil_id = auth.uid()::TEXT);

-- 4. Eventos y Evaluaciones del curso (Extraídas del sílabo vía RAG)
CREATE TABLE IF NOT EXISTS evaluaciones_bloque (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seccion_id UUID REFERENCES malla_secciones(id) ON DELETE CASCADE,
    tipo_evaluacion VARCHAR(50), -- 'PC1', 'Examen Parcial', 'Examen Final'
    fecha DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME,
    descripcion TEXT
);

ALTER TABLE evaluaciones_bloque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de evaluaciones" ON evaluaciones_bloque FOR SELECT USING (true);
CREATE POLICY "Solo admin modifica evaluaciones" ON evaluaciones_bloque FOR ALL USING (auth.role() = 'service_role');

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_malla_secciones_curso ON malla_secciones(curso_id);
CREATE INDEX IF NOT EXISTS idx_malla_bloques_seccion ON malla_bloques_horario(seccion_id);
CREATE INDEX IF NOT EXISTS idx_horario_estudiante_perfil ON horario_estudiante(perfil_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_bloque_seccion ON evaluaciones_bloque(seccion_id);
