-- =============================================================================
-- Migración — Fase 8: conversaciones del chatbot
-- =============================================================================
-- Contexto:
--   El chatbot flotante (docs/PLAN_CHATBOT.md) necesita recordar el hilo de la
--   conversación entre recargas de página y, sobre todo, para poder mandarle a
--   Groq los últimos turnos como contexto: sin historial cada mensaje llegaría
--   suelto y el bot no podría resolver un "¿y el de Cálculo 2?" que depende de
--   lo dicho antes.
--
-- Decisión de diseño:
--   Dos tablas (conversación + mensajes) en vez de una sola con un JSONB de
--   turnos. El historial se lee por páginas y se le anexa un mensaje a la vez;
--   con JSONB cada mensaje nuevo reescribiría el documento entero y el filtro
--   "últimos N turnos" tendría que hacerse en Python. Es el mismo criterio de
--   eventos_actividad: filas para lo que se cuenta y se recorta, JSONB solo
--   para lo que varía por tipo.
--
--   `intent` se guarda en el mensaje del asistente porque el clasificador
--   (Paso 3 del plan) es la pieza más incierta del diseño: tener registrado con
--   qué intención respondió cada turno es lo que permite medir después dónde se
--   equivoca, sin instrumentación aparte.
--
--   `metadata` sostiene los adjuntos de la respuesta —hoy, las tarjetas de
--   recurso descargable del intent `recurso`— para poder repintarlas al
--   recuperar el historial. Si se guardara solo el texto, un hilo recargado
--   perdería los botones de descarga.
--
-- Retención:
--   30 días, aplicados por limpiar_conversaciones_chat() (sección 5). El
--   historial es una conveniencia de UX, no un registro académico: nada del
--   sistema depende de un chat viejo, y conservarlo indefinidamente solo
--   acumula dato personal (RNF-09) sin propósito. La función se deja lista pero
--   NO se agenda aquí; ver la nota de esa sección.
--
-- Idempotente: puede ejecutarse varias veces sin efecto adicional.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Conversaciones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_conversaciones (
    id BIGSERIAL PRIMARY KEY,
    perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    -- Resumen corto para listar hilos ("Sílabo de Cálculo 2"). Lo deriva el
    -- backend del primer mensaje; nullable porque la conversación se crea antes
    -- de que exista ese mensaje.
    titulo TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Se toca en cada mensaje nuevo. Ordena la lista de hilos y es la columna
    -- sobre la que corta la retención: un hilo activo no debe expirar por
    -- haberse creado hace mucho.
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 2. Mensajes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_mensajes (
    id BIGSERIAL PRIMARY KEY,
    conversacion_id BIGINT NOT NULL
        REFERENCES chat_conversaciones(id) ON DELETE CASCADE,
    -- Desnormalizado desde la conversación: las políticas RLS de esta tabla lo
    -- comparan contra auth.uid() en cada fila, y sin esta columna cada chequeo
    -- obligaría a un subquery contra chat_conversaciones.
    perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    -- 'user' | 'assistant'. Mismos nombres que usa la API de Groq, para que el
    -- historial se le pueda pasar tal cual sin traducir roles.
    rol VARCHAR(16) NOT NULL CHECK (rol IN ('user', 'assistant')),
    contenido TEXT NOT NULL,
    -- Intent con el que se resolvió la respuesta (ver Decisión de diseño).
    -- Solo lo llevan los mensajes del asistente; el del usuario lo deja NULL.
    intent VARCHAR(32),
    -- Adjuntos de la respuesta: tarjetas de recurso, cursos citados, etc.
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 3. Índices
-- -----------------------------------------------------------------------------
-- Lista de hilos del usuario, más reciente primero.
CREATE INDEX IF NOT EXISTS idx_chat_conversaciones_perfil_fecha
    ON chat_conversaciones (perfil_id, updated_at DESC);

-- Barrido de la retención (sección 5), que recorre por fecha sin filtrar perfil.
CREATE INDEX IF NOT EXISTS idx_chat_conversaciones_updated_at
    ON chat_conversaciones (updated_at);

-- Reconstruir un hilo: todos sus mensajes en orden cronológico. Es la consulta
-- que corre en cada apertura del chat.
CREATE INDEX IF NOT EXISTS idx_chat_mensajes_conversacion_fecha
    ON chat_mensajes (conversacion_id, created_at);

-- Análisis de aciertos del clasificador. Parcial: los mensajes del usuario no
-- llevan intent y son la mitad de la tabla.
CREATE INDEX IF NOT EXISTS idx_chat_mensajes_intent
    ON chat_mensajes (intent)
    WHERE intent IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 4. Seguridad a nivel de fila (RNF-09 — privacidad académica)
-- -----------------------------------------------------------------------------
-- Una conversación puede contener notas, cursos desaprobados y dudas que el
-- estudiante no le contaría a nadie más. Sin RLS, cualquier usuario autenticado
-- las leería con el cliente anónimo.
ALTER TABLE chat_conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensajes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- --- chat_conversaciones ---
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'chat_conversaciones'
          AND policyname = 'chat_conversaciones_select_propio'
    ) THEN
        CREATE POLICY chat_conversaciones_select_propio ON chat_conversaciones
            FOR SELECT USING (auth.uid() = perfil_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'chat_conversaciones'
          AND policyname = 'chat_conversaciones_insert_propio'
    ) THEN
        CREATE POLICY chat_conversaciones_insert_propio ON chat_conversaciones
            FOR INSERT WITH CHECK (auth.uid() = perfil_id);
    END IF;

    -- A diferencia de eventos_actividad, aquí sí hay UPDATE: el backend escribe
    -- `titulo` y mueve `updated_at` con cada turno.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'chat_conversaciones'
          AND policyname = 'chat_conversaciones_update_propio'
    ) THEN
        CREATE POLICY chat_conversaciones_update_propio ON chat_conversaciones
            FOR UPDATE USING (auth.uid() = perfil_id)
            WITH CHECK (auth.uid() = perfil_id);
    END IF;

    -- Y también DELETE: "borrar esta conversación" es una expectativa básica de
    -- cualquier chat, y es dato del propio usuario.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'chat_conversaciones'
          AND policyname = 'chat_conversaciones_delete_propio'
    ) THEN
        CREATE POLICY chat_conversaciones_delete_propio ON chat_conversaciones
            FOR DELETE USING (auth.uid() = perfil_id);
    END IF;

    -- --- chat_mensajes ---
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'chat_mensajes'
          AND policyname = 'chat_mensajes_select_propio'
    ) THEN
        CREATE POLICY chat_mensajes_select_propio ON chat_mensajes
            FOR SELECT USING (auth.uid() = perfil_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'chat_mensajes'
          AND policyname = 'chat_mensajes_insert_propio'
    ) THEN
        CREATE POLICY chat_mensajes_insert_propio ON chat_mensajes
            FOR INSERT WITH CHECK (auth.uid() = perfil_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'chat_mensajes'
          AND policyname = 'chat_mensajes_delete_propio'
    ) THEN
        CREATE POLICY chat_mensajes_delete_propio ON chat_mensajes
            FOR DELETE USING (auth.uid() = perfil_id);
    END IF;
