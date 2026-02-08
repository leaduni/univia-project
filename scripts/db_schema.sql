-- SCHEMA UNI_VIA
-- Proyecto: UniviaProject
-- Versión: 2.0 (Basada en Frontend Mock)

-- 1. Tablas Maestras
CREATE TABLE IF NOT EXISTS facultades (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carreras (
    id SERIAL PRIMARY KEY,
    facultad_id INTEGER REFERENCES facultades(id) ON DELETE CASCADE,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duracion_ciclos INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Estructura Académica (Malla)
CREATE TABLE IF NOT EXISTS cursos (
    id SERIAL PRIMARY KEY,
    carrera_id INTEGER REFERENCES carreras(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    credits INTEGER NOT NULL,
    description TEXT,
    ciclo INTEGER NOT NULL, -- Ciclo al que pertenece el curso (1-10)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Usuarios y Perfiles (Extensión de Auth.Users)
CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255),
    carrera_id INTEGER REFERENCES carreras(id),
    ciclo_actual INTEGER DEFAULT 1,
    onboarding_completado BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Progreso Académico
CREATE TABLE IF NOT EXISTS progreso_cursos (
    id SERIAL PRIMARY KEY,
    perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
    curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'available', -- 'available', 'in_progress', 'completed', 'locked'
    nota DECIMAL(4,2),
    fecha_completado TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(perfil_id, curso_id)
);

-- 5. Banco de Exámenes y Recursos
CREATE TABLE IF NOT EXISTS recursos (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER REFERENCES cursos(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'Examen', 'Práctica', 'Libro', 'Apunte', 'Video'
    ciclo INTEGER,
    year INTEGER,
    downloads INTEGER DEFAULT 0,
    rating DECIMAL(3,1) DEFAULT 0.0,
    preview_url TEXT,
    has_solucionario BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Logros y Gamificación
CREATE TABLE IF NOT EXISTS logros (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    icon VARCHAR(10), -- Emoji o ID de icono
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logros_usuarios (
    id SERIAL PRIMARY KEY,
    perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
    logro_id INTEGER REFERENCES logros(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(perfil_id, logro_id)
);

-- 7. Pasos de Ruta de Aprendizaje (Timeline)
CREATE TABLE IF NOT EXISTS learning_path_steps (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration VARCHAR(50),
    order_index INTEGER NOT NULL,
    topics TEXT[], -- Array de strings para temas
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers para perfiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre_completo)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'nombre_completo');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
