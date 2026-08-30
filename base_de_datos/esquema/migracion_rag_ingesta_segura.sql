-- Metadatos de Drive y estado idempotente de la ingesta RAG.
alter table public.recursos
    add column if not exists drive_path text,
    add column if not exists drive_modified_time timestamptz,
    add column if not exists rag_status text not null default 'pending',
    add column if not exists rag_processed_modified_time timestamptz,
    add column if not exists rag_processed_at timestamptz;

alter table public.recursos
    drop constraint if exists recursos_rag_status_check;

alter table public.recursos
    add constraint recursos_rag_status_check
    check (rag_status in ('pending', 'processing', 'complete', 'failed'));

create index if not exists idx_resource_chunks_recurso_id
    on public.resource_chunks (recurso_id);

-- Elimina copias exactas preexistentes antes de asignar una posición estable.
with repetidos as (
    select id,
           row_number() over (
               partition by recurso_id, contenido
               order by created_at, id
           ) as numero
    from public.resource_chunks
)
delete from public.resource_chunks rc
using repetidos r
where rc.id = r.id
  and r.numero > 1;

-- Los chunks cuyo curso ya no coincide no deben participar en recuperación.
delete from public.resource_chunks rc
using public.recursos r
where r.id = rc.recurso_id
  and rc.curso_id is distinct from r.curso_id;

alter table public.resource_chunks
    add column if not exists chunk_index integer;

with posiciones as (
    select id,
           row_number() over (
               partition by recurso_id
               order by created_at, id
           ) - 1 as posicion
    from public.resource_chunks
)
update public.resource_chunks rc
set chunk_index = p.posicion
from posiciones p
where p.id = rc.id
  and rc.chunk_index is null;

alter table public.resource_chunks
    alter column chunk_index set not null;

create unique index if not exists uq_resource_chunks_recurso_posicion
    on public.resource_chunks (recurso_id, chunk_index);

-- Reemplaza un recurso completo dentro de una única transacción Postgres.
create or replace function public.replace_resource_chunks(
    p_recurso_id integer,
    p_curso_id integer,
    p_chunks jsonb,
    p_drive_modified_time timestamptz
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
    v_insertados integer;
begin
    if jsonb_typeof(p_chunks) <> 'array' or jsonb_array_length(p_chunks) = 0 then
        raise exception 'p_chunks debe ser un arreglo no vacío';
    end if;

    if not exists (
        select 1
        from public.recursos
        where id = p_recurso_id
          and curso_id = p_curso_id
    ) then
        raise exception 'El recurso % no pertenece al curso %', p_recurso_id, p_curso_id;
    end if;

    delete from public.resource_chunks
    where recurso_id = p_recurso_id;

    insert into public.resource_chunks (
        recurso_id, curso_id, chunk_index, contenido, embedding
    )
    select
        p_recurso_id,
        p_curso_id,
        (item->>'chunk_index')::integer,
        item->>'contenido',
        (item->>'embedding')::vector(1536)
    from jsonb_array_elements(p_chunks) item;

    get diagnostics v_insertados = row_count;

    update public.recursos
    set rag_status = 'complete',
        rag_processed_modified_time = p_drive_modified_time,
        rag_processed_at = now()
    where id = p_recurso_id;

    return v_insertados;
end;
$$;

revoke all on function public.replace_resource_chunks(integer, integer, jsonb, timestamptz)
    from public, anon, authenticated;
grant execute on function public.replace_resource_chunks(integer, integer, jsonb, timestamptz)
    to service_role;
