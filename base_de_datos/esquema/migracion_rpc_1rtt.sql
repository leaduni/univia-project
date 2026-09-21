-- =============================================================================
-- Migración — RPCs 1-RTT (data-mart) para eliminar cascadas de peticiones
-- Proyecto: UniVia (leaduni/univia-project)
-- =============================================================================
--
-- Objetivo: los endpoints de dashboard, malla y recursos hacían 4-10 llamadas
-- REST secuenciales a Supabase (perfiles -> carreras -> mallas -> malla_cursos
-- -> progreso -> recursos). Cada una sumaba una ida y vuelta de red. Estas
-- funciones traen TODOS los datos que el backend necesita en UNA sola llamada
-- .rpc() (1 RTT); la lógica de ensamblado/negocio sigue viviendo en Python.
--
-- Seguridad: SECURITY DEFINER + SET search_path. Guard de identidad: solo se
-- puede pedir el agregado del propio auth.uid(), que es quien llega en el JWT
-- del request autenticado (el backend pasa user.id desde get_current_user).
--
-- Idempotente: CREATE OR REPLACE FUNCTION. Ejecutar en el SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. get_malla_datos(p_user) -> malla de la carrera del estudiante + progreso
-- -----------------------------------------------------------------------------
-- Reemplaza: _obtener_malla_del_perfil + malla_cursos(join cursos) +
--            malla_curso_prerrequisitos + progreso_cursos  (~4 RTT -> 1 RTT)
create or replace function public.get_malla_datos(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_carrera_id int;
  v_malla_id int;
  v_ciclo_actual int;
begin
  if auth.uid() is distinct from p_user then
    raise exception 'access denied';
  end if;

  select carrera_id, malla_id, ciclo_actual into v_carrera_id, v_malla_id, v_ciclo_actual
  from public.perfiles where id = p_user;

  if v_carrera_id is null then
    return jsonb_build_object(
      'carrera_id', null, 'malla_id', null, 'ciclo_actual', null,
      'malla_cursos', '[]'::jsonb, 'prerequisitos', '[]'::jsonb, 'progreso', '[]'::jsonb
    );
  end if;

  if v_malla_id is null then
    select id into v_malla_id from public.mallas
    where carrera_id = v_carrera_id and es_vigente = true
    order by id limit 1;
  end if;

  return jsonb_build_object(
    'carrera_id', v_carrera_id,
    'malla_id', v_malla_id,
    'ciclo_actual', v_ciclo_actual,
    'malla_cursos', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', mc.id, 'curso_id', mc.curso_id, 'ciclo', mc.ciclo,
                 'credits', mc.credits, 'tipo', mc.tipo,
                 'code', c.code, 'name', c.name, 'description', c.description
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
        select jsonb_agg(jsonb_build_object(
                 'curso_id', pc.curso_id, 'status', pc.status,
                 'nota', pc.nota, 'fecha_completado', pc.fecha_completado))
        from public.progreso_cursos pc where pc.perfil_id = p_user), '[]'::jsonb)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. get_cursos_activos_datos(p_user) -> cursos en curso + temas + avance
-- -----------------------------------------------------------------------------
-- Reemplaza: progreso_cursos + perfiles + mallas + malla_cursos + steps +
--            progreso_unidades  (~6 RTT -> 1 RTT)
create or replace function public.get_cursos_activos_datos(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    return jsonb_build_object('malla_id', null, 'cursos', '[]'::jsonb,
                              'steps', '[]'::jsonb, 'unidades', '[]'::jsonb);
  end if;

  if v_malla_id is null then
    select id into v_malla_id from public.mallas
    where carrera_id = v_carrera_id and es_vigente = true
    order by id limit 1;
  end if;

  return jsonb_build_object(
    'malla_id', v_malla_id,
    'cursos', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'curso_id', c.id, 'code', c.code, 'name', c.name,
                 'credits', mc.credits, 'ciclo', mc.ciclo))
        from public.progreso_cursos pc
        join public.cursos c on c.id = pc.curso_id
        join public.malla_cursos mc on mc.curso_id = pc.curso_id and mc.malla_id = v_malla_id
        where pc.perfil_id = p_user and pc.status = 'in_progress'), '[]'::jsonb),
    'steps', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', s.id, 'curso_id', s.curso_id, 'title', s.title, 'order_index', s.order_index)
               order by s.order_index)
        from public.learning_path_steps s
        where s.curso_id in (
            select pc.curso_id from public.progreso_cursos pc
            where pc.perfil_id = p_user and pc.status = 'in_progress'
        )), '[]'::jsonb),
    'unidades', coalesce((
        select jsonb_agg(jsonb_build_object('step_id', pu.step_id, 'completado', pu.completado))
        from public.progreso_unidades pu where pu.perfil_id = p_user), '[]'::jsonb)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. get_resumen_dashboard(p_user) -> stats + logros
