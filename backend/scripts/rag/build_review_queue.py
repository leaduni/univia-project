"""Prepara casos pendientes de revisión humana sin llamar a modelos."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

from app.rag.evaluation.dataset import dataset_readiness


def _rows(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as source:
        return [json.loads(line) for line in source if line.strip()]


def build_review_queue(
    export_path: Path,
    prior_path: Path,
    output_path: Path,
    *,
    positives: int,
    negatives: int,
    seed: int,
) -> dict[str, int]:
    """Conserva los casos previos y agrega candidatos distribuidos por curso."""
    if positives < 0 or negatives < 0:
        raise ValueError("positives y negatives deben ser no negativos")
    prior = _rows(prior_path)
    used_chunks = {
        str(row.get("source", {}).get("chunk_id"))
        for row in prior if row.get("source", {}).get("chunk_id")
    }
    used_chunks.update(str(chunk_id) for row in prior for chunk_id in row.get("relevant_chunk_ids", []))
    used_ids = {str(row["query_id"]) for row in prior}
    if len(used_ids) != len(prior):
        raise ValueError("query_id duplicado en los casos previos")

    by_course: dict[int, list[dict]] = defaultdict(list)
    with export_path.open(encoding="utf-8") as source:
        for line in source:
            row = json.loads(line)
            chunk_id = str(row["id"])
            if chunk_id not in used_chunks and str(row.get("contenido") or "").strip():
                by_course[int(row["curso_id"])].append(row)

    def order_key(row: dict) -> str:
        return hashlib.sha256(f"{seed}:{row['id']}".encode()).hexdigest()

    for candidates in by_course.values():
        candidates.sort(key=order_key)
    course_ids = sorted(by_course, key=lambda course_id: hashlib.sha256(
        f"{seed}:curso:{course_id}".encode()
    ).hexdigest())
    selected = []
    position = 0
    while len(selected) < positives:
        found = False
        for course_id in course_ids:
            candidates = by_course[course_id]
            if position < len(candidates):
                selected.append(candidates[position])
                found = True
                if len(selected) == positives:
                    break
        if not found:
            raise ValueError(f"El export solo contiene {len(selected)} chunks nuevos; se pidieron {positives}")
        position += 1

    next_id = 1
    def reserve_id() -> str:
        nonlocal next_id
        while f"manual-{next_id:03d}" in used_ids:
            next_id += 1
        value = f"manual-{next_id:03d}"
        used_ids.add(value)
        next_id += 1
        return value

    queue = list(prior)
    for row in selected:
        queue.append({
            "query_id": reserve_id(), "query": "", "review_status": "pending",
            "reviewed_by": None, "category": None, "split": None,
            "answerable": True, "candidate_chunk_ids": [row["id"]],
            "relevant_chunk_ids": [], "relevant_resource_ids": [],
            "source": {
                "curso_id": row["curso_id"],
                "curso_nombre": row.get("curso_nombre"),
                "recurso_id": row["recurso_id"],
                "titulo_recurso": row.get("titulo_recurso"),
                "chunk_id": row["id"],
                "excerpt": row["contenido"][:600],
            },
        })
    for _ in range(negatives):
        queue.append({
            "query_id": reserve_id(), "query": "", "review_status": "pending",
            "reviewed_by": None, "category": "abierta", "split": None,
            "answerable": False, "candidate_chunk_ids": [],
            "relevant_chunk_ids": [], "relevant_resource_ids": [], "source": {},
        })

    if output_path.resolve() == prior_path.resolve():
        raise ValueError("El archivo de salida debe ser distinto al archivo previo")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as target:
        for row in queue:
            target.write(json.dumps(row, ensure_ascii=False) + "\n")
    return {"existing": len(prior), "new_positive": positives, "new_negative": negatives}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--export", type=Path, default=Path("data/rag_exports/resource_chunks.jsonl"))
    parser.add_argument("--prior", type=Path, default=Path("data/rag_exports/benchmark_reviewed.jsonl"))
    parser.add_argument("--output", type=Path, default=Path("data/rag_exports/benchmark_review_queue.jsonl"))
    parser.add_argument("--positives", type=int, default=75)
    parser.add_argument("--negatives", type=int, default=15)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    result = build_review_queue(
        args.export, args.prior, args.output,
        positives=args.positives, negatives=args.negatives, seed=args.seed,
    )
    print(f"Cola: {args.output} | {result}")
    print(f"Estado: {dataset_readiness(_rows(args.output))}")


if __name__ == "__main__":
    main()
