"""
Generador de embeddings: Gemini por defecto, OpenAI como respaldo.

Gemini (gemini-embedding-001) se pide con output_dimensionality=1536 para
calzar exacto con la columna pgvector de `resource_chunks` sin migrar el
esquema. Si GEMINI_VISION_API_KEY no está configurada, cae a OpenAI
text-embedding-3-small (también 1536 nativas).

Los vectores de modelos distintos NO son comparables: si se cambia el
proveedor hay que re-vectorizar todo el corpus con revectorizar_chunks.py,
no solo lo nuevo.

Hito 1.1 — Quick Wins:
  - batch_size configurable (default 20).
  - Backoff exponencial con jitter solo ante HTTP 429.
  - Sin sleep fijo entre lotes exitosos.
  - Degradación elegante: lotes fallidos se saltan, el resto continúa.
  - Integración opcional con EmbeddingCache (Hito 1.2).
"""
import logging
import os
import random
import time

from openai import OpenAI
from dotenv import load_dotenv

from app.core.llm import get_gemini_vision

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")


def _backoff_delay(attempt: int, base: float = 1.0, max_delay: float = 60.0) -> float:
    """Delay exponencial con jitter aleatorio (0-1s)."""
    delay = min(max_delay, base * (2 ** (attempt - 1)))
    jitter = random.uniform(0, 1)
    return delay + jitter


def _es_rate_limit(error: Exception) -> bool:
    """Detecta HTTP 429 o cuota agotada en el mensaje de error."""
    s = str(error).lower()
    return "429" in s or "quota" in s or "resource_exhausted" in s


