"""Valida integridad del JSONL exportado para la migración RAG."""

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from scripts.rag.export_chunks_from_supabase import manifest_path_for


@dataclass(frozen=True, slots=True)
class ValidationResult:
    valid: bool
    record_count: int
    errors: list[str]


def validate_export(output_path: Path) -> ValidationResult:
    errors: list[str] = []
    ids: set[str] = set()
    positions: set[tuple[int, int]] = set()
    required = {"id", "recurso_id", "curso_id", "chunk_index", "contenido", "metadata"}
    count = 0

    with output_path.open(encoding="utf-8") as output:
        for line_number, line in enumerate(output, start=1):
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                errors.append(f"Línea {line_number}: JSON inválido.")
                continue
            count += 1
            missing = sorted(required - row.keys())
            if missing:
                errors.append(f"Línea {line_number}: faltan {', '.join(missing)}.")
            if "embedding" in row:
                errors.append(f"Línea {line_number}: contiene embedding prohibido.")
            if row.get("id") in ids:
                errors.append(f"Línea {line_number}: id duplicado {row['id']}.")
            ids.add(row.get("id"))
            position = (row.get("recurso_id"), row.get("chunk_index"))
            if position in positions:
                errors.append(f"Línea {line_number}: recurso_id, chunk_index duplicados: {position}.")
            positions.add(position)

    manifest_path = manifest_path_for(output_path)
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("status") != "complete":
            errors.append("El manifiesto no marca el export como completo.")
        if manifest.get("exported_count") != count:
            errors.append("El conteo del manifiesto no coincide con el JSONL.")
        if manifest.get("source_count") != count:
            errors.append("El conteo de origen no coincide con el JSONL.")
        if manifest.get("sha256") != _sha256(output_path):
            errors.append("El SHA-256 del manifiesto no coincide con el JSONL.")

    return ValidationResult(not errors, count, errors)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    args = parser.parse_args()
    result = validate_export(args.path)
    print(f"Registros: {result.record_count}")
    if result.valid:
        print("VALIDACIÓN OK")
        return
    for error in result.errors:
        print(f"ERROR: {error}")
    raise SystemExit(1)


if __name__ == "__main__":
    main()
