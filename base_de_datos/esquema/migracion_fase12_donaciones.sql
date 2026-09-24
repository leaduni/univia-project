-- =============================================================================
-- Migración — Fase 12: módulo de donaciones (Yape con centavo identificador)
-- =============================================================================
-- Contexto:
--   UniVia se financia con aportes voluntarios de la comunidad UNI. El pago se
--   hace por QR de Yape personal, que NO expone API ni webhooks: no hay forma
--   de que el sistema detecte por sí solo que un abono entró.
--
--   Para poder emparejar cada abono con quien lo hizo, a cada donación se le
--   reserva un CENTAVO ÚNICO: el estudiante elige S/10 y el sistema le pide
--   yapear S/10.01. Cuando ese monto aparece en el historial de Yape, hay una
--   sola donación activa que lo reclama, así que la asociación es inequívoca
--   sin pedir capturas ni código de operación.
--
-- Decisiones de diseño:
--   * `perfil_id` se desnormaliza en cada fila para que las políticas RLS
--     comparen contra auth.uid() sin subquery (mismo criterio que
--     migracion_fase9_feedback.sql).
--   * La reserva del centavo solo es exclusiva mientras la donación está
--     'iniciada'. Al pasar a 'reportada' el centavo se libera y puede
--     reutilizarse: solo hay 99 combinaciones por monto entero, y bloquearlas
--     de por vida agotaría los montos populares (S/10, S/20) en pocos días.
--     La ventana de 30 minutos basta para que el emparejamiento sea único en
--     la práctica al volumen que maneja el proyecto.
--   * El ranking y los totales NO leen de la tabla directamente desde el
--     cliente: el backend los sirve agregados con la llave de servicio, para
--     no exponer perfil_id ni el nombre real de quien donó como anónimo.
--   * `donaciones_gastos` sostiene el panel de transparencia (recaudado /
--     gastado / caja neto). Se puebla a mano con la llave de servicio.
--
-- Idempotente: se puede ejecutar varias veces sin efectos adicionales.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tablas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donaciones (
    id BIGSERIAL PRIMARY KEY,
    perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,

    -- Lo que el estudiante eligió, y lo que realmente debe yapear.
    monto_base NUMERIC(10, 2) NOT NULL CHECK (monto_base >= 0.10),
    centavo SMALLINT NOT NULL CHECK (centavo BETWEEN 1 AND 99),
    monto_exacto NUMERIC(10, 2) NOT NULL CHECK (monto_exacto > 0),

    tipo_donante VARCHAR(20) NOT NULL DEFAULT 'estudiante'
        CHECK (tipo_donante IN ('estudiante', 'egresado')),
    facultad VARCHAR(20),

    -- Identidad pública. `es_anonimo` manda: si está activo, el nombre real
    -- nunca sale en el ranking ni en el muro.
    nombre_mostrar VARCHAR(60),
    es_anonimo BOOLEAN NOT NULL DEFAULT FALSE,
    mensaje_muro TEXT,

    estado VARCHAR(20) NOT NULL DEFAULT 'iniciada'
        CHECK (estado IN ('iniciada', 'reportada', 'confirmada', 'expirada')),

    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Vence la reserva del centavo si el estudiante nunca vuelve del Yape.
    expira_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
    reportado_en TIMESTAMP WITH TIME ZONE,
    confirmado_en TIMESTAMP WITH TIME ZONE
);

-- Egresos del proyecto (VPS, dominio, etc.) para el panel de transparencia.
CREATE TABLE IF NOT EXISTS donaciones_gastos (
    id BIGSERIAL PRIMARY KEY,
    concepto TEXT NOT NULL,
    monto NUMERIC(10, 2) NOT NULL CHECK (monto > 0),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Configuración del módulo (meta de recaudación, textos). Clave/valor para no
-- tener que migrar la tabla cada vez que se agrega un parámetro.
CREATE TABLE IF NOT EXISTS donaciones_config (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO donaciones_config (clave, valor) VALUES
    ('meta_soles', '1000'),
    ('destino_aporte', 'Infraestructura del servidor y dominio de UniVia')
ON CONFLICT (clave) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 2. Índices
-- -----------------------------------------------------------------------------
-- Reserva del centavo: solo una donación ACTIVA puede reclamar un monto exacto.
-- Es un índice parcial a propósito (ver nota de diseño arriba): al reportarse,
-- el monto queda libre para la siguiente persona.
CREATE UNIQUE INDEX IF NOT EXISTS idx_donaciones_monto_activo
    ON donaciones (monto_exacto)
    WHERE estado = 'iniciada';

-- Ranking y muro: recorren las donaciones que ya cuentan, más reciente primero.
CREATE INDEX IF NOT EXISTS idx_donaciones_estado
    ON donaciones (estado, creado_en DESC);

-- Historial propio del estudiante.
CREATE INDEX IF NOT EXISTS idx_donaciones_perfil
    ON donaciones (perfil_id, creado_en DESC);


-- -----------------------------------------------------------------------------
-- 3. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE donaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE donaciones_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE donaciones_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- El estudiante solo ve sus propias donaciones. El ranking público lo
    -- arma el backend con la llave de servicio, ya anonimizado.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'donaciones' AND policyname = 'donaciones_select_propia'
    ) THEN
        CREATE POLICY donaciones_select_propia ON donaciones
            FOR SELECT USING (auth.uid() = perfil_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'donaciones' AND policyname = 'donaciones_insert_propia'
    ) THEN
        CREATE POLICY donaciones_insert_propia ON donaciones
            FOR INSERT WITH CHECK (auth.uid() = perfil_id);
    END IF;

    -- Solo para marcar "ya yapeé" sobre la propia donación.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'donaciones' AND policyname = 'donaciones_update_propia'
    ) THEN
        CREATE POLICY donaciones_update_propia ON donaciones
            FOR UPDATE
            USING (auth.uid() = perfil_id)
            WITH CHECK (auth.uid() = perfil_id);
    END IF;
END $$;

-- Gastos y configuración: lectura pública (alimentan el panel de
-- transparencia), escritura solo con la llave de servicio.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'donaciones_gastos' AND policyname = 'donaciones_gastos_select'
    ) THEN
        CREATE POLICY donaciones_gastos_select ON donaciones_gastos
            FOR SELECT USING (TRUE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'donaciones_config' AND policyname = 'donaciones_config_select'
    ) THEN
        CREATE POLICY donaciones_config_select ON donaciones_config
            FOR SELECT USING (TRUE);
    END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 4. Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('donaciones', 'donaciones_gastos', 'donaciones_config')
-- ORDER BY table_name, ordinal_position;
--
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE tablename IN ('donaciones', 'donaciones_gastos', 'donaciones_config')
-- ORDER BY tablename, policyname;
--
-- Registrar un gasto (panel de transparencia):
-- INSERT INTO donaciones_gastos (concepto, monto, fecha)
-- VALUES ('Servidor VPS — mensualidad', 49.00, CURRENT_DATE);
--
-- Cambiar la meta de recaudación:
-- UPDATE donaciones_config SET valor = '1500', actualizado_en = NOW()
-- WHERE clave = 'meta_soles';
