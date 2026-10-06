import json
from pathlib import Path

from scripts.rag.export_chunks_from_supabase import export_pages
from scripts.rag.validate_export import validate_export


def _row(chunk_id: str, recurso_id: int, chunk_index: int) -> dict:
    return {
        "id": chunk_id,
        "recurso_id": recurso_id,
        "curso_id": 10,
        "chunk_index": chunk_index,
        "contenido": f"contenido {chunk_id}",
        "metadata": {"pagina": chunk_index + 1},
        "embedding": [0.1, 0.2, 0.3],
        "curso_nombre": "Cálculo I",
        "titulo_recurso": "Práctica 1",
        "tipo_recurso": "Practica",
        "profesor_id": 8,
        "profesor_nombre": "Ada Lovelace",
        "ciclo_recurso": 1,
        "year_recurso": 2026,
    }


def test_export_pages_excludes_embeddings_and_writes_a_manifest(tmp_path: Path) -> None:
    output = tmp_path / "chunks.jsonl"

    result = export_pages(
        pages=[[_row("00000000-0000-0000-0000-000000000001", 1, 0)], [_row("00000000-0000-0000-0000-000000000002", 1, 1)]],
        output_path=output,
        source_count=2,
    )

    records = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]
    manifest = json.loads(result.manifest_path.read_text(encoding="utf-8"))

    assert [record["chunk_index"] for record in records] == [0, 1]
    assert all("embedding" not in record for record in records)
    assert manifest["exported_count"] == 2
    assert manifest["source_count"] == 2
    assert manifest["sha256"]


def test_validate_export_detects_duplicate_resource_positions(tmp_path: Path) -> None:
    output = tmp_path / "chunks.jsonl"
    export_pages(
        pages=[[_row("00000000-0000-0000-0000-000000000001", 1, 0), _row("00000000-0000-0000-0000-000000000002", 1, 0)]],
        output_path=output,
        source_count=2,
    )

    result = validate_export(output)

    assert result.valid is False
    assert "recurso_id, chunk_index" in result.errors[0]


def test_export_pages_adds_empty_metadata_when_legacy_source_has_no_column(tmp_path: Path) -> None:
    output = tmp_path / "chunks.jsonl"
    row = _row("00000000-0000-0000-0000-000000000001", 1, 0)
    row.pop("metadata")

    export_pages(pages=[[row]], output_path=output, source_count=1)

    record = json.loads(output.read_text(encoding="utf-8"))
    assert record["metadata"] == {}
