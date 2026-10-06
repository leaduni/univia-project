"""Revectoriza el export validado y lo inserta en PostgreSQL local con checkpoint por recurso.

No activa RAG_STORE=postgres ni modifica Supabase. Si se interrumpe, el siguiente
inicio salta los recursos confirmados y vuelve a reemplazar de forma segura el
recurso que quedó a medias.
"""

import argparse
import asyncio
import hashlib
import json
import os
from collections import defaultdict
from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path
from typing import Any
from uuid import UUID

import asyncpg
from dotenv import load_dotenv
from openai import OpenAI

from app.rag.storage.models import EmbeddedChunk, ResourceSnapshot
from app.rag.storage.postgres import PostgresChunkStore


DEFAULT_DIMENSIONS = 256
DEFAULT_MODEL = "text-embedding-3-small"
RESOURCE_FIELDS = (
    "curso_id",
    "curso_nombre",
    "titulo_recurso",
    "tipo_recurso",
    "profesor_id",
    "profesor_nombre",
    "ciclo_recurso",
    "year_recurso",
)


def group_records_by_resource(records: Iterable[Mapping[str, Any]]) -> dict[int, list[dict[str, Any]]]:
    """Agrupa el export y valida la identidad estable de cada recurso."""
    grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        required = ("id", "recurso_id", "curso_id", "chunk_index", "contenido")
        missing = [field for field in required if field not in record]
        if missing:
            raise ValueError(f"Chunk incompleto; faltan: {', '.join(missing)}")
        grouped[int(record["recurso_id"])].append(dict(record))

    for recurso_id, chunks in grouped.items():
        chunks.sort(key=lambda chunk: int(chunk["chunk_index"]))
        positions = [int(chunk["chunk_index"]) for chunk in chunks]
        if len(positions) != len(set(positions)):
            raise ValueError(f"El recurso {recurso_id} tiene chunk_index duplicados.")
        for field in RESOURCE_FIELDS:
            values = {chunk.get(field) for chunk in chunks}
            if len(values) > 1:
                raise ValueError(f"El recurso {recurso_id} tiene {field} inconsistente.")

    return dict(sorted(grouped.items()))


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"completed_resource_ids": [], "imported_chunks": 0}
    state = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(state.get("completed_resource_ids"), list):
        raise ValueError(f"Checkpoint inválido: {path}")
    return state


