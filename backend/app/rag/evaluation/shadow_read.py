"""Métricas de concordancia para comparar Supabase y PostgreSQL durante el shadow-read."""

from dataclasses import dataclass
import math
import os
import random
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Sequence


_shadow_logger = logging.getLogger("app.rag.shadow_metrics")


def configure_shadow_metrics_logging() -> None:
    """Persistir únicamente métricas de shadow-read, sin logs generales del backend."""
    if not shadow_read_enabled() or any(
        getattr(handler, "_univia_shadow_handler", False)
        for handler in _shadow_logger.handlers
    ):
        return

    default_path = Path(__file__).resolve().parents[3] / "logs" / "rag-shadow.log"
    log_path = Path(os.getenv("RAG_SHADOW_READ_LOG_FILE", str(default_path))).expanduser()
    log_path.parent.mkdir(parents=True, exist_ok=True)

    handler = RotatingFileHandler(
        log_path, maxBytes=1_048_576, backupCount=3, encoding="utf-8"
    )
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    handler._univia_shadow_handler = True
    _shadow_logger.addHandler(handler)
    _shadow_logger.setLevel(logging.INFO)
    _shadow_logger.propagate = False


@dataclass(frozen=True, slots=True)
class ShadowReadResult:
    query_id: str
    overlap_at_k: float
    top_1_agrees: bool
    supabase_count: int
    postgres_count: int
    top_1_score_delta: float | None = None


def shadow_read_enabled() -> bool:
    return os.getenv("RAG_SHADOW_READ_ENABLED", "false").strip().lower() in {
        "1", "true", "yes", "on"
    }


def shadow_read_sample_rate() -> float:
    try:
        rate = float(os.getenv("RAG_SHADOW_READ_SAMPLE_RATE", "0.05"))
    except ValueError:
        return 0.0
    return min(1.0, max(0.0, rate)) if math.isfinite(rate) else 0.0


def should_sample_shadow_read() -> bool:
    return shadow_read_enabled() and random.random() < shadow_read_sample_rate()


def compare_rankings(
    *,
    query_id: str,
    supabase_ids: Sequence[str],
    postgres_ids: Sequence[str],
    supabase_scores: Sequence[float] = (),
    postgres_scores: Sequence[float] = (),
) -> ShadowReadResult:
    supabase_set = set(supabase_ids)
    postgres_set = set(postgres_ids)
    union = supabase_set | postgres_set
    overlap = len(supabase_set & postgres_set) / len(union) if union else 1.0
    top_1_agrees = bool(supabase_ids and postgres_ids and supabase_ids[0] == postgres_ids[0])
    return ShadowReadResult(
        query_id=query_id,
        overlap_at_k=overlap,
        top_1_agrees=top_1_agrees,
        supabase_count=len(supabase_ids),
        postgres_count=len(postgres_ids),
        top_1_score_delta=(
            abs(float(supabase_scores[0]) - float(postgres_scores[0]))
            if supabase_scores and postgres_scores
            else None
        ),
    )
