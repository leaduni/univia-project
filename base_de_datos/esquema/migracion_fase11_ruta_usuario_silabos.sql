-- =============================================================================
-- Migración — Fase 11: Ruta de Aprendizaje no vacía
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
-- Contexto:
--   169 de 215 cursos no tienen filas en learning_path_steps (ruta vacía).
--   Para que el alumno no se quede sin ruta, se habilitan tres vías:
--     1. Unidades creadas manualmente por el alumno (origen='usuario').
--     2. Ruta provisional generada con IA (origen='ia_provisional').
--     3. Subida del sílabo oficial en PDF/imagen (tabla solicitudes_silabos),
--        que notifica a los devs; el curso queda "en procesamiento".
--
-- Decisión de diseño (aprobada):
--   * NO se crea `unidades_usuario` paralela. `learning_path_steps` se extiende
--     con `origen` y `perfil_id` para que `progreso_unidades(step_id)`, la
--     generación de evaluaciones y el timeline sigan funcionando sin bifurcar
--     lógica. La fila oficial es global (perfil_id IS NULL); las personales son
--     del alumno (perfil_id = auth.uid()).
--   * La convivencia se resuelve en `get_learning_path_datos`: si hay pasos
--     oficiales se devuelven esos (y se archivan visualmente los personales);
--     si no, se devuelven los personales con indicador de origen.
--   * `solicitudes_silabos` guarda la trazabilidad del upload y su estado
--     ('pendiente' | 'en_procesamiento' | 'completado' | 'rechazado'). Un
--     índice parcial UNIQUE impide más de una solicitud abierta por curso y alumno.
--   * El estado del curso NO se denormaliza: se deriva (existe solicitud abierta
--     + no hay pasos oficiales aún).
--
-- Idempotente parcialmente: los CREATE/ALTER con IF NOT EXISTS y los DO $$
-- pueden ejecutarse varias veces; el RPC get_learning_path_datos se reemplaza
-- (create or replace) de forma idempotente por diseño.
-- Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. learning_path_steps: origen, dueño y estado de archivado
-- -----------------------------------------------------------------------------
ALTER TABLE public.learning_path_steps ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'oficial'
    CHECK (origen IN ('oficial', 'usuario', 'ia_provisional'));

ALTER TABLE public.learning_path_steps ADD COLUMN IF NOT EXISTS
    perfil_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE;

-- Estado de vida de la fila. 'reemplazado' se usa cuando llega la ruta oficial
-- y se archiva la provisional/personal del alumno SIN borrar su progreso.
ALTER TABLE public.learning_path_steps ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'reemplazado'));

-- La ruta oficial es global; la personal siempre es de un alumno concreto.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_learning_path_origen_perfil'
    ) THEN
        ALTER TABLE public.learning_path_steps ADD CONSTRAINT chk_learning_path_origen_perfil
        CHECK (
            (origen = 'oficial' AND perfil_id IS NULL)
            OR (origen IN ('usuario', 'ia_provisional') AND perfil_id IS NOT NULL)
        );
    END IF;
END $$;

-- Índices de lectura por curso y por alumno.
CREATE INDEX IF NOT EXISTS idx_learning_path_curso_perfil
    ON public.learning_path_steps (curso_id, perfil_id, order_index);

-- -----------------------------------------------------------------------------
-- 2. solicitudes_silabos: trazabilidad del upload y estado del sílabo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solicitudes_silabos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    archivo_path TEXT NOT NULL,
    nombre_original TEXT NOT NULL,
    tipo_mime TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'en_procesamiento', 'completado', 'rechazado')),
    -- Fuente de la ruta que convivió con la solicitud (si el alumno también
    -- generó una provisional). Solo informativo para el dev que procesa.
    origen_ruta VARCHAR(20),
    nota_admin TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    procesado_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_silabos_curso
    ON solicitudes_silabos (curso_id, estado);

CREATE INDEX IF NOT EXISTS idx_solicitudes_silabos_perfil
    ON solicitudes_silabos (perfil_id, creado_en DESC);

-- Una sola solicitud ABIERTA por (curso, alumno). Al completarse/rechazarse se
-- libera el cupo y el alumno puede volver a subir si su sílabo fue rechazado.
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_abierta_curso_perfil
    ON solicitudes_silabos (curso_id, perfil_id)
    WHERE estado IN ('pendiente', 'en_procesamiento');