-- -----------------------------------------------------------------------------
-- Reemplaza: _calcular_stats (perfil + mallas + malla_cursos + progreso) +
--            _obtener_logros (logros + logros_usuarios)  (~6 RTT -> 1 RTT)
create or replace function public.get_resumen_dashboard(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
        from public.logros l), '[]'::jsonb),
    'logros_usuarios', coalesce((
        select jsonb_agg(jsonb_build_object('logro_id', lu.logro_id, 'unlocked_at', lu.unlocked_at))
        from public.logros_usuarios lu where lu.perfil_id = p_user), '[]'::jsonb)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. get_recursos_alcance(p_user) -> alcance de facultad + catálogos del banco
-- -----------------------------------------------------------------------------
-- Reemplaza: _alcance_de_facultad (6 consultas) + lookups de
--            cursos / malla_cursos / carreras / facultades  (~10 RTT -> 1 RTT)
create or replace function public.get_recursos_alcance(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_carrera_id int;
  v_facultad_id int;
begin
  if auth.uid() is distinct from p_user then
    raise exception 'access denied';
  end if;

  select carrera_id into v_carrera_id from public.perfiles where id = p_user;
  if v_carrera_id is null then
    return jsonb_build_object('facultad_id', null, 'facultad_nombre', null,
      'curso_ids', '[]'::jsonb, 'cursos', '[]'::jsonb,
      'carreras', '[]'::jsonb, 'facultades', '[]'::jsonb);
  end if;

  select facultad_id into v_facultad_id from public.carreras where id = v_carrera_id;
  if v_facultad_id is null then
    return jsonb_build_object('facultad_id', null, 'facultad_nombre', null,
      'curso_ids', '[]'::jsonb, 'cursos', '[]'::jsonb,
      'carreras', '[]'::jsonb, 'facultades', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'facultad_id', v_facultad_id,
    'facultad_nombre', (select nombre from public.facultades where id = v_facultad_id),
    'curso_ids', coalesce((
        select jsonb_agg(distinct mc.curso_id)
        from public.malla_cursos mc
        join public.mallas m on m.id = mc.malla_id
        where m.carrera_id in (select x.id from public.carreras x where x.facultad_id = v_facultad_id)
        and mc.curso_id is not null), '[]'::jsonb),
    'cursos', coalesce((
        select jsonb_agg(t) from (
            select distinct on (c.id) jsonb_build_object(
                     'id', c.id, 'code', c.code, 'name', c.name,
                     'ciclo', mc.ciclo, 'carrera_id', m.carrera_id) as t
            from public.cursos c
            join public.malla_cursos mc on mc.curso_id = c.id
            join public.mallas m on m.id = mc.malla_id
            where m.carrera_id in (select x.id from public.carreras x where x.facultad_id = v_facultad_id)
            order by c.id, mc.ciclo
        ) sub), '[]'::jsonb),
    'carreras', coalesce((
        select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'facultad_id', c.facultad_id))
        from public.carreras c where c.facultad_id = v_facultad_id), '[]'::jsonb),
    'facultades', coalesce((
        select jsonb_agg(jsonb_build_object('id', f.id, 'nombre', f.nombre))
        from public.facultades f), '[]'::jsonb)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. get_learning_path_datos(p_user, p_curso) -> ruta de aprendizaje 1-RTT
-- -----------------------------------------------------------------------------
-- Reemplaza: _verificar_acceso_curso (hasta 6 consultas) + cursos + profesores +
--            learning_path_steps + progreso_cursos + progreso_unidades (~9 RTT)
-- La lógica de acceso/prerrequisitos (check_course_status) se conserva en Python.
create or replace function public.get_learning_path_datos(p_user uuid, p_curso int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_carrera_id int;
  v_malla_id int;
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
        from public.learning_path_steps s where s.curso_id = p_curso), '[]'::jsonb),
    'unidades', coalesce((
        select jsonb_agg(jsonb_build_object('step_id', pu.step_id, 'completado', pu.completado))
        from public.progreso_unidades pu where pu.perfil_id = p_user), '[]'::jsonb)
  );
end;
$$;