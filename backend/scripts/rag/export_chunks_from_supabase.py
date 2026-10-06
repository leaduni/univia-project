"""Exporta resource_chunks desde Supabase sin los embeddings legados.

Uso:
    python -m scripts.rag.export_chunks_from_supabase --output data/rag_exports/chunks.jsonl
    python -m scripts.rag.export_chunks_from_supabase --output data/rag_exports/chunks.jsonl --resume

El script solo hace SELECT. Guarda un manifiesto junto al JSONL para reanudar
desde el último id confirmado sin duplicar registros.
"""

import argparse
import hashlib
import json
import sys
from collections import Counter
from collections.abc import Iterable, Iterator, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.core.database import get_admin_client  # noqa: E402


@dataclass(frozen=True, slots=True)
class ExportResult:
    output_path: Path
    manifest_path: Path
    exported_count: int
    sha256: str


def manifest_path_for(output_path: Path) -> Path:
    return output_path.with_suffix(output_path.suffix + ".manifest.json")


def export_pages(
    *,
    pages: Iterable[Sequence[Mapping[str, Any]]],
    output_path: Path,
    source_count: int,
    resume: bool = False,
    overwrite: bool = False,
) -> ExportResult:
    """Escribe páginas ya enriquecidas y persiste un checkpoint por página."""
    output_path = output_path.resolve()
    manifest_path = manifest_path_for(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if resume:
        state = _load_resume_state(output_path, manifest_path, source_count)
        with output_path.open("r+b") as output:
            output.truncate(state["bytes_written"])
    else:
        if output_path.exists() and not overwrite:
            raise FileExistsError(
                f"Ya existe {output_path}. Usa --resume para continuar o --overwrite para reiniciar."
            )
        state = _new_state(output_path, source_count)
        with output_path.open("wb"):
            pass
        _write_manifest(manifest_path, state)

    with output_path.open("ab") as output:
        for page in pages:
            for row in page:
                record = _export_record(row)
                line = json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
                output.write(line.encode("utf-8"))
                state["exported_count"] += 1
                state["counts_by_resource"][str(record["recurso_id"])] = (
                    state["counts_by_resource"].get(str(record["recurso_id"]), 0) + 1
                )
                state["last_id"] = record["id"]
            output.flush()
            state["bytes_written"] = output.tell()
            _write_manifest(manifest_path, state)

    if state["exported_count"] != source_count:
        raise RuntimeError(
            f"Export incompleto: {state['exported_count']}/{source_count} chunks. "
            "Vuelve a ejecutar con --resume."
        )

    state["status"] = "complete"
    state["sha256"] = _sha256(output_path)
    _write_manifest(manifest_path, state)
    return ExportResult(output_path, manifest_path, state["exported_count"], state["sha256"])


def export_from_supabase(
    *, output_path: Path, page_size: int, resume: bool, overwrite: bool
) -> ExportResult:
    """Lee Supabase por cursor de id y exporta el corpus enriquecido."""
    client = get_admin_client()
    source_count = _remote_count(client)
    start_after = _resume_last_id(output_path) if resume else None
    pages = _supabase_pages(client, page_size=page_size, start_after=start_after)
    result = export_pages(
        pages=pages,
        output_path=output_path,
        source_count=source_count,
        resume=resume,
        overwrite=overwrite,
    )
    if _remote_count(client) != source_count:
        raise RuntimeError("resource_chunks cambió durante el export. Descarta el archivo y repite.")
    return result


def _supabase_pages(client: Any, *, page_size: int, start_after: str | None) -> Iterator[list[dict[str, Any]]]:
    last_id = start_after
    while True:
        query = (
            client.table("resource_chunks")
            .select("id,recurso_id,curso_id,chunk_index,contenido")
            .order("id")
            .limit(page_size)
        )
        if last_id is not None:
            query = query.gt("id", last_id)
        page = query.execute().data or []
        if not page:
            return
        enriched = _enrich_page(client, page)
        yield enriched
        last_id = page[-1]["id"]
        if len(page) < page_size:
            return


def _enrich_page(client: Any, chunks: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    resource_ids = sorted({chunk["recurso_id"] for chunk in chunks})
    resources = _rows_by_id(
        client.table("recursos")
        .select("id,curso_id,titulo,tipo,profesor_id,ciclo,year")
        .in_("id", resource_ids)
        .execute()
        .data
        or []
    )
    course_ids = sorted({chunk["curso_id"] for chunk in chunks})
    courses = _rows_by_id(
        client.table("cursos").select("id,name").in_("id", course_ids).execute().data or []
    )
    professor_ids = sorted(
        {resource["profesor_id"] for resource in resources.values() if resource.get("profesor_id") is not None}
    )
    professors = _rows_by_id(
        client.table("profesores")
        .select("id,nombre_completo")
        .in_("id", professor_ids)
        .execute()
        .data
        or []
    ) if professor_ids else {}

    result: list[dict[str, Any]] = []
    for chunk in chunks:
        resource = resources.get(chunk["recurso_id"], {})
        professor = professors.get(resource.get("profesor_id"), {})
        course = courses.get(chunk["curso_id"], {})
        result.append({
            **chunk,
            "curso_nombre": course.get("name"),
            "titulo_recurso": resource.get("titulo"),
            "tipo_recurso": resource.get("tipo"),
            "profesor_id": resource.get("profesor_id"),
            "profesor_nombre": professor.get("nombre_completo"),
            "ciclo_recurso": resource.get("ciclo"),
            "year_recurso": resource.get("year"),
        })
    return result


def _export_record(row: Mapping[str, Any]) -> dict[str, Any]:
    required = ("id", "recurso_id", "curso_id", "chunk_index", "contenido")
    missing = [field for field in required if row.get(field) is None]
    if missing:
        raise ValueError(f"Chunk inválido: faltan {', '.join(missing)}.")
    record = {
        key: row.get(key)
        for key in (
            "id", "recurso_id", "curso_id", "chunk_index", "contenido",
            "curso_nombre", "titulo_recurso", "tipo_recurso", "profesor_id",
            "profesor_nombre", "ciclo_recurso", "year_recurso",
        )
    }
    record["metadata"] = row.get("metadata") or {}
    return record


def _new_state(output_path: Path, source_count: int) -> dict[str, Any]:
    return {
        "version": 1,
        "status": "in_progress",
        "output_path": str(output_path),
        "source_count": source_count,
        "exported_count": 0,
        "last_id": None,
        "bytes_written": 0,
        "counts_by_resource": {},
        "sha256": None,
    }


def _load_resume_state(output_path: Path, manifest_path: Path, source_count: int) -> dict[str, Any]:
    if not output_path.exists() or not manifest_path.exists():
        raise FileNotFoundError("--resume requiere el JSONL y su manifiesto previo.")
    state = json.loads(manifest_path.read_text(encoding="utf-8"))
    if state.get("source_count") != source_count:
        raise RuntimeError("El conteo remoto cambió desde el checkpoint; inicia un export nuevo.")
    if output_path.stat().st_size < state.get("bytes_written", 0):
        raise RuntimeError("El JSONL es más corto que su checkpoint; inicia un export nuevo.")
    state["status"] = "in_progress"
    state["sha256"] = None
    return state


def _resume_last_id(output_path: Path) -> str | None:
    manifest_path = manifest_path_for(output_path.resolve())
    if not manifest_path.exists():
        raise FileNotFoundError("--resume requiere el manifiesto previo.")
    return json.loads(manifest_path.read_text(encoding="utf-8")).get("last_id")


def _write_manifest(path: Path, state: Mapping[str, Any]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(state, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _remote_count(client: Any) -> int:
    response = client.table("resource_chunks").select("id", count="exact").limit(1).execute()
    if response.count is None:
        raise RuntimeError("Supabase no devolvió el conteo de resource_chunks.")
    return int(response.count)


def _rows_by_id(rows: Sequence[Mapping[str, Any]]) -> dict[Any, Mapping[str, Any]]:
    return {row["id"]: row for row in rows}


def main() -> None:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data/rag_exports/resource_chunks.jsonl"))
    parser.add_argument("--page-size", type=int, default=1000)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    if args.page_size < 1 or args.page_size > 1000:
        parser.error("--page-size debe estar entre 1 y 1000.")
    if args.resume and args.overwrite:
        parser.error("No combines --resume con --overwrite.")

    result = export_from_supabase(
        output_path=args.output,
        page_size=args.page_size,
        resume=args.resume,
        overwrite=args.overwrite,
    )
    print(f"Exportados: {result.exported_count}")
    print(f"JSONL: {result.output_path}")
    print(f"SHA-256: {result.sha256}")


if __name__ == "__main__":
    main()
