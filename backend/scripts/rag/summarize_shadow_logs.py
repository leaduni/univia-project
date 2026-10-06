"""Resume métricas RAG_SHADOW_READ sin mostrar consultas ni contenido de chunks."""

from __future__ import annotations

import argparse
import json
import math
import re
import statistics
import sys
from collections import Counter
from pathlib import Path
from typing import Iterable


MARKER = re.compile(r"\bRAG_SHADOW_READ(?:_(SKIPPED|FAILED))?\b")
FIELD = re.compile(r"([a-zA-Z0-9_]+)=([^\s]+)")


def _percentile(values: list[float], percentile: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = max(0, math.ceil(percentile * len(ordered)) - 1)
    return ordered[index]


def parse_shadow_line(line: str) -> tuple[str, dict[str, str]] | None:
    marker = MARKER.search(line)
    if marker is None:
        return None
    fields = dict(FIELD.findall(line[marker.end() :]))
    return (marker.group(1) or "comparison", fields)


def _float_field(fields: dict[str, str], key: str) -> float | None:
    try:
        value = float(fields[key])
    except (KeyError, ValueError):
        return None
    return value if math.isfinite(value) else None


def summarize_lines(lines: Iterable[str]) -> dict[str, object]:
    outcomes: Counter[str] = Counter()
    skip_reasons: Counter[str] = Counter()
    failures: Counter[str] = Counter()
    overlaps: list[float] = []
    latencies: list[float] = []
    score_deltas: list[float] = []
    supabase_counts: list[int] = []
    postgres_counts: list[int] = []
    top1_agrees = 0

    for line in lines:
        parsed = parse_shadow_line(line)
        if parsed is None:
            continue
        kind, fields = parsed
        outcomes[kind] += 1
        if kind == "comparison":
            overlap = _float_field(fields, "overlap_at_k")
            latency = _float_field(fields, "shadow_latency_ms")
            delta = _float_field(fields, "top_1_score_delta")
            for key, target in (
                ("supabase_count", supabase_counts),
                ("postgres_count", postgres_counts),
            ):
                try:
                    target.append(int(fields[key]))
                except (KeyError, ValueError):
                    continue
            if overlap is not None:
                overlaps.append(overlap)
            if latency is not None:
                latencies.append(latency)
            if delta is not None:
                score_deltas.append(delta)
            top1_agrees += fields.get("top_1_agrees", "").lower() == "true"
        elif kind == "SKIPPED":
            skip_reasons[fields.get("reason", "unknown")] += 1
        elif kind == "FAILED":
            failures[fields.get("error_type", "unknown")] += 1

    count = outcomes["comparison"]
    return {
        "comparisons": count,
        "skipped": outcomes["SKIPPED"],
        "failed": outcomes["FAILED"],
        "mean_overlap_at_k": statistics.fmean(overlaps) if overlaps else None,
        "top_1_agreement_rate": top1_agrees / count if count else None,
        "mean_top_1_score_delta": statistics.fmean(score_deltas) if score_deltas else None,
        "mean_supabase_results": statistics.fmean(supabase_counts) if supabase_counts else None,
        "mean_postgres_results": statistics.fmean(postgres_counts) if postgres_counts else None,
        "latency_ms_p50": _percentile(latencies, 0.50),
        "latency_ms_p95": _percentile(latencies, 0.95),
        "skip_reasons": dict(sorted(skip_reasons.items())),
        "failure_types": dict(sorted(failures.items())),
        "warning": (
            "Muestra pequeña: reúne más comparaciones antes de decidir el cutover."
            if count < 30
            else None
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Resume líneas RAG_SHADOW_READ y omite el resto del log."
    )
    parser.add_argument("logs", nargs="+", help="Archivos de log; usa - para stdin.")
    args = parser.parse_args()

    def lines() -> Iterable[str]:
        for name in args.logs:
            if name == "-":
                yield from sys.stdin
                continue
            path = Path(name)
            try:
                with path.open("r", encoding="utf-8", errors="replace") as stream:
                    yield from stream
            except OSError as error:
                parser.error(f"No se pudo leer {path}: {error}")

    print(json.dumps(summarize_lines(lines()), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
