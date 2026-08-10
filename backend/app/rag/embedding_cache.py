"""
Caché de embeddings para evitar llamadas redundantes a Gemini Embedding.

Cada chunk se identifica por un hash SHA-256 de su contenido normalizado.
Los embeddings cacheados se persisten en la tabla 'embedding_cache' de Supabase.
"""
import hashlib
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def normalizar(texto: str) -> str:
    """Normaliza whitespace y casing para hashing determinista."""
    texto = texto.strip().lower()
    texto = re.sub(r"\s+", " ", texto)
    return texto


def hash_chunk(contenido: str) -> str:
    """
    Calcula SHA-256 del contenido normalizado.

    La normalización asegura que variaciones triviales de whitespace
    no generen hashes distintos para contenido semánticamente idéntico.

    Returns:
        String hexadecimal de 64 caracteres.
    """
    normalizado = normalizar(contenido)
    return hashlib.sha256(normalizado.encode("utf-8")).hexdigest()


class EmbeddingCache:
    """Caché de embeddings persistido en Supabase."""

    def __init__(self, supabase_client):
        """
        Args:
            supabase_client: Cliente de Supabase ya autenticado.
        """
        self.supabase = supabase_client
        self.table_name = "embedding_cache"

    def lookup(self, chunk_hash: str) -> Optional[list]:
        """
        Busca un embedding por hash en la tabla embedding_cache.

        Returns:
            Lista de floats si existe, None si no.
        """
        try:
            resp = (
                self.supabase.table(self.table_name)
                .select("embedding")
                .eq("chunk_hash", chunk_hash)
                .maybe_single()
                .execute()
            )
            data = getattr(resp, "data", None)
            if data and isinstance(data, dict) and "embedding" in data:
                emb = data["embedding"]
                if isinstance(emb, str):
                    # pgvector puede devolver el vector como string
                    emb = [float(x) for x in emb.strip("[]").split(",")]
                return emb
            return None
        except Exception as e:
            logger.warning(f"Cache lookup falló para {chunk_hash[:12]}: {e}")
            return None

    def store(self, chunk_hash: str, embedding: list) -> None:
        """
        Inserta (hash, embedding) en embedding_cache vía upsert.
        Idempotente: re-ejecutar con el mismo hash no duplica filas.
        """
        try:
            self.supabase.table(self.table_name).upsert(
                {"chunk_hash": chunk_hash, "embedding": embedding},
                on_conflict="chunk_hash",
            ).execute()
        except Exception as e:
            logger.warning(f"Cache store falló para {chunk_hash[:12]}: {e}")
