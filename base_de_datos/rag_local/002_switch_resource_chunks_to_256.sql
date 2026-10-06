-- Ejecutar solo sobre la base local RAG antes de la revectorización final.
-- La migración aborta si existen vectores: no recorta embeddings de 512 dimensiones.
BEGIN;

LOCK TABLE resource_chunks IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM resource_chunks) THEN
        RAISE EXCEPTION
            'resource_chunks contiene datos. Vacía o recrea la base local antes de migrar a vector(256).';
    END IF;
END $$;

ALTER TABLE resource_chunks
    DROP CONSTRAINT IF EXISTS chk_embedding_dimensions;

ALTER TABLE resource_chunks
    ALTER COLUMN embedding TYPE vector(256) USING embedding::vector(256),
    ALTER COLUMN embedding_dimensions SET DEFAULT 256;

ALTER TABLE resource_chunks
    ADD CONSTRAINT chk_embedding_dimensions CHECK (embedding_dimensions = 256);

COMMIT;
