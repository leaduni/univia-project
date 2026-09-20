-- =====================================================================
-- Módulo Horarios — Tablas para Ingesta Masiva de Excel
-- =====================================================================

-- 1. Secciones de curso
CREATE TABLE IF NOT EXISTS malla_secciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curso_codigo VARCHAR(20) NOT NULL,
    seccion VARCHAR(10) NOT NULL,
    codigo_completo VARCHAR(30) NOT NULL UNIQUE, -- Ej: BEF01-U
    docente VARCHAR(150),
    vacantes INT DEFAULT 40,
    periodo VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE malla_secciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de secciones" ON malla_secciones FOR SELECT USING (true);
CREATE POLICY "Solo admin modifica secciones" ON malla_secciones FOR ALL USING (auth.role() = 'service_role');

-- 2. Bloques horarios
CREATE TABLE IF NOT EXISTS malla_bloques_horario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seccion_id UUID REFERENCES malla_secciones(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL, -- TEORIA, PRACTICA, LABORATORIO
    aula VARCHAR(50),
    dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL
);

ALTER TABLE malla_bloques_horario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de bloques" ON malla_bloques_horario FOR SELECT USING (true);
CREATE POLICY "Solo admin modifica bloques" ON malla_bloques_horario FOR ALL USING (auth.role() = 'service_role');

-- 3. Inscripción del alumno
CREATE TABLE IF NOT EXISTS horario_estudiante (
    perfil_id TEXT REFERENCES perfiles(id) ON DELETE CASCADE,
    seccion_id UUID REFERENCES malla_secciones(id) ON DELETE CASCADE,
    PRIMARY KEY (perfil_id, seccion_id)
);

ALTER TABLE horario_estudiante ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura propia horario" ON horario_estudiante FOR SELECT USING (perfil_id = auth.uid()::TEXT);
CREATE POLICY "Insertar propio horario" ON horario_estudiante FOR INSERT WITH CHECK (perfil_id = auth.uid()::TEXT);
CREATE POLICY "Borrar propio horario" ON horario_estudiante FOR DELETE USING (perfil_id = auth.uid()::TEXT);

-- Índices
CREATE INDEX IF NOT EXISTS idx_malla_secciones_codigo ON malla_secciones(codigo_completo);
CREATE INDEX IF NOT EXISTS idx_malla_bloques_seccion ON malla_bloques_horario(seccion_id);
CREATE INDEX IF NOT EXISTS idx_horario_estudiante_perfil ON horario_estudiante(perfil_id);
