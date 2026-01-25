-- ============================================================================
-- UniVia - Supabase Database Schema (VERSIÓN SIMPLE - IDs NUMÉRICOS)
-- ============================================================================
-- Esta versión usa SERIAL (auto-increment) en lugar de UUID
-- Más simple y sin dependencias de extensiones
-- ============================================================================

-- ============================================================================
-- TABLAS DE CATÁLOGOS Y CONFIGURACIÓN
-- ============================================================================

-- Tabla: Facultades
CREATE TABLE facultades (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Carreras (Programas Académicos)
CREATE TABLE carreras (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    facultad_id INTEGER REFERENCES facultades(id) ON DELETE CASCADE,
    descripcion TEXT,
    duracion_ciclos INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Ciclos (Semestres)
CREATE TABLE ciclos (
    id SERIAL PRIMARY KEY,
    carrera_id INTEGER REFERENCES carreras(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL, -- 1, 2, 3, etc.
    nombre VARCHAR(50) NOT NULL, -- "Ciclo I", "Ciclo II", etc.
    creditos_totales INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(carrera_id, numero)
);

-- ============================================================================
-- TABLAS DE CURSOS Y CONTENIDO ACADÉMICO
-- ============================================================================

-- Tabla: Cursos
CREATE TABLE cursos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    creditos INTEGER NOT NULL DEFAULT 3,
    descripcion TEXT,
    ciclo_id INTEGER REFERENCES ciclos(id) ON DELETE CASCADE,
    orden_en_ciclo INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Prerequisitos de Cursos
CREATE TABLE prerequisitos (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    prerequisito_curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(curso_id, prerequisito_curso_id)
);

-- Tabla: Profesores
CREATE TABLE profesores (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    titulo VARCHAR(50), -- "Dr.", "Mg.", "Ing.", etc.
    email VARCHAR(255) UNIQUE,
    especialidad TEXT,
    biografia TEXT,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Secciones de Curso (Instancias específicas de un curso)
CREATE TABLE secciones_curso (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    profesor_id INTEGER REFERENCES profesores(id) ON DELETE SET NULL,
    codigo_seccion VARCHAR(10), -- "A", "B", "C", etc.
    semestre VARCHAR(20) NOT NULL, -- "2024-I", "2024-II", etc.
    fecha_inicio DATE,
    fecha_fin DATE,
    cupo_maximo INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLAS DE USUARIOS Y ESTUDIANTES
-- ============================================================================

-- Tabla: Usuarios (vinculada con Supabase Auth)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY, -- Este viene de Supabase Auth, no lo generamos nosotros
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255),
    foto_url TEXT,
    rol VARCHAR(50) DEFAULT 'estudiante', -- 'estudiante', 'profesor', 'admin'
    password VARCHAR(255), -- Contraseña (para esta versión simple)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Estudiantes (Perfil extendido)
CREATE TABLE estudiantes (
    id UUID PRIMARY KEY, -- Mismo ID que usuarios
    carrera_id INTEGER REFERENCES carreras(id) ON DELETE SET NULL,
    ciclo_actual INTEGER DEFAULT 1,
    codigo_estudiante VARCHAR(20) UNIQUE,
    fecha_ingreso DATE,
    onboarding_completado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLAS DE PROGRESO Y MATRÍCULA
-- ============================================================================

-- Tabla: Matrículas (Estudiantes inscritos en secciones)
CREATE TABLE matriculas (
    id SERIAL PRIMARY KEY,
    estudiante_id UUID REFERENCES estudiantes(id) ON DELETE CASCADE,
    seccion_curso_id INTEGER REFERENCES secciones_curso(id) ON DELETE CASCADE,
    estado VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed', 'withdrawn'
    nota_final DECIMAL(4,2),
    progreso_porcentaje INTEGER DEFAULT 0,
    fecha_matricula TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_completado TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(estudiante_id, seccion_curso_id)
);

-- Tabla: Timeline de Aprendizaje (Pasos del curso)
CREATE TABLE timeline_pasos (
    id SERIAL PRIMARY KEY,
    seccion_curso_id INTEGER REFERENCES secciones_curso(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    duracion VARCHAR(50), -- "1 semana", "2 semanas", etc.
    orden INTEGER NOT NULL,
    icono VARCHAR(50), -- Nombre del icono de Lucide
    topicos TEXT[], -- Array de tópicos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Progreso de Timeline (Estado de cada paso por estudiante)
CREATE TABLE progreso_timeline (
    id SERIAL PRIMARY KEY,
    matricula_id INTEGER REFERENCES matriculas(id) ON DELETE CASCADE,
    timeline_paso_id INTEGER REFERENCES timeline_pasos(id) ON DELETE CASCADE,
    estado VARCHAR(50) DEFAULT 'locked', -- 'locked', 'upcoming', 'current', 'completed'
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    fecha_completado TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(matricula_id, timeline_paso_id)
);

-- ============================================================================
-- TABLAS DE RECURSOS Y MATERIALES
-- ============================================================================

-- Tabla: Recursos (Biblioteca Central)
CREATE TABLE recursos (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    curso_codigo VARCHAR(10) REFERENCES cursos(codigo) ON DELETE SET NULL,
    semestre VARCHAR(20), -- "2024-I", "2024-II", etc.
    tipo VARCHAR(50) NOT NULL, -- 'Examen', 'Práctica', 'Libro', 'Apunte'
    ciclo INTEGER,
    facultad_id INTEGER REFERENCES facultades(id) ON DELETE SET NULL,
    anio INTEGER,
    descargas INTEGER DEFAULT 0,
    calificacion DECIMAL(2,1) DEFAULT 0.0,
    tiene_preview BOOLEAN DEFAULT FALSE,
    tiene_solucionario BOOLEAN DEFAULT FALSE,
    archivo_url TEXT,
    archivo_preview_url TEXT,
    archivo_solucionario_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Recursos de Timeline (Materiales específicos de cada paso)
CREATE TABLE recursos_timeline (
    id SERIAL PRIMARY KEY,
    timeline_paso_id INTEGER REFERENCES timeline_pasos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'video', 'document', 'code', 'quiz'
    titulo VARCHAR(255) NOT NULL,
    duracion VARCHAR(50), -- "15 min", "22 min", etc. (para videos)
    url TEXT,
    orden INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Banco de Exámenes
CREATE TABLE banco_examenes (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'midterm', 'final', 'quiz', 'practice'
    anio INTEGER NOT NULL,
    dificultad VARCHAR(50), -- 'easy', 'medium', 'hard'
    num_preguntas INTEGER,
    duracion_minutos INTEGER,
    descargas INTEGER DEFAULT 0,
    tiene_respuestas BOOLEAN DEFAULT FALSE,
    archivo_url TEXT,
    archivo_respuestas_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLAS DE INSIGHTS Y ANÁLISIS IA
-- ============================================================================

-- Tabla: Insights de IA
CREATE TABLE ai_insights (
    id SERIAL PRIMARY KEY,
    matricula_id INTEGER REFERENCES matriculas(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'strength', 'weakness', 'recommendation', 'opportunity'
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    impacto VARCHAR(100), -- "+15% en pruebas", "-8% en eficiencia", etc.
    accion_sugerida VARCHAR(255),
    prioridad INTEGER DEFAULT 1,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLAS DE LOGROS Y GAMIFICACIÓN
-- ============================================================================

-- Tabla: Logros (Achievements)
CREATE TABLE logros (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    icono VARCHAR(10), -- Emoji o código de icono
    criterio_tipo VARCHAR(50), -- 'cursos_completados', 'horas_estudio', 'notas_perfectas', etc.
    criterio_valor INTEGER,
    puntos INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Logros de Estudiantes
CREATE TABLE logros_estudiantes (
    id SERIAL PRIMARY KEY,
    estudiante_id UUID REFERENCES estudiantes(id) ON DELETE CASCADE,
    logro_id INTEGER REFERENCES logros(id) ON DELETE CASCADE,
    fecha_desbloqueo TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(estudiante_id, logro_id)
);

-- ============================================================================
-- TABLAS DE ESTADÍSTICAS
-- ============================================================================

-- Tabla: Estadísticas del Dashboard
CREATE TABLE estadisticas_estudiante (
    id SERIAL PRIMARY KEY,
    estudiante_id UUID REFERENCES estudiantes(id) ON DELETE CASCADE UNIQUE,
    cursos_activos INTEGER DEFAULT 0,
    progreso_semestre INTEGER DEFAULT 0, -- Porcentaje
    habilidades_dominadas INTEGER DEFAULT 0,
    horas_estudio_total INTEGER DEFAULT 0,
    promedio_general DECIMAL(4,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================

CREATE INDEX idx_cursos_ciclo ON cursos(ciclo_id);
CREATE INDEX idx_cursos_codigo ON cursos(codigo);
CREATE INDEX idx_matriculas_estudiante ON matriculas(estudiante_id);
CREATE INDEX idx_matriculas_estado ON matriculas(estado);
CREATE INDEX idx_recursos_tipo ON recursos(tipo);
CREATE INDEX idx_recursos_curso ON recursos(curso_codigo);
CREATE INDEX idx_recursos_ciclo ON recursos(ciclo);
CREATE INDEX idx_banco_examenes_curso ON banco_examenes(curso_id);
CREATE INDEX idx_ai_insights_matricula ON ai_insights(matricula_id);
CREATE INDEX idx_secciones_semestre ON secciones_curso(semestre);

-- ============================================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_facultades_updated_at BEFORE UPDATE ON facultades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carreras_updated_at BEFORE UPDATE ON carreras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ciclos_updated_at BEFORE UPDATE ON ciclos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cursos_updated_at BEFORE UPDATE ON cursos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profesores_updated_at BEFORE UPDATE ON profesores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_secciones_curso_updated_at BEFORE UPDATE ON secciones_curso FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estudiantes_updated_at BEFORE UPDATE ON estudiantes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matriculas_updated_at BEFORE UPDATE ON matriculas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recursos_updated_at BEFORE UPDATE ON recursos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
-- ============================================================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE logros_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estadisticas_estudiante ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver su propia información"
    ON usuarios FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propia información"
    ON usuarios FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Estudiantes pueden ver su propia información"
    ON estudiantes FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Estudiantes pueden actualizar su propia información"
    ON estudiantes FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Estudiantes pueden ver sus propias matrículas"
    ON matriculas FOR SELECT
    USING (estudiante_id = auth.uid());

CREATE POLICY "Estudiantes pueden ver sus propios insights"
    ON ai_insights FOR SELECT
    USING (matricula_id IN (SELECT id FROM matriculas WHERE estudiante_id = auth.uid()));

CREATE POLICY "Estudiantes pueden ver sus propios logros"
    ON logros_estudiantes FOR SELECT
    USING (estudiante_id = auth.uid());

CREATE POLICY "Estudiantes pueden ver sus propias estadísticas"
    ON estadisticas_estudiante FOR SELECT
    USING (estudiante_id = auth.uid());

-- Tablas públicas (solo lectura)
ALTER TABLE cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE facultades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciclos ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_examenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE logros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden ver cursos" ON cursos FOR SELECT USING (true);
CREATE POLICY "Todos pueden ver recursos" ON recursos FOR SELECT USING (true);
CREATE POLICY "Todos pueden ver profesores" ON profesores FOR SELECT USING (true);
CREATE POLICY "Todos pueden ver carreras" ON carreras FOR SELECT USING (true);
CREATE POLICY "Todos pueden ver facultades" ON facultades FOR SELECT USING (true);
CREATE POLICY "Todos pueden ver ciclos" ON ciclos FOR SELECT USING (true);
CREATE POLICY "Todos pueden ver banco de exámenes" ON banco_examenes FOR SELECT USING (true);
CREATE POLICY "Todos pueden ver logros" ON logros FOR SELECT USING (true);

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE cursos IS 'Catálogo de cursos disponibles';
COMMENT ON TABLE matriculas IS 'Registro de estudiantes inscritos en secciones';
COMMENT ON TABLE recursos IS 'Biblioteca central de recursos académicos';
COMMENT ON TABLE ai_insights IS 'Insights generados por IA para estudiantes';
