-- Búsqueda híbrida exclusiva del chatbot. No reemplaza ni modifica las RPC
-- search_resource_chunks / search_resource_chunks_by_nombre usadas por otros flujos.
--
-- `profesor` se resuelve con prioridad a `recursos.profesor_id` (etiqueta
-- manual/tagging) y, si está NULL, cae al docente del curso a través de
-- `curso_profesores` (relación N:M curso -> profesor). Así los recursos cuyo
-- docente solo está asociado al curso (el caso habitual, >99% de los recursos)
-- no devuelven `profesor=no disponible`.
--
-- `metadata` se reconstruye con al menos `{pagina: chunk_index}` para que el
-- backend pueda citar la página exacta en la cabecera [F#].
--
-- `filter_profesor_id` (10º parámetro, opcional, default null) acota la
-- búsqueda a los recursos de TODOS los cursos que dicta ese profesor vía
-- `curso_profesores` (relación N:M curso -> profesor), sin bloquear por curso:
-- resuelve material de un docente que imparte varias asignaturas (ej. HU102 y
-- GE501U) aunque el recurso no esté etiquetado con `recursos.profesor_id`.

create index if not exists idx_resource_chunks_contenido_fts
    on public.resource_chunks
    using gin (to_tsvector('spanish'::regconfig, coalesce(contenido, '')));

create or replace function public.search_chatbot_resource_chunks(
    query_text text,
    query_embedding vector(1536),
    match_threshold float default 0.40,
    match_count integer default 8,
    filter_curso_id integer default null,
    filter_profesor_id integer default null,
    full_text_weight float default 1.0,
    semantic_weight float default 1.0,
    rrf_k integer default 50,
    max_chunks_per_resource integer default 1
)
returns table (
    id uuid,
    recurso_id integer,
    curso_id integer,
    curso_code text,
    curso_nombre text,
    contenido text,
    metadata jsonb,
    similarity float,
    titulo_recurso text,
    tipo_recurso text,
    ciclo_recurso integer,
    year_recurso integer,
    profesor text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
    with semantic_results as (
        select
            rc.id,
            row_number() over (order by rc.embedding <=> query_embedding) as rank,
            1 - (rc.embedding <=> query_embedding) as similarity
        from public.resource_chunks rc
        where (filter_curso_id is null or rc.curso_id = filter_curso_id)
          and (filter_profesor_id is null or exists (
              select 1 from public.curso_profesores cp
              where cp.curso_id = rc.curso_id
                and cp.profesor_id = filter_profesor_id))
          and 1 - (rc.embedding <=> query_embedding) > match_threshold
        order by rc.embedding <=> query_embedding
        limit greatest(match_count * 4, 20)
    ),
    full_text_results as (
        select
            rc.id,
            row_number() over (
                order by ts_rank_cd(
                    to_tsvector('spanish'::regconfig, coalesce(rc.contenido, '')),
                    websearch_to_tsquery('spanish'::regconfig, query_text)
                ) desc
            ) as rank
        from public.resource_chunks rc
        where (filter_curso_id is null or rc.curso_id = filter_curso_id)
          and (filter_profesor_id is null or exists (
              select 1 from public.curso_profesores cp
              where cp.curso_id = rc.curso_id
                and cp.profesor_id = filter_profesor_id))
          and websearch_to_tsquery('spanish'::regconfig, query_text)
              @@ to_tsvector('spanish'::regconfig, coalesce(rc.contenido, ''))
        order by ts_rank_cd(
            to_tsvector('spanish'::regconfig, coalesce(rc.contenido, '')),
            websearch_to_tsquery('spanish'::regconfig, query_text)
        ) desc
        limit greatest(match_count * 4, 20)
    ),
    fused as (
        select
            coalesce(s.id, f.id) as id,
            coalesce(s.similarity, 0)::float as similarity,
            coalesce(semantic_weight / (rrf_k + s.rank), 0)
              + coalesce(full_text_weight / (rrf_k + f.rank), 0) as score
        from semantic_results s
        full join full_text_results f on f.id = s.id
    ),
    ranked_resources as (
        select
            fused.*,
            row_number() over (
                partition by rc.recurso_id
                order by fused.score desc, fused.similarity desc
            ) as resource_rank
        from fused
        join public.resource_chunks rc on rc.id = fused.id
    )
    select
        rc.id,
        rc.recurso_id,
        rc.curso_id,
        cu.code::text as curso_code,
        cu.name::text as curso_nombre,
        rc.contenido,
        jsonb_build_object('pagina', coalesce(rc.chunk_index, 0)) as metadata,
        (1 - (rc.embedding <=> query_embedding))::float as similarity,
        r.titulo::text as titulo_recurso,
        r.tipo::text as tipo_recurso,
        r.ciclo as ciclo_recurso,
        r.year as year_recurso,
        coalesce(pr.nombre_completo, prof_curso.nombres)::text as profesor
    from ranked_resources ranked
    join public.resource_chunks rc on rc.id = ranked.id
    join public.recursos r on r.id = rc.recurso_id
    join public.cursos cu on cu.id = r.curso_id
    left join public.profesores pr on pr.id = r.profesor_id
    left join lateral (
        select string_agg(p.nombre_completo, ', ' order by p.nombre_completo) as nombres
        from public.curso_profesores cp
        join public.profesores p on p.id = cp.profesor_id
        where cp.curso_id = r.curso_id
    ) prof_curso on true
    where ranked.resource_rank <= max_chunks_per_resource
    order by ranked.score desc, ranked.similarity desc
    limit least(greatest(match_count, 1), 20);
$$;

-- La versión anterior de 9 parámetros no tiene callers (el repo solo invoca la
-- RPC por nombre, con los 10 parámetros, desde `_handler_duda_academica`); se
-- elimina para que PostgREST despache sin ambigüedad a la firma con
-- `filter_profesor_id`.
drop function if exists public.search_chatbot_resource_chunks(
    text, vector, float, integer, integer, float, float, integer, integer
);

revoke all on function public.search_chatbot_resource_chunks(
    text, vector, float, integer, integer, integer, float, float, integer, integer
) from public, anon;

grant execute on function public.search_chatbot_resource_chunks(
    text, vector, float, integer, integer, integer, float, float, integer, integer
) to authenticated, service_role;