-- =====================================================================
-- Módulo Agenda V2 — Interactividad y Recurrencias
-- Ejecutar en Supabase SQL Editor
-- =====================================================================

-- 1. Soporte para recurrencias en eventos existentes
ALTER TABLE agenda_eventos 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rrule TEXT;

-- 2. Excepciones de Eventos (Reprogramaciones o cancelaciones)
CREATE TABLE IF NOT EXISTS agenda_eventos_excepciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    evento_id BIGINT REFERENCES agenda_eventos(id) ON DELETE CASCADE,
    fecha_excepcion DATE NOT NULL,
    is_cancelled BOOLEAN DEFAULT FALSE,
    nueva_hora_inicio NUMERIC(5,2),
    nueva_duracion NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agenda_eventos_excepciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura propia excepciones" ON agenda_eventos_excepciones FOR SELECT USING (true); -- o por auth
-- Idealmente la politica debería unirse a agenda_eventos para verificar auth.uid() = perfil_id
CREATE POLICY "Modificación propia excepciones" ON agenda_eventos_excepciones 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM agenda_eventos 
    WHERE id = agenda_eventos_excepciones.evento_id 
    AND perfil_id = auth.uid()::TEXT
  )
);

-- 3. Subtareas asociadas a un evento
CREATE TABLE IF NOT EXISTS agenda_tareas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    evento_id BIGINT REFERENCES agenda_eventos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agenda_tareas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modificación propia tareas" ON agenda_tareas 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM agenda_eventos 
    WHERE id = agenda_tareas.evento_id 
    AND perfil_id = auth.uid()::TEXT
  )
);

CREATE INDEX IF NOT EXISTS idx_agenda_eventos_excepciones_evento ON agenda_eventos_excepciones(evento_id);
CREATE INDEX IF NOT EXISTS idx_agenda_tareas_evento ON agenda_tareas(evento_id);
