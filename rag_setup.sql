-- 1. Activar la extensión pgvector en PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear una nueva tabla llamada "resource_chunks"
CREATE TABLE IF NOT EXISTS public.resource_chunks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recurso_id integer NOT NULL, -- Corregido: tipo original es integer
    curso_id integer NOT NULL,   -- Corregido: tipo original es integer
    contenido text NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- 3. Asegurar relaciones correctas con recursos y cursos
    CONSTRAINT fk_recurso
        FOREIGN KEY (recurso_id)
        REFERENCES public.recursos (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_curso
        FOREIGN KEY (curso_id)
        REFERENCES public.cursos (id)
        ON DELETE CASCADE
);

-- 4. Crear un índice vectorial para optimizar similarity search
-- HNSW es el estándar actual recomendado por su excelente balance de velocidad y precisión.
-- Usamos 'vector_cosine_ops' porque los embeddings (ej. OpenAI text-embedding-ada-002 o text-embedding-3-small) usan similitud coseno.
CREATE INDEX IF NOT EXISTS resource_chunks_embedding_idx 
ON public.resource_chunks 
USING hnsw (embedding vector_cosine_ops);

-- Privilegios y Seguridad (RLS) - Recomendado en Supabase
ALTER TABLE public.resource_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura autenticada resource_chunks" 
ON public.resource_chunks
FOR SELECT TO authenticated
USING (true);

-- 5. Mostrar ejemplo de inserción de un chunk con embedding
/*
INSERT INTO public.resource_chunks (
    recurso_id, 
    curso_id, 
    contenido, 
    embedding, 
    metadata
) VALUES (
    1, -- Asumiendo que recurso_id 1 existe en recursos
    2, -- Asumiendo que curso_id 2 existe en cursos
    'El RAG (Retrieval-Augmented Generation) es una técnica que...',
    '[0.015, -0.022, 0.003, ...]',  -- Array real de 1536 dimensiones
    '{"pagina": 5, "tema": "Introducción a IA", "tipo": "pdf"}'::jsonb
);
*/

-- 6. Mostrar consulta SQL de búsqueda semántica (Para usar desde el cliente o backend directamente)
/*
-- El operador <-> calcula la distancia Euclidiana. 
-- El operador <=> calcula la distancia Coseno (recomendado para OpenAI).
-- Note que ORDER BY ASC en distancia = DESC en similitud.

SELECT 
    id,
    recurso_id,
    curso_id,
    contenido,
    metadata,
    1 - (embedding <=> '[0.015, -0.022, 0.003, ...]') AS similarity
FROM public.resource_chunks
-- WHERE curso_id = 2 -- Filtrar por curso mejora dramáticamente los resultados
ORDER BY embedding <=> '[0.015, -0.022, 0.003, ...]'
LIMIT 5;
*/

-- Extra: Función PL/pgSQL recomendada para usar en Supabase RPC
-- Podrás llamarla desde el cliente de supabase JS/Python como:
-- supabase.rpc('search_resource_chunks', { query_embedding: [...], match_threshold: 0.7, match_count: 5, filter_curso_id: 2 })
CREATE OR REPLACE FUNCTION search_resource_chunks(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_curso_id integer DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    recurso_id integer,
    curso_id integer,
    contenido text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rc.id,
        rc.recurso_id,
        rc.curso_id,
        rc.contenido,
        rc.metadata,
        1 - (rc.embedding <=> query_embedding) AS similarity
    FROM resource_chunks rc
    WHERE (filter_curso_id IS NULL OR rc.curso_id = filter_curso_id)
      AND 1 - (rc.embedding <=> query_embedding) > match_threshold
    ORDER BY rc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
