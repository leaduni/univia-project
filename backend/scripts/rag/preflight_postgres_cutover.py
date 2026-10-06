"""Comprueba PostgreSQL RAG antes de activarlo; no llama a servicios de IA."""

import argparse
import asyncio
import json
import os
from typing import Any

import asyncpg
from dotenv import load_dotenv


async def inspect_database(expected_chunks: int | None) -> dict[str, Any]:
    load_dotenv()
    database_url = os.getenv("RAG_DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("RAG_DATABASE_URL no está configurada.")

    pool = await asyncpg.create_pool(dsn=database_url, min_size=1, max_size=2)
    try:
        async with pool.acquire() as connection:
            extension = await connection.fetchval(
                "SELECT extversion FROM pg_extension WHERE extname = 'vector'"
            )
            relation = await connection.fetchval(
                "SELECT to_regclass('public.resource_chunks')"
            )
            if relation is None:
                raise RuntimeError("No existe public.resource_chunks.")

            count = int(await connection.fetchval("SELECT count(*) FROM public.resource_chunks"))
            contracts = await connection.fetch(
                """
                SELECT DISTINCT embedding_provider, embedding_model,
                                embedding_dimensions, embedding_version
                FROM public.resource_chunks
                LIMIT 2
                """
            )
            probe = await connection.fetchrow(
                "SELECT id, embedding::text AS embedding FROM public.resource_chunks ORDER BY id LIMIT 1"
            )
            vector_hits = []
            if probe is not None:
                vector_hits = await connection.fetch(
                    """
                    SELECT id
                    FROM public.resource_chunks
                    ORDER BY embedding <=> $1::vector
                    LIMIT 3
                    """,
                    probe["embedding"],
                )
            indexes = await connection.fetch(
                """
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE schemaname = 'public' AND tablename = 'resource_chunks'
                """
            )

        index_definitions = {row["indexname"]: row["indexdef"].lower() for row in indexes}
        hnsw_ok = any(
            "using hnsw" in definition and "vector_cosine_ops" in definition
            for definition in index_definitions.values()
        )
        fts_ok = any(
            "using gin" in definition and "to_tsvector" in definition
            for definition in index_definitions.values()
        )
        one_contract = len(contracts) == 1
        contract = contracts[0] if one_contract else None
        dimensions_ok = one_contract and int(contract["embedding_dimensions"]) == 256
        count_ok = count > 0 and (expected_chunks is None or count == expected_chunks)
        vector_search_ok = bool(probe and vector_hits and any(row["id"] == probe["id"] for row in vector_hits))

        checks = {
            "pgvector_installed": {"ok": extension is not None, "version": extension},
            "resource_chunks_present": {"ok": relation is not None},
            "chunk_count": {
                "ok": count_ok,
                "actual": count,
                "expected": expected_chunks,
            },
            "single_embedding_contract": {
                "ok": one_contract,
                "provider": contract["embedding_provider"] if contract else None,
                "model": contract["embedding_model"] if contract else None,
                "dimensions": int(contract["embedding_dimensions"]) if contract else None,
                "version": contract["embedding_version"] if contract else None,
            },
            "dimensions_256": {"ok": dimensions_ok},
            "vector_search_smoke": {
                "ok": vector_search_ok,
                "hits": len(vector_hits),
                "probe_found": bool(probe and any(row["id"] == probe["id"] for row in vector_hits)),
            },
            "hnsw_cosine_index": {"ok": hnsw_ok},
            "spanish_full_text_index": {"ok": fts_ok},
        }
        return {"ok": all(check["ok"] for check in checks.values()), "checks": checks}
    finally:
        await pool.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--expected-chunks",
        type=int,
        default=29909,
        help="Conteo esperado (por defecto: línea base de 29,909 chunks). Usa 0 para omitir.",
    )
    args = parser.parse_args()
    expected_chunks = args.expected_chunks or None

    try:
        report = asyncio.run(inspect_database(expected_chunks))
    except Exception as error:
        report = {
            "ok": False,
            "error_type": type(error).__name__,
            "message": "No se pudo completar el preflight. Revisa PostgreSQL y RAG_DATABASE_URL sin imprimir el DSN.",
        }

    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report.get("ok"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
