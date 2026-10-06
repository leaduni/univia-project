"""Course-professor filtering must work even when resource tags are absent."""

import os

import asyncpg
import pytest

from app.rag.storage.models import RetrievalQuery
from app.rag.storage.postgres import PostgresChunkStore
from scripts.rag.sync_course_professors import apply_snapshot


pytestmark = pytest.mark.skipif(
    not os.getenv("RAG_DATABASE_URL"), reason="RAG_DATABASE_URL is required."
)


@pytest.mark.asyncio
async def test_course_27_professor_62_recovers_untagged_chunks_and_preserves_all_names():
    pool = await asyncpg.create_pool(os.environ["RAG_DATABASE_URL"], min_size=1, max_size=1)
    try:
        async with pool.acquire() as connection:
            await connection.execute(
                "CREATE TEMP TABLE resource_chunks "
                "(LIKE public.resource_chunks INCLUDING DEFAULTS)"
            )
            await connection.execute(
                "CREATE TEMP TABLE rag_course_professors "
                "(curso_id integer, profesor_id integer, profesor_nombre text)"
            )
            await connection.execute(
                "INSERT INTO rag_course_professors VALUES "
                "(27, 62, 'Docente A'), (27, 63, 'Docente B'), (28, 64, 'Docente C')"
            )
            vector = "[" + ",".join(["1"] + ["0"] * 255) + "]"
            await connection.execute(
                """
                INSERT INTO resource_chunks (
                    id, recurso_id, curso_id, chunk_index, contenido, embedding,
                    content_hash, embedding_provider, embedding_model,
                    embedding_dimensions, embedding_version
                ) VALUES
                    (gen_random_uuid(), 1, 27, 0, 'untagged chunk', $1::vector,
                     'test', 'test', 'test', 256, 'test'),
                    (gen_random_uuid(), 2, 28, 0, 'other course', $1::vector,
                     'test', 'test', 'test', 256, 'test')
                """,
                vector,
            )

        store = PostgresChunkStore(pool)
        query_vector = [1.0] + [0.0] * 255
        rows = await store.search(RetrievalQuery(
            query_embedding=query_vector, curso_id=27, profesor_id=62,
            limit=10, min_similarity=0,
        ))
        assert [row.recurso_id for row in rows] == [1]
        assert rows[0].profesor_id is None
        assert rows[0].profesor_nombre == "Docente A; Docente B"
        assert await store.search(RetrievalQuery(
            query_embedding=query_vector, curso_id=27, profesor_id=64,
            limit=10, min_similarity=0,
        )) == []

        async with pool.acquire() as connection:
            await connection.execute(
                "UPDATE resource_chunks SET profesor_nombre='Etiqueta explícita' WHERE curso_id=27"
            )
        rows = await store.search(RetrievalQuery(
            query_embedding=query_vector, profesor_id=62, limit=10, min_similarity=0,
        ))
        assert [row.recurso_id for row in rows] == [1]
        assert rows[0].profesor_nombre == "Etiqueta explícita"
    finally:
        async with pool.acquire() as connection:
            await connection.execute("DROP TABLE IF EXISTS pg_temp.resource_chunks")
            await connection.execute("DROP TABLE IF EXISTS pg_temp.rag_course_professors")
        await pool.close()


@pytest.mark.asyncio
async def test_snapshot_sync_is_idempotent_and_rolls_back_invalid_stage():
    connection = await asyncpg.connect(os.environ["RAG_DATABASE_URL"])
    try:
        await connection.execute("CREATE TEMP TABLE resource_chunks (curso_id integer)")
        await connection.execute("INSERT INTO resource_chunks VALUES (27), (28)")
        await connection.execute(
            "CREATE TEMP TABLE rag_course_professors "
            "(curso_id integer, profesor_id integer, profesor_nombre text, "
            "synced_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(curso_id, profesor_id))"
        )
        await connection.execute(
            "INSERT INTO rag_course_professors (curso_id, profesor_id, profesor_nombre) "
            "VALUES (27, 99, 'Obsoleto'), (99, 1, 'Fuera del scope')"
        )
        snapshot = ((27, 62, "Docente A"), (27, 63, "Docente B"), (28, 64, "Docente C"))
        assert await apply_snapshot(connection, snapshot, [27, 28]) == 3
        before = await connection.fetch("SELECT * FROM rag_course_professors ORDER BY curso_id, profesor_id")
        assert [(row["curso_id"], row["profesor_id"]) for row in before] == [
            (27, 62), (27, 63), (28, 64), (99, 1),
        ]
        assert await apply_snapshot(connection, snapshot, [27, 28]) == 3
        assert await connection.fetch("SELECT * FROM rag_course_professors ORDER BY curso_id, profesor_id") == before
        with pytest.raises(asyncpg.UniqueViolationError):
            await apply_snapshot(connection, [snapshot[0], snapshot[0]], [27, 28])
        assert await connection.fetch("SELECT * FROM rag_course_professors ORDER BY curso_id, profesor_id") == before
    finally:
        await connection.close()
