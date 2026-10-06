"""Selección del reranker por configuración de despliegue."""

import os

from app.rag.reranking.base import Reranker
from app.rag.reranking.lexical import LexicalReranker


def get_reranker() -> Reranker | None:
    name = os.getenv("RAG_RERANKER", "none").strip().lower()
    if name in {"", "none"}:
        return None
    if name == "lexical":
        return LexicalReranker()
    raise ValueError(f"RAG_RERANKER desconocido: {name}")
