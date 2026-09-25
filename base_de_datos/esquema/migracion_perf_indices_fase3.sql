-- Fase 3: índices que faltan en los filtros de las RPC 1-RTT y paginación
-- del catálogo de logros en get_resumen_dashboard.
--
-- Las RPC leen estas tablas por las columnas indexadas aquí en cada carga de
-- dashboard / malla / ruta de aprendizaje; sin índice, el coste crece lineal
-- con el número de estudiantes y cursos.
-- Idempotente (IF NOT EXISTS / CREATE OR REPLACE).

BEGIN;

CREATE INDEX IF NOT EXISTS idx_progreso_cursos_perfil_id
    ON public.progreso_cursos (perfil_id);

CREATE INDEX IF NOT EXISTS idx_progreso_unidades_perfil_id
    ON public.progreso_unidades (perfil_id);

CREATE INDEX IF NOT EXISTS idx_malla_cursos_malla_id
    ON public.malla_cursos (malla_id);

CREATE INDEX IF NOT EXISTS idx_malla_curso_prerr_malla_curso_id
    ON public.malla_curso_prerrequisitos (malla_curso_id);

COMMIT;

-- get_resumen_dashboard: el catálogo completo de logros se enviaba en cada
-- carga del dashboard. Se limita a los 100 primeros (sobran para la UI) y se
-- ordenan de forma estable para que el recorte sea determinista.
CREATE OR REPLACE FUNCTION public.get_resumen_dashboard(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_carrera_id int;
  v_malla_id int;
begin
  if auth.uid() is distinct from p_user then
    raise exception 'access denied';
  end if;

  select carrera_id, malla_id into v_carrera_id, v_malla_id
  from public.perfiles where id = p_user;

  if v_carrera_id is null then
    return jsonb_build_object('carrera_id', null, 'malla_id', null,
      'malla_cursos', '[]'::jsonb, 'progreso', '[]'::jsonb,
      'logros', '[]'::jsonb, 'logros_usuarios', '[]'::jsonb);
  end if;

  if v_malla_id is null then
    select id into v_malla_id from public.mallas
    where carrera_id = v_carrera_id and es_vigente = true
    order by id limit 1;
  end if;

  return jsonb_build_object(
    'carrera_id', v_carrera_id,
    'malla_id', v_malla_id,
    'malla_cursos', coalesce((
        select jsonb_agg(jsonb_build_object('curso_id', mc.curso_id, 'credits', mc.credits))
        from public.malla_cursos mc where mc.malla_id = v_malla_id), '[]'::jsonb),
    'progreso', coalesce((
        select jsonb_agg(jsonb_build_object('curso_id', pc.curso_id, 'status', pc.status, 'nota', pc.nota))
        from public.progreso_cursos pc where pc.perfil_id = p_user), '[]'::jsonb),
    'logros', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', l.id, 'nombre', l.nombre, 'descripcion', l.descripcion, 'icon', l.icon))
        from (select * from public.logros order by id limit 100) l), '[]'::jsonb),
    'logros_usuarios', coalesce((
        select jsonb_agg(jsonb_build_object('logro_id', lu.logro_id, 'unlocked_at', lu.unlocked_at))
        from public.logros_usuarios lu where lu.perfil_id = p_user), '[]'::jsonb)
  );
end;
$$;
