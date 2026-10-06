"""Audita cobertura y etiquetas humanas del benchmark RAG."""

import argparse
import json
from pathlib import Path

from app.rag.evaluation.dataset import dataset_readiness


def audit_dataset(path: Path) -> dict:
    with path.open(encoding="utf-8") as source:
        rows = [json.loads(line) for line in source if line.strip()]
    return dataset_readiness(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, nargs="?", default=Path("data/rag_exports/benchmark_review_queue.jsonl"))
    args = parser.parse_args()
    report = audit_dataset(args.path)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