def save_state(path: Path, *, completed_resource_ids: set[int], imported_chunks: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(
            {
                "completed_resource_ids": sorted(completed_resource_ids),
                "imported_chunks": imported_chunks,
            },
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def pending_resource_ids(resource_ids: Sequence[int], state_path: Path) -> list[int]:
    completed = {int(resource_id) for resource_id in load_state(state_path)["completed_resource_ids"]}
    return [resource_id for resource_id in resource_ids if resource_id not in completed]


def resource_is_current(row: Mapping[str, Any] | None, *, expected_chunks: int) -> bool:
    return bool(
        row
        and int(row["chunk_count"]) == expected_chunks
        and row["hash_ok"]
        and row["dimensions_ok"]
    )


async def resource_is_current_in_database(
    pool: asyncpg.Pool, snapshot: ResourceSnapshot, *, expected_chunks: int
) -> bool:
    async with pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            SELECT count(*)::integer AS chunk_count,
                   bool_and(content_hash = $2) AS hash_ok,
                   bool_and(embedding_dimensions = $3 AND vector_dims(embedding) = $3) AS dimensions_ok
            FROM resource_chunks
            WHERE recurso_id = $1
            """,
            snapshot.recurso_id,
            snapshot.content_hash,
            snapshot.embedding_dimensions,
        )
    return resource_is_current(row, expected_chunks=expected_chunks)


def _content_hash(chunks: Sequence[Mapping[str, Any]]) -> str:
    digest = hashlib.sha256()
    for chunk in chunks:
        digest.update(str(chunk["chunk_index"]).encode("utf-8"))
        digest.update(b"\0")
        digest.update(str(chunk["contenido"]).encode("utf-8"))
        digest.update(b"\0")
    return digest.hexdigest()


def _snapshot(chunks: Sequence[Mapping[str, Any]], *, dimensions: int, model: str, version: str) -> ResourceSnapshot:
    first = chunks[0]
    return ResourceSnapshot(
        recurso_id=int(first["recurso_id"]),
        curso_id=int(first["curso_id"]),
        content_hash=_content_hash(chunks),
        embedding_provider="openai",
        embedding_model=model,
        embedding_dimensions=dimensions,
        embedding_version=version,
        curso_nombre=first.get("curso_nombre"),
        titulo_recurso=first.get("titulo_recurso"),
        tipo_recurso=first.get("tipo_recurso"),
        profesor_id=first.get("profesor_id"),
        profesor_nombre=first.get("profesor_nombre"),
        ciclo_recurso=first.get("ciclo_recurso"),
        year_recurso=first.get("year_recurso"),
    )


def _embed_chunks(
    client: OpenAI, chunks: Sequence[Mapping[str, Any]], *, model: str, dimensions: int, batch_size: int
) -> list[EmbeddedChunk]:
    embedded: list[EmbeddedChunk] = []
    for offset in range(0, len(chunks), batch_size):
        batch = chunks[offset : offset + batch_size]
        response = client.embeddings.create(
            model=model,
            input=[str(chunk["contenido"]) for chunk in batch],
            dimensions=dimensions,
        )
        vectors = [item.embedding for item in sorted(response.data, key=lambda item: item.index)]
        if len(vectors) != len(batch) or any(len(vector) != dimensions for vector in vectors):
            raise RuntimeError("OpenAI devolvió embeddings incompletos o con dimensión incorrecta.")
        embedded.extend(
            EmbeddedChunk(
                id=UUID(str(chunk["id"])),
                chunk_index=int(chunk["chunk_index"]),
                contenido=str(chunk["contenido"]),
                embedding=vector,
                metadata=chunk.get("metadata") or {},
            )
            for chunk, vector in zip(batch, vectors)
        )
    return embedded


async def import_resources(
    *, grouped: Mapping[int, Sequence[Mapping[str, Any]]], pending_ids: Sequence[int], database_url: str,
    api_key: str, dimensions: int, model: str, version: str, batch_size: int, state_path: Path,
) -> None:
    pool = await asyncpg.create_pool(database_url, min_size=1, max_size=1)
    store = PostgresChunkStore(pool, expected_dimensions=dimensions)
    client = OpenAI(api_key=api_key, timeout=60.0, max_retries=3)
    state = load_state(state_path)
    completed = {int(resource_id) for resource_id in state["completed_resource_ids"]}
    imported_chunks = int(state.get("imported_chunks", 0))
    try:
        for position, recurso_id in enumerate(pending_ids, start=1):
            chunks = grouped[recurso_id]
            snapshot = _snapshot(chunks, dimensions=dimensions, model=model, version=version)
            if await resource_is_current_in_database(pool, snapshot, expected_chunks=len(chunks)):
                completed.add(recurso_id)
                imported_chunks += len(chunks)
                save_state(state_path, completed_resource_ids=completed, imported_chunks=imported_chunks)
                print(f"{position}/{len(pending_ids)} recursos | recurso ya confirmado", flush=True)
                continue
            embeddings = _embed_chunks(client, chunks, model=model, dimensions=dimensions, batch_size=batch_size)
            inserted = await store.replace_resource_chunks(snapshot, embeddings)
            if inserted != len(chunks):
                raise RuntimeError(f"El recurso {recurso_id} insertó {inserted}/{len(chunks)} chunks.")
            completed.add(recurso_id)
            imported_chunks += inserted
            save_state(state_path, completed_resource_ids=completed, imported_chunks=imported_chunks)
            print(f"{position}/{len(pending_ids)} recursos | {imported_chunks} chunks confirmados", flush=True)
    finally:
        await pool.close()


def main() -> None:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--export", type=Path, default=Path("data/rag_exports/resource_chunks.jsonl"))
    parser.add_argument("--state", type=Path, default=Path("data/rag_exports/resource_chunks.import-state.json"))
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--limit-resources", type=int)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.batch_size < 1:
        raise ValueError("--batch-size debe ser mayor que cero.")

    records = [json.loads(line) for line in args.export.open(encoding="utf-8") if line.strip()]
    grouped = group_records_by_resource(records)
    pending_ids = pending_resource_ids(list(grouped), args.state)
    if args.limit_resources is not None:
        pending_ids = pending_ids[: args.limit_resources]
    pending_chunks = sum(len(grouped[resource_id]) for resource_id in pending_ids)
    print(f"Pendientes: {len(pending_ids)} recursos, {pending_chunks} chunks.")
    if args.dry_run:
        return

    api_key = os.getenv("OPEN_AI_INGEST_API_KEY")
    database_url = os.getenv("RAG_DATABASE_URL")
    if not api_key or not database_url:
        raise RuntimeError("Faltan OPEN_AI_INGEST_API_KEY o RAG_DATABASE_URL.")
    version = os.getenv("EMBEDDINGS_VERSION", "mrl-256-v1")
    asyncio.run(
        import_resources(
            grouped=grouped,
            pending_ids=pending_ids,
            database_url=database_url,
            api_key=api_key,
            dimensions=DEFAULT_DIMENSIONS,
            model=DEFAULT_MODEL,
            version=version,
            batch_size=args.batch_size,
            state_path=args.state,
        )
    )


if __name__ == "__main__":
    main()