-- -----------------------------------------------------------------------------
-- 3. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.learning_path_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_silabos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- learning_path_steps — SELECT: la ruta oficial es pública de lectura; la
    -- personal, solo de su dueño.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'learning_path_steps'
          AND policyname = 'learning_path_select_personal'
    ) THEN
        CREATE POLICY learning_path_select_personal ON public.learning_path_steps
            FOR SELECT USING (
                perfil_id IS NULL OR perfil_id = auth.uid()
            );
    END IF;

    -- learning_path_steps — INSERT: solo el dueño y solo filas personales
    -- (nunca 'oficial'; eso queda exclusivo del service_role). El CHECK de la
    -- tabla refuerza que origen != 'oficial' cuando hay perfil.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'learning_path_steps'
          AND policyname = 'learning_path_insert_personal'
    ) THEN
        CREATE POLICY learning_path_insert_personal ON public.learning_path_steps
            FOR INSERT WITH CHECK (
                perfil_id = auth.uid() AND origen <> 'oficial'
            );
    END IF;

    -- learning_path_steps — UPDATE/DELETE: solo el dueño (sus filas activas).
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'learning_path_steps'
          AND policyname = 'learning_path_update_personal'
    ) THEN
        CREATE POLICY learning_path_update_personal ON public.learning_path_steps
            FOR UPDATE USING (perfil_id = auth.uid() AND estado = 'activo')
            WITH CHECK (perfil_id = auth.uid() AND origen <> 'oficial');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'learning_path_steps'
          AND policyname = 'learning_path_delete_personal'
    ) THEN
        CREATE POLICY learning_path_delete_personal ON public.learning_path_steps
            FOR DELETE USING (perfil_id = auth.uid());
    END IF;

    -- solicitudes_silabos — SELECT: solo el propio alumno (o devs, para el
    -- panel de administración).
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'solicitudes_silabos'
          AND policyname = 'solicitudes_silabos_select'
    ) THEN
        CREATE POLICY solicitudes_silabos_select ON public.solicitudes_silabos
            FOR SELECT USING (
                perfil_id = auth.uid()
                OR EXISTS (SELECT 1 FROM feedback_devs d WHERE d.perfil_id = auth.uid())
            );
    END IF;

    -- solicitudes_silabos — INSERT: solo el propio alumno. La escritura de
    -- estados (completado/rechazado) queda para service_role vía backend.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'solicitudes_silabos'
          AND policyname = 'solicitudes_silabos_insert'
    ) THEN
        CREATE POLICY solicitudes_silabos_insert ON public.solicitudes_silabos
            FOR INSERT WITH CHECK (perfil_id = auth.uid());
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Bucket privado de sílabos pendientes (mismo patrón que feedback-adjuntos)
-- -----------------------------------------------------------------------------
-- Los uploads se hacen con el cliente admin (service_role) desde el backend;
-- las URLs firmadas expirables permiten la lectura para el dev sin política de
-- SELECT pública. file_size_limit = 10 MB (los sílabos escaneados pesan más
-- que los adjuntos de feedback).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('silabos-pendientes', 'silabos-pendientes', false, 10485760)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
          AND policyname = 'silabos_pendientes_storage_insert'
    ) THEN
        CREATE POLICY silabos_pendientes_storage_insert ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'silabos-pendientes');
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. get_learning_path_datos: convivencia oficial + personal (1-RTT)
-- -----------------------------------------------------------------------------
-- Regla de visibilidad:
--   'steps'        -> pasos OFICIALES si existen; si no, los ACTIVOS del alumno.
--   'ruta_origen'  -> 'oficial' | 'usuario' | 'ia_provisional' (para que el
--                      frontend pinte el badge "Provisional").
--   'hay_oficial'  -> bool: si ya llegó la oficial, aunque el alumno tenga
--                      personales archivadas.
--   'solicitud_silabo' -> la solicitud ABIERTA del alumno para este curso
--                      (si la hay); estado 'pendiente' o 'en_procesamiento'.
create or replace function public.get_learning_path_datos(p_user uuid, p_curso int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_carrera_id int;
  v_malla_id int;
  v_hay_oficial boolean;
  v_origen_fuente text;
begin
  if auth.uid() is distinct from p_user then
    raise exception 'access denied';
  end if;

  select carrera_id, malla_id into v_carrera_id, v_malla_id
  from public.perfiles where id = p_user;

  if v_carrera_id is not null and v_malla_id is null then
    select id into v_malla_id from public.mallas
    where carrera_id = v_carrera_id and es_vigente = true
    order by id limit 1;
  end if;

  v_hay_oficial := exists(
    select 1 from public.learning_path_steps s
    where s.curso_id = p_curso and s.origen = 'oficial'
  );

  if v_hay_oficial then
    v_origen_fuente := 'oficial';
  else
    select s.origen into v_origen_fuente
    from public.learning_path_steps s
    where s.curso_id = p_curso and s.perfil_id = p_user and s.estado = 'activo'
    order by s.order_index
    limit 1;
  end if;

  return jsonb_build_object(
    'carrera_id', v_carrera_id,
    'malla_id', v_malla_id,
    'progreso_curso', coalesce((
        select to_jsonb(t) from (
          select pc.curso_id, pc.status
          from public.progreso_cursos pc
          where pc.perfil_id = p_user and pc.curso_id = p_curso
        ) t), 'null'::jsonb),
    'malla_cursos', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', mc.id, 'curso_id', mc.curso_id, 'ciclo', mc.ciclo,
                 'credits', mc.credits, 'code', c.code, 'name', c.name
               ) order by mc.ciclo)
        from public.malla_cursos mc
        join public.cursos c on c.id = mc.curso_id
        where mc.malla_id = v_malla_id), '[]'::jsonb),
    'prerequisitos', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'malla_curso_id', mcp.malla_curso_id,
                 'prerrequisito_malla_curso_id', mcp.prerrequisito_malla_curso_id))
        from public.malla_curso_prerrequisitos mcp
        where mcp.malla_curso_id in (
            select mc.id from public.malla_cursos mc where mc.malla_id = v_malla_id
        )), '[]'::jsonb),
    'progreso', coalesce((
        select jsonb_agg(jsonb_build_object('curso_id', pc.curso_id, 'status', pc.status))
        from public.progreso_cursos pc where pc.perfil_id = p_user), '[]'::jsonb),
    'curso', (select to_jsonb(c) from public.cursos c where c.id = p_curso),
    'profesores', coalesce((
        select jsonb_agg(cp.p_nombre order by cp.p_nombre)
        from (
          select p.nombre_completo as p_nombre
          from public.curso_profesores cp
          join public.profesores p on p.id = cp.profesor_id
          where cp.curso_id = p_curso
        ) cp), '[]'::jsonb),
    'steps', coalesce((
        select jsonb_agg(to_jsonb(s) order by s.order_index)
        from public.learning_path_steps s
        where s.curso_id = p_curso
          and (
            (v_hay_oficial and s.origen = 'oficial')
            or (not v_hay_oficial and s.perfil_id = p_user and s.estado = 'activo')
          )), '[]'::jsonb),
    'unidades', coalesce((
        select jsonb_agg(jsonb_build_object('step_id', pu.step_id, 'completado', pu.completado))
        from public.progreso_unidades pu where pu.perfil_id = p_user), '[]'::jsonb),
    'hay_oficial', v_hay_oficial,
    'ruta_origen', v_origen_fuente,
    'solicitud_silabo', coalesce((
        select to_jsonb(t) from (
          select ss.id, ss.curso_id, ss.estado, ss.nombre_original,
                 ss.tipo_mime, ss.size_bytes, ss.creado_en
          from public.solicitudes_silabos ss
          where ss.curso_id = p_curso and ss.perfil_id = p_user
            and ss.estado in ('pendiente', 'en_procesamiento')
          order by ss.creado_en desc
          limit 1
        ) t), 'null'::jsonb)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Verificación posterior
-- -----------------------------------------------------------------------------
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'learning_path_steps' ORDER BY ordinal_position;
--
-- SELECT table_name, column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'solicitudes_silabos' ORDER BY table_name, ordinal_position;
--
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE tablename IN ('learning_path_steps', 'solicitudes_silabos')
-- ORDER BY tablename, policyname;
