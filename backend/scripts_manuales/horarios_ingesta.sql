-- =====================================================================
-- Módulo Horarios (Institucionales) e Ingesta Excel
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =====================================================================

-- 1. Secciones disponibles
CREATE TABLE IF NOT EXISTS malla_secciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curso_codigo VARCHAR(50) NOT NULL,
    seccion VARCHAR(20) NOT NULL, -- Ej: "U", "V", "X"
    codigo_completo VARCHAR(50) NOT NULL, -- Ej: "BEF01-U"
    docente VARCHAR(150),
    vacantes INT,
    periodo VARCHAR(20) NOT NULL, -- Ej: "2026-1"
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
    aula VARCHAR(50),
    dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1=Lunes, 7=Domingo
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL
);

ALTER TABLE malla_bloques_horario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de bloques" ON malla_bloques_horario FOR SELECT USING (true);
CREATE POLICY "Solo admin modifica bloques" ON malla_bloques_horario FOR ALL USING (auth.role() = 'service_role');

-- 3. Inscripción/Horario asignado al estudiante
CREATE TABLE IF NOT EXISTS horario_estudiante (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
    seccion_id UUID REFERENCES malla_secciones(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(perfil_id, seccion_id)
);

ALTER TABLE horario_estudiante ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura propia horario" ON horario_estudiante FOR SELECT USING (perfil_id = auth.uid());
CREATE POLICY "Insertar propio horario" ON horario_estudiante FOR INSERT WITH CHECK (perfil_id = auth.uid());
CREATE POLICY "Borrar propio horario" ON horario_estudiante FOR DELETE USING (perfil_id = auth.uid());
