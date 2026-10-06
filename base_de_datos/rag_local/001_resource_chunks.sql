CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS resource_chunks (
    id uuid PRIMARY KEY,
    recurso_id integer NOT NULL,
    curso_id integer NOT NULL,
    chunk_index integer NOT NULL,
    contenido text NOT NULL,
    embedding vector(256) NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

    curso_nombre text,
    titulo_recurso text,
    tipo_recurso text,
    profesor_id integer,
    profesor_nombre text,
    ciclo_recurso integer,
    year_recurso integer,

    content_hash text NOT NULL,
    embedding_provider text NOT NULL,
    embedding_model text NOT NULL,
    embedding_dimensions smallint NOT NULL DEFAULT 256,
    embedding_version text NOT NULL DEFAULT 'v2',

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_resource_chunks_recurso_posicion
        UNIQUE (recurso_id, chunk_index),

    CONSTRAINT chk_embedding_dimensions
        CHECK (embedding_dimensions = 256)
);

CREATE INDEX IF NOT EXISTS idx_resource_chunks_recurso_id
    ON resource_chunks (recurso_id);

CREATE INDEX IF NOT EXISTS idx_resource_chunks_curso_id
    ON resource_chunks (curso_id);

CREATE INDEX IF NOT EXISTS idx_resource_chunks_profesor_id
    ON resource_chunks (profesor_id);

CREATE INDEX IF NOT EXISTS idx_resource_chunks_curso_nombre
    ON resource_chunks (lower(curso_nombre));

CREATE INDEX IF NOT EXISTS idx_resource_chunks_contenido_fts
    ON resource_chunks
    USING gin (to_tsvector('spanish', contenido));
