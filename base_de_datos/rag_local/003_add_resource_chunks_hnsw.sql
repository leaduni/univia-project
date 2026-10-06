-- Ejecutar después de cargar el corpus completo.
CREATE INDEX IF NOT EXISTS resource_chunks_embedding_hnsw_idx
    ON resource_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

ANALYZE resource_chunks;