END $$;

-- No se crea política de UPDATE sobre chat_mensajes: un turno ya dicho no se
-- reescribe. Editar lo que el bot respondió invalidaría el registro de `intent`
-- que sirve para evaluarlo.


-- -----------------------------------------------------------------------------
-- 5. Retención (30 días)
-- -----------------------------------------------------------------------------
-- Borra los hilos sin actividad reciente. Los mensajes se van solos por el
-- ON DELETE CASCADE de chat_mensajes.
--
-- SECURITY DEFINER a propósito: corre como tarea de mantenimiento, sin un
-- auth.uid() de por medio, así que tiene que poder saltarse las políticas RLS
-- de arriba (que solo dejan borrar lo propio). El search_path va fijado para
-- que un esquema malicioso en el path no pueda secuestrar la llamada.
CREATE OR REPLACE FUNCTION limpiar_conversaciones_chat(dias INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    borradas INTEGER;
BEGIN
    DELETE FROM chat_conversaciones
    WHERE updated_at < NOW() - (dias || ' days')::INTERVAL;

    GET DIAGNOSTICS borradas = ROW_COUNT;
    RETURN borradas;
END $$;

-- No se agenda desde esta migración: pg_cron es una extensión que hay que
-- habilitar aparte en el proyecto de Supabase, y un CREATE EXTENSION que falla
-- abortaría toda la migración. Para activarlo, una vez habilitada la extensión:
--
--   SELECT cron.schedule('limpiar-chat', '0 4 * * *',
--                        'SELECT limpiar_conversaciones_chat(30)');
--
-- Mientras tanto puede correrse a mano: SELECT limpiar_conversaciones_chat();


-- -----------------------------------------------------------------------------
-- 6. Verificación posterior
-- -----------------------------------------------------------------------------
-- Ejecutar para confirmar que la migración quedó aplicada:
--
-- SELECT table_name, column_name, data_type FROM information_schema.columns
-- WHERE table_name IN ('chat_conversaciones', 'chat_mensajes')
-- ORDER BY table_name, ordinal_position;
--
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE tablename IN ('chat_conversaciones', 'chat_mensajes')
-- ORDER BY tablename, policyname;
--
-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('chat_conversaciones', 'chat_mensajes');
--
-- SELECT proname FROM pg_proc WHERE proname = 'limpiar_conversaciones_chat';
