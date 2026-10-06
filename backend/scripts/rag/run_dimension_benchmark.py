"""Benchmark temporal de dimensiones; no escribe en resource_chunks."""
import argparse, asyncio, json, os, time
from dataclasses import asdict
from pathlib import Path

import asyncpg
from dotenv import load_dotenv
from openai import OpenAI

from app.rag.evaluation.dimension_benchmark import BenchmarkCase, DimensionResult, evaluate_rankings


DEFAULT_DIMENSIONS = (256, 512, 768, 1536)


def vector_literal(vector):
    return "[" + ",".join(format(x, ".8g") for x in vector) + "]"


def load_cases(path):
    rows = [json.loads(line) for line in path.open(encoding="utf-8") if line.strip()]
    return [BenchmarkCase(r["query_id"], r["query"], frozenset(r["relevant_chunk_ids"]))
            for r in rows if r.get("review_status") == "ai_approved"]


def load_checkpoint(path):
    if not path.exists():
        return {"cases": None, "results": []}
    checkpoint = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(checkpoint.get("results"), list):
        raise ValueError(f"Checkpoint inválido: {path}")
    return checkpoint


def save_checkpoint(path, *, cases, results):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps({"cases": cases, "results": results}, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def pending_dimensions(path, requested):
    checkpoint = load_checkpoint(path)
    completed = {result.get("dimensions") for result in checkpoint["results"]}
    return [dimension for dimension in requested if dimension not in completed]


async def benchmark_dimension(dimension, records, cases, client, database_url, batch_size):
    conn = await asyncpg.connect(database_url)
    try:
        await conn.execute(f"CREATE TEMP TABLE benchmark_chunks (id uuid PRIMARY KEY, embedding vector({dimension}) NOT NULL)")
        started = time.perf_counter()
        for offset in range(0, len(records), batch_size):
            batch = records[offset:offset + batch_size]
            response = client.embeddings.create(model="text-embedding-3-small", input=[r["contenido"] for r in batch], dimensions=dimension)
            vectors = [item.embedding for item in sorted(response.data, key=lambda item: item.index)]
            await conn.executemany("INSERT INTO benchmark_chunks (id, embedding) VALUES ($1, $2::vector)",
                                   [(record["id"], vector_literal(vector)) for record, vector in zip(batch, vectors)])
            print(f"  {dimension}: {min(offset + len(batch), len(records))}/{len(records)} chunks", flush=True)
        query_response = client.embeddings.create(model="text-embedding-3-small", input=[c.query for c in cases], dimensions=dimension)
        query_vectors = [item.embedding for item in sorted(query_response.data, key=lambda item: item.index)]
        rankings = {}
        query_started = time.perf_counter()
        for case, vector in zip(cases, query_vectors):
            rows = await conn.fetch("SELECT id::text FROM benchmark_chunks ORDER BY embedding <=> $1::vector LIMIT 10", vector_literal(vector))
            rankings[case.query_id] = [row["id"] for row in rows]
        metrics = evaluate_rankings(cases, rankings)
        elapsed_ms = (time.perf_counter() - started) * 1000
        return DimensionResult(dimension, metrics.recall_at_10, metrics.mrr_at_10, metrics.ndcg_at_10,
                               (time.perf_counter() - query_started) * 1000 / len(cases), dimension * 4), elapsed_ms
    finally:
        await conn.close()


def main():
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--export", type=Path, default=Path("data/rag_exports/resource_chunks.jsonl"))
    parser.add_argument("--cases", type=Path, default=Path("data/rag_exports/benchmark_reviewed.jsonl"))
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--output", type=Path, default=Path("data/rag_exports/dimension_benchmark.json"))
    parser.add_argument("--dimensions", type=int, nargs="+", choices=DEFAULT_DIMENSIONS,
                        default=DEFAULT_DIMENSIONS, help="Dimensiones por medir. Omite las ya guardadas.")
    args = parser.parse_args()
    records = [json.loads(line) for line in args.export.open(encoding="utf-8") if line.strip()]
    cases = load_cases(args.cases)
    if not cases: raise RuntimeError("No hay casos ai_approved.")
    key, url = os.getenv("OPEN_AI_INGEST_API_KEY"), os.getenv("RAG_DATABASE_URL")
    if not key or not url: raise RuntimeError("Faltan OPEN_AI_INGEST_API_KEY o RAG_DATABASE_URL.")
    client = OpenAI(api_key=key)
    checkpoint = load_checkpoint(args.output)
    results = checkpoint["results"]
    dimensions = pending_dimensions(args.output, args.dimensions)
    if not dimensions:
        print("Todas las dimensiones solicitadas ya están guardadas.")
        return
    for dimension in dimensions:
        result, elapsed = asyncio.run(benchmark_dimension(dimension, records, cases, client, url, args.batch_size))
        results.append(asdict(result) | {"total_elapsed_ms": elapsed})
        save_checkpoint(args.output, cases=len(cases), results=results)
        print(f"  {dimension}: Recall@10={result.recall_at_10:.3f}, MRR@10={result.mrr_at_10:.3f}", flush=True)

if __name__ == "__main__": main()
