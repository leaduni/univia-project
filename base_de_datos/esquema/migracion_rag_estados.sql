-- Amplía los estados disponibles para la ingesta RAG.
alter table public.recursos
    drop constraint if exists recursos_rag_status_check;

alter table public.recursos
    add constraint recursos_rag_status_check
    check (
        rag_status in (
            'pending',
            'processing',
            'complete',
            'failed',
            'network_error',
            'skipped_permissions',
            'permission_denied'
        )
    );

-- Reemplaza los chunks del primer lote sin marcar el recurso como completo.
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

    return v_insertados;
end;
$$;

create or replace function public.mark_rag_complete(
    p_recurso_id integer,
    p_drive_modified_time timestamptz
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
    update public.recursos
    set rag_status = 'complete',
        rag_processed_at = now(),
        rag_processed_modified_time = p_drive_modified_time
    where id = p_recurso_id;
end;
$$;

revoke all on function public.mark_rag_complete(integer, timestamptz)
    from public;
grant execute on function public.mark_rag_complete(integer, timestamptz)
    to service_role;
