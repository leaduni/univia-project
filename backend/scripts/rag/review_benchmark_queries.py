"""Revisa borradores de benchmark contra su extracto fuente con un modelo barato."""

import argparse
import json
import os
from collections.abc import Callable
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI


def review_cases(
    path: Path,
    judge: Callable[[str], str],
    limit: int,
    model: str = "gpt-4o-mini",
    output_path: Path | None = None,
) -> int:
    output_path = output_path or path
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]
    changed = 0
    for row in rows:
        if changed >= limit or row.get("review_status") != "draft":
            continue
        decision = judge(_prompt(row)).strip().upper()
        row["review_status"] = "ai_approved" if decision.startswith("APPROVE") else "needs_review"
        row["reviewed_by"] = model
        _write_rows(output_path, rows)
        changed += 1
    return changed


def _prompt(row: dict) -> str:
    return (
        "Responde solo APPROVE o REVIEW. APPROVE únicamente si la pregunta se puede responder "
        "de forma directa y correcta usando solo el extracto. REVIEW si es ambigua, inventa datos "
        "o depende de información ausente.\n"
        f"Pregunta: {row['query']}\nExtracto: {row['source']['excerpt']}"
    )


def _write_rows(path: Path, rows: list[dict]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as output:
        for row in rows:
            output.write(json.dumps(row, ensure_ascii=False) + "\n")
    temporary.replace(path)


def main() -> None:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--model", default="gpt-4o-mini")
    parser.add_argument("--output", type=Path, help="Archivo de salida; evita sobrescribir una plantilla abierta.")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if not args.execute:
        print(f"Dry-run: se revisarían hasta {args.limit} borradores. Agrega --execute para llamar a OpenAI.")
        return
    key = os.getenv("OPEN_AI_INGEST_API_KEY")
    if not key:
        raise RuntimeError("OPEN_AI_INGEST_API_KEY no está configurada.")
    client = OpenAI(api_key=key)

    def judge(prompt: str) -> str:
        response = client.chat.completions.create(
            model=args.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=8,
            temperature=0,
        )
        return response.choices[0].message.content or "REVIEW"

    changed = review_cases(args.path, judge, args.limit, args.model, args.output)
    print(f"Casos revisados: {changed}")


if __name__ == "__main__":
    main()
