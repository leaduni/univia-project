"""Reranking léxico ligero para el pool recuperado con pgvector."""

import re
import unicodedata
from collections.abc import Mapping, Sequence
from typing import Any

_TOKEN = re.compile(r"[a-z0-9]+")
_STOPWORDS = frozenset({
    "a", "al", "con", "de", "del", "el", "en", "es", "la", "las", "los",
    "para", "por", "que", "se", "su", "un", "una", "y", "como", "cual",
    "explica", "explicar", "sobre",
})


def _tokens(text: str) -> set[str]:
    folded = unicodedata.normalize("NFKD", text.casefold())
    ascii_text = "".join(char for char in folded if not unicodedata.combining(char))
    return set(_TOKEN.findall(ascii_text)) - _STOPWORDS


class LexicalReranker:
    """Combina similitud vectorial con coincidencia de términos de la consulta."""

    async def rerank(
        self, query: str, candidates: Sequence[Mapping[str, Any]], top_k: int
    ) -> list[dict[str, Any]]:
        if top_k <= 0:
            raise ValueError("top_k debe ser positivo")
        terms = _tokens(query)
        ranked = []
        for vector_rank, candidate in enumerate(candidates, start=1):
            row = dict(candidate)
            passage = f"{row.get('titulo_recurso') or ''} {(row.get('contenido') or '')[:2000]}"
            lexical = len(terms & _tokens(passage)) / len(terms) if terms else 0.0
            vector_score = float(row.get("similarity") or 0.0)
            row["lexical_score"] = lexical
            row["vector_rank"] = vector_rank
            row["rerank_score"] = 0.85 * vector_score + 0.15 * lexical
            ranked.append(row)
        ranked.sort(key=lambda row: (-row["rerank_score"], row["vector_rank"]))
        return ranked[:top_k]
