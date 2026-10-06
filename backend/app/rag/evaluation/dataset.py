"""Validación de etiquetas humanas del benchmark RAG."""

from collections import Counter


CATEGORIES = frozenset({"teoria", "ejercicio", "examen", "programacion", "abierta"})
SPLITS = frozenset({"calibration", "evaluation"})


def validate_human_case(row: dict) -> None:
    """Rechaza etiquetas incompletas antes de convertirlas en verdad de referencia."""
    case_id = row.get("query_id") or "<sin id>"
    if row.get("review_status") != "human_approved":
        raise ValueError(f"{case_id}: review_status debe ser human_approved")
    for field in ("query_id", "query", "reviewed_by"):
        if not isinstance(row.get(field), str) or not row[field].strip():
            raise ValueError(f"{case_id}: falta {field}")
    if row.get("category") not in CATEGORIES:
        raise ValueError(f"{case_id}: category debe ser una de {sorted(CATEGORIES)}")
    if row.get("split") not in SPLITS:
        raise ValueError(f"{case_id}: split debe ser calibration o evaluation")
    if not isinstance(row.get("answerable"), bool):
        raise ValueError(f"{case_id}: answerable debe ser booleano")
    chunk_ids = row.get("relevant_chunk_ids")
    resource_ids = row.get("relevant_resource_ids")
    if not isinstance(chunk_ids, list) or not isinstance(resource_ids, list):
        raise ValueError(f"{case_id}: relevant_chunk_ids y relevant_resource_ids deben ser listas")
    if row["answerable"]:
        if not chunk_ids:
            raise ValueError(f"{case_id}: relevant_chunk_ids no puede estar vacío")
        if not resource_ids:
            raise ValueError(f"{case_id}: relevant_resource_ids no puede estar vacío")
    elif chunk_ids or resource_ids:
        raise ValueError(f"{case_id}: relevant_chunk_ids y relevant_resource_ids deben estar vacíos")


def dataset_readiness(rows: list[dict], *, minimum: int = 100) -> dict:
    """Resume cobertura sin convertir borradores ni etiquetas IA en aprobaciones."""
    approved = [row for row in rows if row.get("review_status") == "human_approved"]
    for row in approved:
        validate_human_case(row)
    ids = [row["query_id"] for row in approved]
    if len(ids) != len(set(ids)):
        raise ValueError("query_id duplicado entre casos aprobados")
    categories = Counter(row["category"] for row in approved)
    splits = Counter(row["split"] for row in approved)
    negatives = sum(not row["answerable"] for row in approved)
    return {
        "total_rows": len(rows),
        "human_approved": len(approved),
        "ai_approved": sum(row.get("review_status") == "ai_approved" for row in rows),
        "pending_or_needs_review": sum(row.get("review_status") in {"pending", "needs_review", "draft"} for row in rows),
        "unanswerable": negatives,
        "categories": dict(categories),
        "splits": dict(splits),
        "ready": (
            len(approved) >= minimum
            and negatives >= 10
            and CATEGORIES.issubset(categories)
            and SPLITS.issubset(splits)
        ),
    }
