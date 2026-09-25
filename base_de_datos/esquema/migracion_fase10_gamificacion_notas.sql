-- =============================================================================
-- Fase 10: notas inmutables, gamificación, referidos y ranking
-- Ejecutar en el SQL Editor de Supabase antes de desplegar los nuevos routers.
--
-- Formato de clave_respuestas (solo vía backend; nunca expuesta al cliente):
--   {"respuestas": [{"pregunta_id": "p1", "tipo": "opcion|texto|codigo|multiseleccion",
--                    "respuesta_correcta": <valor o lista>, "valor": 5.0}]}
-- Formato de respuestas enviadas a fase10_registrar_intento:
--   [{"pregunta_id": "p1", "respuesta": <valor o lista>}]
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.evaluaciones_publicadas (
    id BIGSERIAL PRIMARY KEY,
    curso_id INTEGER NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
    step_id INTEGER REFERENCES public.learning_path_steps(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    peso NUMERIC(8, 2) NOT NULL DEFAULT 1 CHECK (peso > 0),
    puntaje_maximo NUMERIC(10, 2) NOT NULL CHECK (puntaje_maximo > 0),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicada', 'cerrada')),
    abre_at TIMESTAMPTZ,
    cierra_at TIMESTAMPTZ,
    max_intentos INTEGER NOT NULL DEFAULT 1 CHECK (max_intentos > 0),
    preguntas JSONB NOT NULL DEFAULT '[]'::jsonb,
    clave_respuestas JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (cierra_at IS NULL OR abre_at IS NULL OR cierra_at > abre_at)
);

CREATE TABLE IF NOT EXISTS public.evaluacion_sesiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluacion_id BIGINT NOT NULL REFERENCES public.evaluaciones_publicadas(id) ON DELETE RESTRICT,
    perfil_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    preguntas_snapshot JSONB NOT NULL,
    clave_respuestas JSONB NOT NULL,
    iniciada_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    vence_at TIMESTAMPTZ,
    entregada_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evaluacion_intentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_id UUID NOT NULL UNIQUE REFERENCES public.evaluacion_sesiones(id) ON DELETE RESTRICT,
    perfil_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    evaluacion_id BIGINT NOT NULL REFERENCES public.evaluaciones_publicadas(id) ON DELETE RESTRICT,
    curso_id INTEGER NOT NULL REFERENCES public.cursos(id) ON DELETE RESTRICT,
    step_id INTEGER REFERENCES public.learning_path_steps(id) ON DELETE SET NULL,
    nota NUMERIC(5, 2) NOT NULL CHECK (nota >= 0 AND nota <= 20),
    puntaje_obtenido NUMERIC(10, 2) NOT NULL CHECK (puntaje_obtenido >= 0),
    puntaje_maximo NUMERIC(10, 2) NOT NULL CHECK (puntaje_maximo > 0),
    respuestas_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    fecha_completado TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gamificacion_usuarios (
    perfil_id UUID PRIMARY KEY REFERENCES public.perfiles(id) ON DELETE CASCADE,
    xp_total INTEGER NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
    nivel INTEGER NOT NULL DEFAULT 1 CHECK (nivel >= 1),
    racha_actual INTEGER NOT NULL DEFAULT 0 CHECK (racha_actual >= 0),
    racha_maxima INTEGER NOT NULL DEFAULT 0 CHECK (racha_maxima >= 0),
    ultima_fecha_actividad DATE,
    alias_publico VARCHAR(40) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registro_puntos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    tipo VARCHAR(32) NOT NULL CHECK (tipo IN ('evaluacion', 'racha_diaria', 'referido_verificado', 'ajuste')),
    cantidad INTEGER NOT NULL CHECK (cantidad <> 0),
    referencia_tipo VARCHAR(48) NOT NULL,
    referencia_id TEXT NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    otorgado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.codigos_referido (
    perfil_id UUID PRIMARY KEY REFERENCES public.perfiles(id) ON DELETE CASCADE,
    codigo VARCHAR(16) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referente_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    referido_id UUID NOT NULL UNIQUE REFERENCES public.perfiles(id) ON DELETE CASCADE,
    codigo VARCHAR(16) NOT NULL,
    registrado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    onboarding_verificado_at TIMESTAMPTZ,
    recompensa_otorgada_at TIMESTAMPTZ,
    CHECK (referente_id <> referido_id)
);

CREATE TABLE IF NOT EXISTS public.eventos_compartir (
    id BIGSERIAL PRIMARY KEY,
    perfil_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    canal VARCHAR(32) NOT NULL DEFAULT 'copiar_enlace',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluacion_intentos_perfil_curso_fecha
    ON public.evaluacion_intentos (perfil_id, curso_id, fecha_completado DESC);
CREATE INDEX IF NOT EXISTS idx_evaluacion_intentos_evaluacion
    ON public.evaluacion_intentos (evaluacion_id, fecha_completado DESC);
CREATE INDEX IF NOT EXISTS idx_registro_puntos_perfil_fecha
    ON public.registro_puntos (perfil_id, otorgado_at DESC);
CREATE INDEX IF NOT EXISTS idx_registro_puntos_fecha ON public.registro_puntos (otorgado_at DESC);
CREATE INDEX IF NOT EXISTS idx_referidos_referente ON public.referidos (referente_id, registrado_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_compartir_perfil_fecha
    ON public.eventos_compartir (perfil_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.fase10_alias(p_id UUID)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
    SELECT 'uni_' || lower(substr(replace(p_id::text, '-', ''), 1, 8));
$$;

CREATE OR REPLACE FUNCTION public.fase10_crear_gamificacion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.gamificacion_usuarios (perfil_id, alias_publico)
    VALUES (NEW.id, public.fase10_alias(NEW.id))
    ON CONFLICT (perfil_id) DO NOTHING;
    INSERT INTO public.codigos_referido (perfil_id, codigo)
    VALUES (NEW.id, upper(substr(replace(NEW.id::text, '-', ''), 1, 10)))
    ON CONFLICT (perfil_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fase10_perfil_creado ON public.perfiles;
CREATE TRIGGER fase10_perfil_creado
AFTER INSERT ON public.perfiles FOR EACH ROW EXECUTE FUNCTION public.fase10_crear_gamificacion();

INSERT INTO public.gamificacion_usuarios (perfil_id, alias_publico)
SELECT p.id, public.fase10_alias(p.id) FROM public.perfiles p
ON CONFLICT (perfil_id) DO NOTHING;
INSERT INTO public.codigos_referido (perfil_id, codigo)
SELECT p.id, upper(substr(replace(p.id::text, '-', ''), 1, 10)) FROM public.perfiles p
ON CONFLICT (perfil_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fase10_actualizar_xp()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_xp INTEGER;
BEGIN
    -- Defensa: si por cualquier vía faltara la fila de gamificación del perfil,
    -- se crea antes de acumular (no debe romper la concesión de puntos).
    INSERT INTO public.gamificacion_usuarios (perfil_id, alias_publico)
    VALUES (NEW.perfil_id, public.fase10_alias(NEW.perfil_id))
    ON CONFLICT (perfil_id) DO NOTHING;
    UPDATE public.gamificacion_usuarios
       SET xp_total = GREATEST(xp_total + NEW.cantidad, 0),
           updated_at = now()
     WHERE perfil_id = NEW.perfil_id
     RETURNING xp_total INTO v_xp;
    UPDATE public.gamificacion_usuarios
       SET nivel = GREATEST(1, floor(sqrt(v_xp::numeric / 100))::integer + 1),
           updated_at = now()
     WHERE perfil_id = NEW.perfil_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fase10_xp_insertado ON public.registro_puntos;
CREATE TRIGGER fase10_xp_insertado
AFTER INSERT ON public.registro_puntos FOR EACH ROW EXECUTE FUNCTION public.fase10_actualizar_xp();

CREATE OR REPLACE FUNCTION public.fase10_bloquear_mutacion()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    RAISE EXCEPTION 'Los registros de % son inmutables', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS fase10_intentos_inmutables ON public.evaluacion_intentos;
CREATE TRIGGER fase10_intentos_inmutables BEFORE UPDATE OR DELETE ON public.evaluacion_intentos
FOR EACH ROW EXECUTE FUNCTION public.fase10_bloquear_mutacion();
DROP TRIGGER IF EXISTS fase10_puntos_inmutables ON public.registro_puntos;
CREATE TRIGGER fase10_puntos_inmutables BEFORE UPDATE OR DELETE ON public.registro_puntos
FOR EACH ROW EXECUTE FUNCTION public.fase10_bloquear_mutacion();

CREATE OR REPLACE VIEW public.v_nota_curso_inmutable WITH (security_invoker = true) AS
SELECT i.perfil_id, i.curso_id,
       round(sum(i.nota * e.peso) / NULLIF(sum(e.peso), 0), 2) AS nota_promedio,
       count(*)::integer AS intentos,
       max(i.fecha_completado) AS ultima_fecha
FROM public.evaluacion_intentos i
JOIN public.evaluaciones_publicadas e ON e.id = i.evaluacion_id
GROUP BY i.perfil_id, i.curso_id;

CREATE OR REPLACE VIEW public.v_promedio_academico_inmutable WITH (security_invoker = true) AS
SELECT n.perfil_id,
       round(sum(n.nota_promedio * mc.credits) / NULLIF(sum(mc.credits), 0), 2) AS promedio_ponderado
FROM public.v_nota_curso_inmutable n
JOIN public.perfiles p ON p.id = n.perfil_id
JOIN public.malla_cursos mc ON mc.malla_id = p.malla_id AND mc.curso_id = n.curso_id
GROUP BY n.perfil_id;

CREATE OR REPLACE VIEW public.v_ranking_global WITH (security_invoker = true) AS
SELECT g.perfil_id, g.alias_publico, p.avatar_url, g.xp_total, g.nivel,
       dense_rank() OVER (ORDER BY g.xp_total DESC, g.perfil_id) AS puesto
FROM public.gamificacion_usuarios g JOIN public.perfiles p ON p.id = g.perfil_id;

CREATE OR REPLACE VIEW public.v_ranking_semanal WITH (security_invoker = true) AS
SELECT g.perfil_id, g.alias_publico, p.avatar_url, COALESCE(sum(r.cantidad), 0)::integer AS xp_total, g.nivel,
       dense_rank() OVER (ORDER BY COALESCE(sum(r.cantidad), 0) DESC, g.perfil_id) AS puesto
FROM public.gamificacion_usuarios g
JOIN public.perfiles p ON p.id = g.perfil_id
LEFT JOIN public.registro_puntos r ON r.perfil_id = g.perfil_id
 AND r.otorgado_at >= date_trunc('week', timezone('America/Lima', now())) AT TIME ZONE 'America/Lima'
GROUP BY g.perfil_id, g.alias_publico, p.avatar_url, g.nivel;

CREATE OR REPLACE FUNCTION public.fase10_checkin()
RETURNS TABLE(racha_actual INTEGER, racha_maxima INTEGER, xp_otorgado INTEGER, ya_registrado BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u UUID := auth.uid(); hoy DATE := (now() AT TIME ZONE 'America/Lima')::date;
DECLARE anterior DATE; nueva_racha INTEGER; bono INTEGER;
BEGIN
    IF u IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000'; END IF;
    INSERT INTO public.gamificacion_usuarios (perfil_id, alias_publico) VALUES (u, public.fase10_alias(u)) ON CONFLICT DO NOTHING;
    SELECT ultima_fecha_actividad, racha_actual INTO anterior, nueva_racha FROM public.gamificacion_usuarios WHERE perfil_id = u FOR UPDATE;
    IF anterior = hoy THEN
        RETURN QUERY SELECT nueva_racha, (SELECT racha_maxima FROM public.gamificacion_usuarios WHERE perfil_id = u), 0, true; RETURN;
    END IF;
    nueva_racha := CASE WHEN anterior = hoy - 1 THEN nueva_racha + 1 ELSE 1 END;
    bono := LEAST(5 + nueva_racha, 20);
    UPDATE public.gamificacion_usuarios SET racha_actual = nueva_racha, racha_maxima = GREATEST(racha_maxima, nueva_racha), ultima_fecha_actividad = hoy, updated_at = now() WHERE perfil_id = u;
    INSERT INTO public.registro_puntos (perfil_id, tipo, cantidad, referencia_tipo, referencia_id, idempotency_key)
    VALUES (u, 'racha_diaria', bono, 'checkin', hoy::text, 'checkin:' || u::text || ':' || hoy::text);
    RETURN QUERY SELECT nueva_racha, GREATEST((SELECT racha_maxima FROM public.gamificacion_usuarios WHERE perfil_id = u), nueva_racha), bono, false;
END;
$$;

-- Corrección y registro de intentos 100% en el servidor.
-- `p_puntaje` se conserva únicamente por compatibilidad del contrato original
-- y NUNCA se usa: el puntaje se recalcula contra `s.clave_respuestas`
-- (snapshot congelado en la sesión al crearla). Un cliente que intente inflar
-- su puntaje llamando directo a la RPC obtendrá el mismo resultado que si
-- llamara al backend, y el intento queda inmutable con su XP.
CREATE OR REPLACE FUNCTION public.fase10_registrar_intento(
    p_sesion UUID, p_respuestas JSONB, p_metadata JSONB DEFAULT '{}'::jsonb, p_puntaje NUMERIC DEFAULT NULL
) RETURNS TABLE(intent_id UUID, nota NUMERIC, xp_otorgado INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u UUID := auth.uid(); s public.evaluacion_sesiones%ROWTYPE; e public.evaluaciones_publicadas%ROWTYPE;
DECLARE v_obtenido NUMERIC := 0; v_posible NUMERIC := 0; v_dada JSONB; v_qid TEXT; v_tipo TEXT;
        v_correcta JSONB; v_valor NUMERIC; v_ok BOOLEAN; v_intentos INTEGER; k RECORD;
        int_del public.evaluacion_intentos%ROWTYPE; v_nota NUMERIC; v_xp INTEGER;
BEGIN
    IF u IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000'; END IF;
    IF octet_length(COALESCE(p_metadata, '{}'::jsonb)::text) > 16384 THEN
        RAISE EXCEPTION 'metadata demasiado grande' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO s FROM public.evaluacion_sesiones WHERE id = p_sesion AND perfil_id = u FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Sesión de evaluación no disponible' USING ERRCODE = '22023'; END IF;

    -- Idempotencia: una sesión ya entregada devuelve el intento registrado y XP 0.
    SELECT * INTO int_del FROM public.evaluacion_intentos WHERE sesion_id = s.id LIMIT 1;
    IF s.entregada_at IS NOT NULL OR int_del.id IS NOT NULL THEN
        intent_id := int_del.id; nota := int_del.nota; xp_otorgado := 0; RETURN NEXT; RETURN;
    END IF;
    IF s.vence_at IS NOT NULL AND s.vence_at < now() THEN
        RAISE EXCEPTION 'Sesión de evaluación vencida' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(COALESCE(p_respuestas, '[]'::jsonb)) > 200 THEN
        RAISE EXCEPTION 'demasiadas respuestas' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO e FROM public.evaluaciones_publicadas WHERE id = s.evaluacion_id;
    IF e.id IS NULL OR e.estado <> 'publicada' THEN RAISE EXCEPTION 'Evaluación no disponible' USING ERRCODE = '22023'; END IF;
    IF (e.abre_at IS NOT NULL AND e.abre_at > now()) OR (e.cierra_at IS NOT NULL AND e.cierra_at < now()) THEN
        RAISE EXCEPTION 'Ventana de evaluación cerrada' USING ERRCODE = '22023';
    END IF;
    SELECT count(*) INTO v_intentos FROM public.evaluacion_intentos
     WHERE perfil_id = u AND evaluacion_id = e.id;
    IF e.max_intentos > 0 AND v_intentos >= e.max_intentos THEN
        RAISE EXCEPTION 'Límite de intentos alcanzado' USING ERRCODE = '22023';
    END IF;

    FOR k IN SELECT value FROM jsonb_array_elements(COALESCE(s.clave_respuestas->'respuestas', '[]'::jsonb)) LOOP
        v_qid := k.value->>'pregunta_id';
        v_tipo := COALESCE(k.value->>'tipo', 'opcion');
        v_correcta := k.value->'respuesta_correcta';
        v_valor := COALESCE((k.value->>'valor')::numeric, 0);
        v_dada := NULL::jsonb;
        SELECT value INTO v_dada FROM jsonb_array_elements(COALESCE(p_respuestas, '[]'::jsonb))
         WHERE value->>'pregunta_id' = v_qid LIMIT 1;
        v_ok := false;
        IF v_dada IS NOT NULL AND (v_dada ? 'respuesta') THEN
            IF v_tipo IN ('texto', 'codigo') THEN
                v_ok := lower(btrim((v_dada->'respuesta')::text, '"')) = lower(btrim(v_correcta::text, '"'));
            ELSIF v_tipo = 'multiseleccion' THEN
                v_ok := (SELECT COALESCE(array_agg(t ORDER BY t) = (
                                SELECT array_agg(t2 ORDER BY t2) FROM jsonb_array_elements_text(v_correcta) t2
                            ), false)
                         FROM jsonb_array_elements_text(v_dada->'respuesta') t);
            ELSE
                v_ok := (v_dada->'respuesta')::text = v_correcta::text;
            END IF;
            IF v_ok THEN v_obtenido := v_obtenido + v_valor; END IF;
        END IF;
        v_posible := v_posible + v_valor;
    END LOOP;

    IF v_posible <= 0 THEN v_posible := e.puntaje_maximo; END IF;
    v_nota := round(LEAST(v_obtenido / v_posible * 20, 20), 2);
    v_xp := GREATEST(5, floor(v_nota)::integer * 2);

    UPDATE public.evaluacion_sesiones SET entregada_at = now() WHERE id = s.id;
    INSERT INTO public.evaluacion_intentos (sesion_id, perfil_id, evaluacion_id, curso_id, step_id, nota, puntaje_obtenido, puntaje_maximo, respuestas_snapshot, metadata)
    VALUES (s.id, u, e.id, e.curso_id, e.step_id, v_nota, v_obtenido, e.puntaje_maximo, p_respuestas, COALESCE(p_metadata, '{}'::jsonb))
    RETURNING id INTO intent_id;
    INSERT INTO public.registro_puntos (perfil_id, tipo, cantidad, referencia_tipo, referencia_id, idempotency_key)
    VALUES (u, 'evaluacion', v_xp, 'evaluacion_intento', intent_id::text, 'evaluacion:' || intent_id::text);
    nota := v_nota; xp_otorgado := v_xp; RETURN NEXT; RETURN;
END;
$$;

-- Ranking paginado. La paginación por cursor (keyset) es la primaria; el offset
-- se conserva como alternativa. `perfil_id` se incluye en la salida SOLO para
-- que el backend construya el cursor interno; nunca viaja en el JSON al cliente.
CREATE OR REPLACE FUNCTION public.fase10_ranking(
    p_periodo TEXT DEFAULT 'global',
    p_limite INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_desde_xp INTEGER DEFAULT NULL,
    p_desde_perfil UUID DEFAULT NULL
)
RETURNS TABLE(perfil_id UUID, alias_publico TEXT, avatar_url TEXT, xp_total INTEGER, nivel INTEGER, puesto BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT perfil_id, alias_publico, avatar_url, xp_total, nivel, puesto
    FROM (SELECT * FROM public.v_ranking_global WHERE p_periodo = 'global'
          UNION ALL SELECT * FROM public.v_ranking_semanal WHERE p_periodo = 'semanal') r
    WHERE (p_desde_xp IS NULL AND p_desde_perfil IS NULL)
       OR r.xp_total < p_desde_xp
       OR (r.xp_total = p_desde_xp AND (p_desde_perfil IS NULL OR r.perfil_id > p_desde_perfil))
    ORDER BY r.xp_total DESC, r.perfil_id
    LIMIT LEAST(GREATEST(p_limite, 1), 100) OFFSET GREATEST(p_offset, 0);
$$;

-- Posición y métricas del usuario autenticado dentro de un periodo.
CREATE OR REPLACE FUNCTION public.fase10_mi_posicion(p_periodo TEXT DEFAULT 'global')
RETURNS TABLE(perfil_id UUID, alias_publico TEXT, avatar_url TEXT, xp_total INTEGER, nivel INTEGER, puesto BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT * FROM (SELECT * FROM public.v_ranking_global WHERE p_periodo = 'global'
          UNION ALL SELECT * FROM public.v_ranking_semanal WHERE p_periodo = 'semanal') r
    WHERE r.perfil_id = auth.uid() LIMIT 1;
$$;

ALTER TABLE public.evaluaciones_publicadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluacion_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluacion_intentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamificacion_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_puntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codigos_referido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_compartir ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.evaluaciones_publicadas, public.evaluacion_sesiones, public.evaluacion_intentos,
    public.gamificacion_usuarios, public.registro_puntos, public.codigos_referido, public.referidos,
    public.eventos_compartir FROM anon, authenticated;
-- IMPORTANTE: el REVOKE está acotado a las tablas de fase 10. Un REVOKE ALL ON
-- ALL TABLES IN SCHEMA public habría retirado los privilegios de TODAS las
-- tablas existentes (cursos, perfiles, progreso_cursos, chat, feedback, foro,
-- dm, ...), rompiendo la aplicación completa.

-- Las claves de corrección viven solo en el backend: se concede SELECT por
-- columnas, omitiendo `clave_respuestas` (y `preguntas`) de la publicación y
-- `clave_respuestas` de la sesión. Así un estudiante jamás puede leerlas ni
-- directo ni a través de las vistas.
GRANT SELECT (id, curso_id, step_id, titulo, peso, puntaje_maximo, version, estado, abre_at, cierra_at, max_intentos, created_at)
    ON public.evaluaciones_publicadas TO authenticated;
GRANT SELECT (id, evaluacion_id, perfil_id, preguntas_snapshot, iniciada_at, vence_at, entregada_at, created_at)
    ON public.evaluacion_sesiones TO authenticated;
GRANT SELECT ON public.evaluacion_intentos, public.gamificacion_usuarios, public.registro_puntos,
    public.codigos_referido, public.referidos TO authenticated;
GRANT EXECUTE ON FUNCTION public.fase10_checkin(),
    public.fase10_registrar_intento(UUID, JSONB, JSONB, NUMERIC),
    public.fase10_ranking(TEXT, INTEGER, INTEGER, INTEGER, UUID),
    public.fase10_mi_posicion(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.fase10_checkin(),
    public.fase10_registrar_intento(UUID, JSONB, JSONB, NUMERIC),
    public.fase10_ranking(TEXT, INTEGER, INTEGER, INTEGER, UUID),
    public.fase10_mi_posicion(TEXT) FROM PUBLIC;

CREATE POLICY fase10_evaluaciones_publicadas_select ON public.evaluaciones_publicadas FOR SELECT TO authenticated USING (estado = 'publicada');
CREATE POLICY fase10_sesiones_select_propias ON public.evaluacion_sesiones FOR SELECT TO authenticated USING ((select auth.uid()) = perfil_id);
CREATE POLICY fase10_intentos_select_propios ON public.evaluacion_intentos FOR SELECT TO authenticated USING ((select auth.uid()) = perfil_id);
CREATE POLICY fase10_gamificacion_select_propia ON public.gamificacion_usuarios FOR SELECT TO authenticated USING ((select auth.uid()) = perfil_id);
CREATE POLICY fase10_puntos_select_propios ON public.registro_puntos FOR SELECT TO authenticated USING ((select auth.uid()) = perfil_id);
CREATE POLICY fase10_codigo_select_propio ON public.codigos_referido FOR SELECT TO authenticated USING ((select auth.uid()) = perfil_id);
CREATE POLICY fase10_referidos_select_propios ON public.referidos FOR SELECT TO authenticated USING ((select auth.uid()) IN (referente_id, referido_id));
