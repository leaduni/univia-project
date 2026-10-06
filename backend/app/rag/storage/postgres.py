"""Adaptador asyncpg para el corpus RAG local con pgvector."""

import json
import math
import re
from collections.abc import Sequence
from typing import Any

import asyncpg

from app.rag.storage.base import ChunkStore
from app.rag.storage.models import (
    EmbeddedChunk,
    EmbeddingContract,
    ResourceSnapshot,
    RetrievalCandidate,
    RetrievalQuery,
)

_AFFECTED_ROWS = re.compile(r"\d+$")


class PostgresChunkStore(ChunkStore):
    def __init__(self, pool: asyncpg.Pool, expected_dimensions: int = 256) -> None:
        self._pool = pool
        self._expected_dimensions = expected_dimensions

    async def replace_resource_chunks(
        self, resource: ResourceSnapshot, chunks: Sequence[EmbeddedChunk]
    ) -> int:
        self._validate(resource, chunks)
        rows = [self._insert_row(resource, chunk) for chunk in chunks]

        async with self._pool.acquire() as connection:
            async with connection.transaction():
                await connection.execute(
                    "DELETE FROM resource_chunks WHERE recurso_id = $1", resource.recurso_id
                )
                await connection.executemany(_INSERT_CHUNK_SQL, rows)
        return len(rows)

    async def delete_resource_chunks(self, recurso_id: int) -> int:
        async with self._pool.acquire() as connection:
            status = await connection.execute(
                "DELETE FROM resource_chunks WHERE recurso_id = $1", recurso_id
            )
        match = _AFFECTED_ROWS.search(status)
        return int(match.group(0)) if match else 0

    async def count_resource_chunks(self) -> int:
        async with self._pool.acquire() as connection:
            return int(await connection.fetchval("SELECT count(*) FROM resource_chunks"))

    async def get_embedding_contract(self) -> EmbeddingContract | None:
        async with self._pool.acquire() as connection:
            rows = await connection.fetch(
                """
                SELECT DISTINCT embedding_provider, embedding_model,
                                embedding_dimensions, embedding_version
                FROM resource_chunks
                LIMIT 2
                """
            )
        if not rows:
            return None
        if len(rows) != 1:
            raise ValueError("resource_chunks contiene contratos de embeddings mezclados.")
        row = rows[0]
        return EmbeddingContract(
            provider=row["embedding_provider"],
            model=row["embedding_model"],
            dimensions=row["embedding_dimensions"],
            version=row["embedding_version"],
        )

    async def search(self, query: RetrievalQuery) -> list[RetrievalCandidate]:
        self._validate_embedding(query.query_embedding)
        if not 0 <= query.min_similarity <= 1:
            raise ValueError("min_similarity debe estar entre 0 y 1.")

        async with self._pool.acquire() as connection:
            async with connection.transaction():
                # HNSW filters after its initial candidate scan. Continue scanning
                # until filtered searches fill their limit, without changing pool settings.
                await connection.execute("SET LOCAL hnsw.iterative_scan = 'strict_order'")
                rows = await connection.fetch(
                    _SEARCH_SQL,
                    _vector_literal(query.query_embedding),
                    query.curso_id,
                    query.curso_nombre,
                    query.profesor_id,
                    query.min_similarity,
                    max(1, min(query.limit, 100)),
                    query.recurso_id,
                )
        return [_candidate_from_row(row) for row in rows]

    async def healthcheck(self) -> bool:
        try:
            async with self._pool.acquire() as connection:
                return await connection.fetchval("SELECT 1") == 1
        except Exception:
            return False

    def _validate(self, resource: ResourceSnapshot, chunks: Sequence[EmbeddedChunk]) -> None:
        if not chunks:
            raise ValueError("No se encontraron chunks para reemplazar.")
        if resource.embedding_dimensions != self._expected_dimensions:
            raise ValueError(
                f"El recurso declara {resource.embedding_dimensions} dimensiones; "
                f"se esperaban {self._expected_dimensions}."
            )
        indexes = [chunk.chunk_index for chunk in chunks]
        if len(indexes) != len(set(indexes)):
            raise ValueError("Cada chunk debe tener un chunk_index único.")
        for chunk in chunks:
            self._validate_embedding(chunk.embedding)

    def _validate_embedding(self, embedding: Sequence[float]) -> None:
        if len(embedding) != self._expected_dimensions:
            raise ValueError(
                f"Embedding con {len(embedding)} dimensiones; "
                f"se esperaban {self._expected_dimensions}."
            )
        if not all(math.isfinite(value) for value in embedding):
            raise ValueError("El embedding contiene valores no finitos.")

    @staticmethod
    def _insert_row(resource: ResourceSnapshot, chunk: EmbeddedChunk) -> tuple[Any, ...]:
        return (
            chunk.id,
            resource.recurso_id,
            resource.curso_id,
            chunk.chunk_index,
            chunk.contenido,
            _vector_literal(chunk.embedding),
            json.dumps(dict(chunk.metadata)),
            resource.curso_nombre,
            resource.titulo_recurso,
            resource.tipo_recurso,
            resource.profesor_id,
            resource.profesor_nombre,
            resource.ciclo_recurso,
            resource.year_recurso,
            resource.content_hash,
            resource.embedding_provider,
            resource.embedding_model,
            resource.embedding_dimensions,
            resource.embedding_version,
        )


