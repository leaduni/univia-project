-- =====================================================================
-- Módulo Agenda — Tablas de Supabase
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =====================================================================

-- 1. Etiquetas de agenda
CREATE TABLE IF NOT EXISTS agenda_etiquetas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  perfil_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('indigo','rose','emerald','fuchsia','amber','sky','orange')),
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agenda_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven solo sus etiquetas"
  ON agenda_etiquetas FOR SELECT
  USING (perfil_id = auth.uid()::TEXT);

CREATE POLICY "Usuarios crean sus etiquetas"
  ON agenda_etiquetas FOR INSERT
  WITH CHECK (perfil_id = auth.uid()::TEXT);

CREATE POLICY "Usuarios editan sus etiquetas"
  ON agenda_etiquetas FOR UPDATE
  USING (perfil_id = auth.uid()::TEXT);

CREATE POLICY "Usuarios eliminan sus etiquetas"
  ON agenda_etiquetas FOR DELETE
  USING (perfil_id = auth.uid()::TEXT AND is_system = FALSE);


-- 2. Eventos de agenda
CREATE TABLE IF NOT EXISTS agenda_eventos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  perfil_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  tipo TEXT DEFAULT 'evento' CHECK (tipo IN ('evento','tarea','examen','bloque_estudio')),
  etiqueta_id BIGINT REFERENCES agenda_etiquetas(id) ON DELETE SET NULL,
  fecha_iso DATE NOT NULL,
  fecha_fin_iso DATE,
  hora_inicio NUMERIC(5,2) NOT NULL,
  duracion NUMERIC(5,2) NOT NULL,
  todo_el_dia BOOLEAN DEFAULT FALSE,
  recurrencia TEXT DEFAULT 'none',
  ubicacion TEXT,
  videollamada TEXT,
  notificacion TEXT,
  descripcion TEXT,
  invitados TEXT[],
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agenda_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven solo sus eventos"
  ON agenda_eventos FOR SELECT
  USING (perfil_id = auth.uid()::TEXT);

CREATE POLICY "Usuarios crean sus eventos"
  ON agenda_eventos FOR INSERT
  WITH CHECK (perfil_id = auth.uid()::TEXT);

CREATE POLICY "Usuarios editan sus eventos"
  ON agenda_eventos FOR UPDATE
  USING (perfil_id = auth.uid()::TEXT);

CREATE POLICY "Usuarios eliminan sus eventos"
  ON agenda_eventos FOR DELETE
  USING (perfil_id = auth.uid()::TEXT);


-- 3. Configuración de agenda
CREATE TABLE IF NOT EXISTS agenda_configuracion (
  perfil_id TEXT PRIMARY KEY,
  sleep_start TEXT DEFAULT '23:00',
  sleep_end TEXT DEFAULT '07:00',
  semester_start DATE,
  semester_end DATE,
  meta_horas_semanal NUMERIC(4,1) DEFAULT 20.0,
  pomodoro_focus_min INT DEFAULT 50,
  pomodoro_break_min INT DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agenda_configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven su config"
  ON agenda_configuracion FOR SELECT
  USING (perfil_id = auth.uid()::TEXT);

CREATE POLICY "Usuarios crean su config"
  ON agenda_configuracion FOR INSERT
  WITH CHECK (perfil_id = auth.uid()::TEXT);

CREATE POLICY "Usuarios editan su config"
  ON agenda_configuracion FOR UPDATE
  USING (perfil_id = auth.uid()::TEXT);


-- 4. Sesiones de estudio (Pomodoro)
CREATE TABLE IF NOT EXISTS sesiones_estudio (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  perfil_id TEXT NOT NULL,
  evento_id BIGINT REFERENCES agenda_eventos(id) ON DELETE SET NULL,
  minutos_configurados INT NOT NULL,
  minutos_reales INT NOT NULL,
  finalizado_temprano BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sesiones_estudio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus sesiones"
  ON sesiones_estudio FOR SELECT
  USING (perfil_id = auth.uid()::TEXT);

CREATE POLICY "Usuarios crean sus sesiones"
  ON sesiones_estudio FOR INSERT
  WITH CHECK (perfil_id = auth.uid()::TEXT);


-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_perfil_fecha
  ON agenda_eventos (perfil_id, fecha_iso);

CREATE INDEX IF NOT EXISTS idx_agenda_etiquetas_perfil
  ON agenda_etiquetas (perfil_id);

CREATE INDEX IF NOT EXISTS idx_sesiones_estudio_perfil_started
  ON sesiones_estudio (perfil_id, started_at);