class SyllabusEmbedder:
    """Genera embeddings con OpenAI y caché opcional."""

    def __init__(
        self,
        model_name: str = None,
        expected_dimensions: int = 1536,
        batch_size: int = 20,
        max_retries: int = 5,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        cache=None,
        proveedor=None,
    ):
        """
        Args:
            model_name: Modelo de embedding (del proveedor activo).
            expected_dimensions: Dimensión del vector de salida.
            batch_size: Chunks por lote enviados a la API (default 20).
            max_retries: Reintentos máximos ante 429 (default 5).
            base_delay: Delay base en segundos para backoff (default 1.0).
            max_delay: Cota superior de espera en segundos (default 60.0).
            cache: Instancia opcional de EmbeddingCache.
            proveedor: "gemini" u "openai". Por defecto, gemini si hay
                GEMINI_VISION_API_KEY configurada; si no, openai.
        """
        self.proveedor = proveedor or ("gemini" if get_gemini_vision() is not None else "openai")

        if self.proveedor == "gemini":
            self.client = get_gemini_vision()
            if self.client is None:
                raise RuntimeError("GEMINI_VISION_API_KEY no configurada.")
            self.model_name = model_name or GEMINI_EMBED_MODEL
        else:
            api_key = os.getenv("OPEN_AI_INGEST_API_KEY")
            if not api_key:
                logger.error("OPEN_AI_INGEST_API_KEY no configurada.")
            self.client = OpenAI(api_key=api_key)
            self.model_name = model_name or os.getenv(
                "OPENAI_EMBED_MODEL", "text-embedding-3-small"
            )

        self.expected_dimensions = expected_dimensions
        self.batch_size = batch_size
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.cache = cache
        logger.info(f"Embedder listo | proveedor={self.proveedor} modelo={self.model_name}")

    def _llamar_api(self, textos: list) -> list:
        """Llama a la API de embeddings y devuelve los vectores."""
        if self.proveedor == "gemini":
            from google.genai import types
            resultado = self.client.models.embed_content(
                model=self.model_name,
                contents=textos,
                config=types.EmbedContentConfig(
                    output_dimensionality=self.expected_dimensions,
                    task_type="RETRIEVAL_DOCUMENT",
                ),
            )
            return [list(e.values) for e in resultado.embeddings]

        resultado = self.client.embeddings.create(
            model=self.model_name,
            input=textos,
        )
        # La API devuelve los vectores en el mismo orden que la entrada, pero
        # trae `index` explícito; se ordena por él para no depender de eso.
        datos = sorted(resultado.data, key=lambda d: d.index)
        return [d.embedding[: self.expected_dimensions] for d in datos]

    def _procesar_lote_con_cache(self, lote: list) -> list:
        """
        Procesa un lote usando caché + API.

        Returns:
            Lista de dicts enriquecidos con embedding, en el mismo orden
            que el lote de entrada. Chunks sin embedding (fallo definitivo)
            se omiten.
        """
        from app.rag.embedding_cache import hash_chunk

        resultados = [None] * len(lote)
        textos_miss = []
        indices_miss = []
        hits_cache = 0

        # 1. Consultar caché para cada chunk
        for j, chunk in enumerate(lote):
            h = hash_chunk(chunk["contenido"])
            if self.cache:
                cached = self.cache.lookup(h)
                if cached is not None:
                    resultado = chunk.copy()
                    resultado["embedding"] = cached
                    resultados[j] = resultado
                    hits_cache += 1
                    continue
            # MISS: agregar a lista para API
            textos_miss.append(chunk["contenido"])
            indices_miss.append(j)

        if hits_cache or textos_miss:
            logger.info(
                f"[Cache Embedding] {hits_cache} chunks recuperados de caché, "
                f"{len(textos_miss)} enviados a la API de embeddings."
            )

        if not textos_miss:
            return [r for r in resultados if r is not None]

        # 2. Llamar API con backoff para los MISS
        vectores = None
        for attempt in range(1, self.max_retries + 1):
            try:
                vectores = self._llamar_api(textos_miss)
                break
            except Exception as e:
                if _es_rate_limit(e):
                    delay = _backoff_delay(attempt, self.base_delay, self.max_delay)
                    logger.warning(
                        f"[Rate Limit 429] Aplicando backoff exponencial con jitter "
                        f"(reintento {attempt}/{self.max_retries}), esperando {delay:.1f}s"
                    )
                    time.sleep(delay)
                    if attempt >= self.max_retries:
                        logger.error(
                            f"[Rate Limit 429] Agotados {self.max_retries} reintentos. "
                            f"Lote de {len(textos_miss)} chunks omitido."
                        )
                        return [r for r in resultados if r is not None]
                else:
                    logger.error(f"Error no recuperable en embedding: {e}")
                    return [r for r in resultados if r is not None]

        if vectores is None:
            return [r for r in resultados if r is not None]

        # 3. Ensamblar resultados y guardar en caché
        for k, (idx, vector) in enumerate(zip(indices_miss, vectores)):
            chunk = lote[idx].copy()
            chunk["embedding"] = vector
            resultados[idx] = chunk
            if self.cache:
                h = hash_chunk(chunk["contenido"])
                self.cache.store(h, vector)

        return [r for r in resultados if r is not None]

    def embedding_generator(self, chunks: list) -> list:
        """
        Convierte chunks en embeddings usando OpenAI + caché.

        Comportamiento:
        - Procesa en lotes de tamaño self.batch_size.
        - Ante HTTP 200: avanza al siguiente lote SIN sleep.
        - Ante HTTP 429: aplica backoff exponencial con jitter.
        - Ante error no recuperable: salta el lote y continúa.
        - Si hay caché configurado, evita llamadas redundantes.

        Returns:
            Lista de dicts {contenido, embedding}. Puede ser más corta
            que la entrada si algunos lotes fallaron definitivamente.
        """
        if not chunks:
            logger.warning("No se encontraron chunks para convertir.")
            return []

        logger.info(f"Iniciando vectorización de {len(chunks)} chunks (batch={self.batch_size}, sin pausa estática)...")
        chunks_transformados = []

        for i in range(0, len(chunks), self.batch_size):
            lote = chunks[i : i + self.batch_size]
            lote_num = i // self.batch_size + 1
            total_lotes = (len(chunks) + self.batch_size - 1) // self.batch_size

            logger.info(f"[Embedder] Procesando lote {lote_num}/{total_lotes} ({len(lote)} chunks) - Sin pausa estática.")

            if self.cache:
                procesados = self._procesar_lote_con_cache(lote)
            else:
                procesados = self._procesar_lote_sin_cache(lote)

            chunks_transformados.extend(procesados)

        logger.info(
            f"Vectorización completada: {len(chunks_transformados)}/{len(chunks)} "
            f"chunks con embedding."
        )
        return chunks_transformados

    def _procesar_lote_sin_cache(self, lote: list) -> list:
        """Procesa un lote sin caché (fallback cuando no hay cache configurado)."""
        for attempt in range(1, self.max_retries + 1):
            try:
                vectores = self._llamar_api([c["contenido"] for c in lote])
                resultados = []
                for chunk, vector in zip(lote, vectores):
                    enriquecido = chunk.copy()
                    enriquecido["embedding"] = vector
                    resultados.append(enriquecido)
                return resultados
            except Exception as e:
                if _es_rate_limit(e):
                    delay = _backoff_delay(attempt, self.base_delay, self.max_delay)
                    logger.warning(
                        f"[Rate Limit 429] Aplicando backoff exponencial con jitter "
                        f"(reintento {attempt}/{self.max_retries}), esperando {delay:.1f}s"
                    )
                    time.sleep(delay)
                    if attempt >= self.max_retries:
                        logger.error(f"[Rate Limit 429] Lote omitido tras {self.max_retries} reintentos.")
                        return []
                else:
                    logger.error(f"Error no recuperable: {e}")
                    return []

        return []
