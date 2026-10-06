"""Crea una plantilla de evaluación manual desde el export JSONL.

La plantilla no llama a APIs. Cada fila requiere que alguien redacte la
consulta y confirme si el chunk listado responde la consulta.
"""

import argparse
import json
import random
from collections import defaultdict
from pathlib import Path
from typing import Any


def create_sample(input_path: Path, output_path: Path, limit: int, seed: int) -> int:
    by_course: dict[int, list[dict[str, Any]]] = defaultdict(list)
    with input_path.open(encoding="utf-8") as source:
        for line in source:
            row = json.loads(line)
            if row.get("contenido", "").strip():
                by_course[row["curso_id"]].append(row)

    randomizer = random.Random(seed)
    candidates = []
    for course_id in sorted(by_course):
        candidates.append(randomizer.choice(by_course[course_id]))
    randomizer.shuffle(candidates)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as output:
        for index, row in enumerate(candidates[:limit], start=1):
            record = {
                "query_id": f"manual-{index:03d}",
                "query": "",
                "relevant_chunk_ids": [row["id"]],
                "review_status": "pending",
                "source": {
                    "curso_id": row["curso_id"],
                    "curso_nombre": row.get("curso_nombre"),
                    "recurso_id": row["recurso_id"],
                    "titulo_recurso": row.get("titulo_recurso"),
                    "chunk_id": row["id"],
                    "excerpt": row["contenido"][:600],
                },
            }
            output.write(json.dumps(record, ensure_ascii=False) + "\n")
    return min(len(candidates), limit)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("data/rag_exports/benchmark_template.jsonl"))
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    if args.limit < 1:
        parser.error("--limit debe ser mayor que cero.")
    count = create_sample(args.input, args.output, args.limit, args.seed)
    print(f"Plantilla creada: {count} casos en {args.output}")


if __name__ == "__main__":
    main()