def _vector_literal(embedding: Sequence[float]) -> str:
    return "[" + ",".join(format(float(value), ".9g") for value in embedding) + "]"


def _candidate_from_row(row: asyncpg.Record) -> RetrievalCandidate:
    metadata = row["metadata"]
    if isinstance(metadata, str):
        metadata = json.loads(metadata)
    return RetrievalCandidate(
        id=row["id"],
        recurso_id=row["recurso_id"],
        curso_id=row["curso_id"],
        chunk_index=row["chunk_index"],
        contenido=row["contenido"],
        similarity=float(row["similarity"]),
        metadata=metadata or {},
        curso_nombre=row["curso_nombre"],
        titulo_recurso=row["titulo_recurso"],
        tipo_recurso=row["tipo_recurso"],
        profesor_id=row["profesor_id"],
        profesor_nombre=row["profesor_nombre"],
        ciclo_recurso=row["ciclo_recurso"],
        year_recurso=row["year_recurso"],
    )


_INSERT_CHUNK_SQL = """
    INSERT INTO resource_chunks (
        id, recurso_id, curso_id, chunk_index, contenido, embedding, metadata,
        curso_nombre, titulo_recurso, tipo_recurso, profesor_id, profesor_nombre,
        ciclo_recurso, year_recurso, content_hash, embedding_provider,
        embedding_model, embedding_dimensions, embedding_version
    ) VALUES (
        $1, $2, $3, $4, $5, $6::vector, $7::jsonb,
        $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
    )
"""

_SEARCH_SQL = """
    WITH nearest AS (
        SELECT
            id, recurso_id, curso_id, chunk_index, contenido, metadata,
            curso_nombre, titulo_recurso, tipo_recurso, profesor_id,
            COALESCE(NULLIF(btrim(rc.profesor_nombre), ''), (
                SELECT string_agg(DISTINCT cp.profesor_nombre, '; ' ORDER BY cp.profesor_nombre)
                FROM rag_course_professors cp
                WHERE cp.curso_id = rc.curso_id
            )) AS profesor_nombre,
            ciclo_recurso, year_recurso,
            1 - (embedding <=> $1::vector) AS similarity
        FROM resource_chunks rc
        WHERE ($2::integer IS NULL OR curso_id = $2)
          AND ($3::text IS NULL OR lower(curso_nombre) = lower($3))
          AND ($4::integer IS NULL OR EXISTS (
              SELECT 1 FROM rag_course_professors cp
              WHERE cp.curso_id = rc.curso_id AND cp.profesor_id = $4
          ))
          AND ($7::integer IS NULL OR recurso_id = $7)
        ORDER BY embedding <=> $1::vector
        LIMIT $6
    )
    SELECT * FROM nearest
    WHERE similarity >= $5
"""
