import asyncio
import logging
import math
import os
import uuid
from supabase import Client

from app.core.database import get_supabase
from app.core.rag_database import rag_store_name
from app.rag import health as rag_health
from app.rag.embedder import EmbeddingQuotaExhausted, SyllabusEmbedder
from app.rag.evaluation.shadow_read import compare_rankings, should_sample_shadow_read
from app.rag.local_retriever import LocalChunkRetriever
from app.rag.reranking.factory import get_reranker
from app.rag.storage.base import ChunkStore
from app.rag.storage.factory import get_chunk_store

logger = logging.getLogger(__name__)
shadow_logger = logging.getLogger("app.rag.shadow_metrics")
_shadow_tasks: set[asyncio.Task] = set()

class SyllabusRetriever:
    def __init__(
        self, model_name=None, expected_dimensions=None, token=None, *, embedder=None, supabase_client=None
    ):
        # Reutiliza el cliente del pool LRU en vez de abrir una nueva conexión
        # TCP/TLS por instancia. get_supabase(token) devuelve el cliente
        # autenticado del caché si ya existe para ese token; el cliente base
        # compartido si no hay token. Cero handshakes extra por request.
        self.supabase: Client | None = supabase_client
        if self.supabase is None:
            self.supabase = get_supabase(token)

        # La pregunta se vectoriza con el MISMO embedder que ingiere el corpus.
        # No se elige proveedor acá: hacerlo por separado fue justo el bug que
        # dejó el corpus en Gemini y las consultas en OpenAI, comparando
        # vectores de espacios distintos sin que nada fallara visiblemente.
        self.embedder = embedder or SyllabusEmbedder(
            model_name=model_name, expected_dimensions=expected_dimensions,
        )
        self.expected_dimensions = expected_dimensions or self.embedder.expected_dimensions
        self.model_name = self.embedder.model_name

    def vectorizar_pregunta(self, pregunta: str, estricto: bool = False) -> list:
        logger.debug("Vectorizando el query ...")
        vector = self.embedder.vectorizar_consulta(pregunta, estricto=estricto)
        if not vector:
            # Vector vacío sin excepción: proveedor devolvió respuesta vacía.
            logger.error(
                "RAG SIN VECTOR DE CONSULTA: el proveedor de embeddings no "
                "devolvió un vector (¿saldo agotado?). "
                "Último fallo registrado: %s",
                rag_health.ultimo_fallo("embeddings_query"),
            )
            if estricto:
                raise EmbeddingQuotaExhausted(
                    "El proveedor de embeddings no vectorizó la consulta."
                )
        return vector

    def buscar_contexto(self, pregunta: str, limit: int = 5, umbral_similitud: float = 0.5, curso_id: int = None, estricto: bool = False) -> list:
        pregunta_vectorizada = self.vectorizar_pregunta(pregunta, estricto=estricto)

        if not pregunta_vectorizada:
            return []
        logger.info(f"Buscando en supabase los {limit} fragmentos más relevantes ...")
        return self._buscar_supabase_vector(
            pregunta_vectorizada, limit, umbral_similitud, curso_id=curso_id
        )

    def buscar_contexto_por_nombre(self, pregunta: str, curso_nombre: str = None, limit: int = 5, umbral_similitud: float = 0.5, profesor_id: int = None, estricto: bool = False) -> list:
        pregunta_vectorizada = self.vectorizar_pregunta(pregunta, estricto=estricto)

        if not pregunta_vectorizada:
            return []
        logger.info(f"Buscando en supabase los {limit} fragmentos más relevantes para el curso '{curso_nombre}'"
                    + (f" (profesor_id={profesor_id})" if profesor_id else "") + " ...")
        return self._buscar_supabase_vector(
            pregunta_vectorizada, limit, umbral_similitud,
            curso_nombre=curso_nombre, profesor_id=profesor_id,
        )

    async def buscar_contexto_async(
        self, pregunta: str, limit: int = 5, umbral_similitud: float = 0.5,
        curso_id: int | None = None, estricto: bool = False,
        profesor_id: int | None = None, recurso_id: int | None = None,
    ) -> list:
        """Busca en PostgreSQL local cuando está seleccionado; conserva Supabase como fallback."""
        if rag_store_name() != "postgres":
            vector = await asyncio.to_thread(self.vectorizar_pregunta, pregunta, estricto)
            if not vector:
                return []
            primary = await asyncio.to_thread(
                self._buscar_supabase_vector, vector, limit, umbral_similitud,
                curso_id=curso_id,
                profesor_id=profesor_id,
                query_text=pregunta,
            )
            self._schedule_shadow_read(
                primary, vector, pregunta, limit, umbral_similitud,
                curso_id=curso_id,
                profesor_id=profesor_id,
                max_chunks_per_resource=1 if profesor_id is not None else None,
            )
            return primary
        pregunta_vectorizada = await asyncio.to_thread(self.vectorizar_pregunta, pregunta, estricto)
        if not pregunta_vectorizada:
            return []
        return await self._buscar_local(
            pregunta, pregunta_vectorizada, limit, umbral_similitud,
            curso_id=curso_id,
            profesor_id=profesor_id,
            recurso_id=recurso_id,
        )

    async def buscar_contexto_por_nombre_async(
        self, pregunta: str, curso_nombre: str | None = None, limit: int = 5,
        umbral_similitud: float = 0.5, profesor_id: int | None = None, estricto: bool = False,
    ) -> list:
        """Variante asíncrona compatible con el pool local de asyncpg."""
        if rag_store_name() != "postgres":
            vector = await asyncio.to_thread(self.vectorizar_pregunta, pregunta, estricto)
            if not vector:
                return []
            primary = await asyncio.to_thread(
                self._buscar_supabase_vector, vector, limit, umbral_similitud,
                curso_nombre=curso_nombre, profesor_id=profesor_id,
            )
            self._schedule_shadow_read(
                primary, vector, pregunta, limit, umbral_similitud,
                curso_nombre=curso_nombre, profesor_id=profesor_id,
            )
            return primary
        pregunta_vectorizada = await asyncio.to_thread(self.vectorizar_pregunta, pregunta, estricto)
        if not pregunta_vectorizada:
            return []
        return await self._buscar_local(
            pregunta, pregunta_vectorizada, limit, umbral_similitud,
            curso_nombre=curso_nombre,
            profesor_id=profesor_id,
        )

    async def _buscar_local(
        self, pregunta: str, pregunta_vectorizada: list, limit: int,
        umbral_similitud: float, *, curso_id: int | None = None,
        curso_nombre: str | None = None, profesor_id: int | None = None,
        recurso_id: int | None = None, store: ChunkStore | None = None,
    ) -> list:
        reranker = get_reranker()
        store = store or await get_chunk_store()
        pool_size = min(40, max(20, limit * 4)) if reranker else limit
        candidates = await LocalChunkRetriever(store).search(
            query_embedding=pregunta_vectorizada,
            limit=pool_size,
            min_similarity=umbral_similitud,
            curso_id=curso_id,
            curso_nombre=curso_nombre,
            profesor_id=profesor_id,
            recurso_id=recurso_id,
        )
        if reranker is None:
            return candidates
        try:
            timeout = float(os.getenv("RAG_RERANK_TIMEOUT_SECONDS", "1"))
            return await asyncio.wait_for(
                reranker.rerank(pregunta, candidates, top_k=limit), timeout=timeout
            )
        except Exception:
            logger.exception("Reranker no disponible; se conserva el orden vectorial.")
            return candidates[:limit]

    def _buscar_supabase_vector(
        self,
        query_embedding: list,
        limit: int,
        umbral_similitud: float,
        *,
        curso_id: int | None = None,
        curso_nombre: str | None = None,
        profesor_id: int | None = None,
        query_text: str | None = None,
    ) -> list:
        try:
            if self.supabase is None:
                raise RuntimeError("El retriever no tiene cliente Supabase.")
            if profesor_id is not None and curso_nombre is None:
                if not query_text:
                    raise ValueError("La búsqueda híbrida por profesor requiere el texto de consulta.")
                response = self.supabase.rpc(
                    "search_chatbot_resource_chunks",
                    {
                        "query_text": query_text,
                        "query_embedding": query_embedding,
                        "match_threshold": umbral_similitud,
                        "match_count": limit,
                        "filter_curso_id": curso_id,
                        "filter_profesor_id": profesor_id,
                        "max_chunks_per_resource": 1,
                    },
                ).execute()
            elif curso_nombre is not None:
                response = self.supabase.rpc(
                    "search_resource_chunks_by_nombre",
                    {
                        "query_embedding": query_embedding,
                        "match_threshold": umbral_similitud,
                        "match_count": limit,
                        "filter_curso_nombre": curso_nombre,
                        "filter_profesor_id": profesor_id,
                    },
                ).execute()
            else:
                response = self.supabase.rpc(
                    "search_resource_chunks",
                    {
                        "query_embedding": query_embedding,
                        "match_threshold": umbral_similitud,
                        "match_count": limit,
                        "filter_curso_id": curso_id,
                    },
                ).execute()
            rows = response.data or []
            logger.info("Supabase recuperó %d fragmentos.", len(rows))
            return rows
        except Exception as error:
            logger.error("Error en búsqueda Supabase (%s).", type(error).__name__)
            return []

    def _schedule_shadow_read(
        self,
        supabase_rows: list,
        primary_embedding: list,
        query_text: str,
        limit: int,
        min_similarity: float,
        *,
        curso_id: int | None = None,
        curso_nombre: str | None = None,
        profesor_id: int | None = None,
        max_chunks_per_resource: int | None = None,
    ) -> None:
        if not should_sample_shadow_read():
            return
        if max_chunks_per_resource is not None:
            supabase_rows = _limit_rows_per_resource(
                supabase_rows, max_chunks_per_resource
            )
        query_id = uuid.uuid4().hex[:12]
        task = asyncio.create_task(
            self._run_shadow_read(
                query_id, supabase_rows, primary_embedding, query_text, limit,
                min_similarity, curso_id=curso_id, curso_nombre=curso_nombre,
                profesor_id=profesor_id,
                max_chunks_per_resource=max_chunks_per_resource,
            ),
            name=f"rag-shadow-{query_id}",
        )
        _shadow_tasks.add(task)
        task.add_done_callback(self._log_shadow_task_error)

    def schedule_shadow_read(
        self,
        supabase_rows: list,
        primary_embedding: list,
        query_text: str,
        limit: int,
        min_similarity: float,
        *,
        curso_id: int | None = None,
        profesor_id: int | None = None,
        max_chunks_per_resource: int | None = None,
    ) -> None:
        """Compara una búsqueda Supabase ya ejecutada con el retriever local."""
        self._schedule_shadow_read(
            supabase_rows, primary_embedding, query_text, limit, min_similarity,
            curso_id=curso_id, profesor_id=profesor_id,
            max_chunks_per_resource=max_chunks_per_resource,
        )

    async def _run_shadow_read(
        self,
        query_id: str,
        supabase_rows: list,
        primary_embedding: list,
        query_text: str,
        limit: int,
        min_similarity: float,
        *,
        curso_id: int | None = None,
        curso_nombre: str | None = None,
        profesor_id: int | None = None,
        max_chunks_per_resource: int | None = None,
    ) -> None:
        import time

        started = time.perf_counter()
        try:
            timeout = max(0.1, float(os.getenv("RAG_SHADOW_READ_TIMEOUT_SECONDS", "6")))
            store = await asyncio.wait_for(get_chunk_store(), timeout=timeout)
            contract = await asyncio.wait_for(store.get_embedding_contract(), timeout=timeout)
            if contract is None:
                shadow_logger.info(
                    "RAG_SHADOW_READ_SKIPPED query_id=%s reason=empty_local_corpus",
                    query_id,
                )
                return
            if (
                contract.provider.casefold() != self.embedder.proveedor.casefold()
                or contract.model.casefold() != self.embedder.model_name.casefold()
                or contract.dimensions != 256
            ):
                shadow_logger.warning(
                    "RAG_SHADOW_READ_SKIPPED query_id=%s reason=embedding_contract_mismatch "
                    "local_provider=%s local_model=%s local_dimensions=%d",
                    query_id, contract.provider, contract.model, contract.dimensions,
                )
                return
            if (
                contract.provider.casefold() != "openai"
                or contract.model.casefold() not in {
                    "text-embedding-3-small", "text-embedding-3-large"
                }
            ):
                shadow_logger.info(
                    "RAG_SHADOW_READ_SKIPPED query_id=%s reason=embedding_reuse_unsupported",
                    query_id,
                )
                return
            try:
                local_embedding = self._reduce_openai_embedding(primary_embedding)
            except ValueError:
                shadow_logger.info(
                    "RAG_SHADOW_READ_SKIPPED query_id=%s reason=primary_embedding_incompatible",
                    query_id,
                )
                return
            postgres_rows = await asyncio.wait_for(
                self._buscar_local(
                    query_text, local_embedding, limit, min_similarity,
                    curso_id=curso_id, curso_nombre=curso_nombre,
                    profesor_id=profesor_id, store=store,
                ),
                timeout=max(0.1, timeout - (time.perf_counter() - started)),
            )
            if max_chunks_per_resource is not None:
                postgres_rows = _limit_rows_per_resource(
                    postgres_rows, max_chunks_per_resource
                )
            elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
            result = compare_rankings(
                query_id=query_id,
                supabase_ids=[
                    str(row.get("id")) for row in supabase_rows
                    if row.get("id") is not None
                ],
                postgres_ids=[
                    str(row.get("id")) for row in postgres_rows
                    if row.get("id") is not None
                ],
                supabase_scores=[
                    float(row["similarity"]) for row in supabase_rows
                    if row.get("similarity") is not None
                ],
                postgres_scores=[
                    float(row["similarity"]) for row in postgres_rows
                    if row.get("similarity") is not None
                ],
            )
            shadow_logger.info(
                "RAG_SHADOW_READ query_id=%s overlap_at_k=%.3f top_1_agrees=%s "
                "top_1_score_delta=%s supabase_count=%d postgres_count=%d "
                "shadow_latency_ms=%.1f",
                result.query_id, result.overlap_at_k, result.top_1_agrees,
                result.top_1_score_delta, result.supabase_count,
                result.postgres_count, elapsed_ms,
            )
        except Exception as error:
            shadow_logger.warning(
                "RAG_SHADOW_READ_FAILED query_id=%s error_type=%s latency_ms=%.1f",
                query_id, type(error).__name__, (time.perf_counter() - started) * 1000,
            )

    @staticmethod
    def _reduce_openai_embedding(vector: list[float]) -> list[float]:
        """Reduce un embedding OpenAI v3 de 1536D a 256D y lo renormaliza."""
        if len(vector) != 1536:
            raise ValueError("El embedding primario no tiene 1536 dimensiones.")
        prefix = [float(value) for value in vector[:256]]
        if not all(math.isfinite(value) for value in prefix):
            raise ValueError("El embedding primario contiene valores no finitos.")
        norm = math.sqrt(sum(value * value for value in prefix))
        if norm == 0:
            raise ValueError("El prefijo del embedding tiene norma cero.")
        return [value / norm for value in prefix]

    @staticmethod
    def _log_shadow_task_error(task: asyncio.Task) -> None:
        _shadow_tasks.discard(task)
        if task.cancelled():
            return
        error = task.exception()
        if error:
            shadow_logger.warning("RAG_SHADOW_READ_TASK_FAILED error_type=%s", type(error).__name__)

def _limit_rows_per_resource(rows: list[dict], maximum: int) -> list[dict]:
    if maximum < 1:
        return []
    counts: dict[object, int] = {}
    limited: list[dict] = []
    for row in rows:
        resource_id = row.get("recurso_id", row.get("id"))
        if counts.get(resource_id, 0) >= maximum:
            continue
        counts[resource_id] = counts.get(resource_id, 0) + 1
        limited.append(row)
    return limited


if __name__ == "__main__":
    print("Iniciando prueba del retriever ... ")

    pregunta_prueba = "¿Cuántas horas tiene el curso?"
    retriever = SyllabusRetriever()
    fragmentos_encontrados = retriever.buscar_contexto(pregunta_prueba, limit=3)

    if fragmentos_encontrados:
        print("\nMejores resultados: ")
        for i, frag in enumerate(fragmentos_encontrados):
            similitud = round(frag.get('similarity', 0) * 100, 2)
            print(f"\n[{i+1}] Similitud: {similitud}% | Curso ID: {frag.get('curso_id')}")
            print(f"Contenido: {frag.get('contenido')[:200]}...")
