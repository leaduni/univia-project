"""Genera borradores baratos de consultas para revisar antes del benchmark.

No modifica bases de datos. Solo actualiza una plantilla JSONL y marca cada
consulta como `draft`; una persona debe revisarla y cambiarla a `approved`.
"""

import argparse
import json
import os
from collections.abc import Callable
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI


def draft_queries(path: Path, generate: Callable[[str], str], limit: int) -> int:
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]
    changed = 0
    for row in rows:
        if changed >= limit:
            break
        if row.get("review_status") != "pending" or row.get("query", "").strip():
            continue
        question = generate(_prompt(row)).strip().replace("\n", " ")
        if not question:
            raise RuntimeError(f"El modelo devolvió una consulta vacía para {row['query_id']}.")
        row["query"] = question
        row["review_status"] = "draft"
        _write_rows(path, rows)
        changed += 1
    return changed


def _prompt(row: dict) -> str:
    source = row["source"]
    return (
        "Escribe una sola pregunta académica concreta en español, máximo 25 palabras. "
        "Debe poder responderse solo con el extracto. No menciones el documento ni inventes datos. "
        f"Curso: {source.get('curso_nombre') or 'sin nombre'}. "
        f"Título: {source.get('titulo_recurso') or 'sin título'}. "
        f"Extracto:\n{source['excerpt']}"
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
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.limit < 1:
        parser.error("--limit debe ser mayor que cero.")
    if not args.execute:
        print(f"Dry-run: se generarían hasta {args.limit} borradores. Agrega --execute para llamar a OpenAI.")
        return
    api_key = os.getenv("OPEN_AI_INGEST_API_KEY")
    if not api_key:
        raise RuntimeError("OPEN_AI_INGEST_API_KEY no está configurada.")
    client = OpenAI(api_key=api_key)

    def generate(prompt: str) -> str:
        response = client.chat.completions.create(
            model=args.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=80,
            temperature=0.2,
        )
        return response.choices[0].message.content or ""

    changed = draft_queries(args.path, generate, args.limit)
    print(f"Borradores generados: {changed}")
    print("Revisa cada línea y cambia review_status a approved antes del benchmark.")


if __name__ == "__main__":
    main()
