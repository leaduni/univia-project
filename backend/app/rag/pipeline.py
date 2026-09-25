"""Pipeline unificado de ingesta RAG (Fase 1).

Orquesta, para UN solo documento, el flujo completo que antes estaba
duplicado entre `scripts_manuales/generar_chunks_desde_drive.py` y
`app/rag/cargar_compendio.py`:

    fuente -> PDF -> extracción (OCR cascada, checkpoints, semáforo)
    -> chunking -> embeddings (con caché opcional) -> ingesta transaccional
    -> estado final en `recursos`.

REGLA DE CERO REGRESIÓN: este módulo no reescribe la lógica de
extractor/chunker/embedder/ingest; los invoca con los mismos parámetros y
toma las mismas decisiones de estado que los scripts originales:

  - texto vacío          -> rag_status='failed'  (causa: empty_extraction)
  - secuencia de páginas -> rag_status='failed'  (causa: paginas_incompletas)
  - sin chunks           -> rag_status='failed'  (causa: no_chunks)
  - sin embeddings       -> rag_status='failed'  (causa: no_embeddings)
  - RecursoInaccesible   -> rag_status='skipped_permissions'
  - NetworkDownloadError -> rag_status='network_error'
  - inserción incompleta -> excepción (lo gestiona SyllabusIngestor)

La columna `rag_error` (nullable) se escribe junto a cada `rag_status` para
dejar constancia de la causa; es aditiva y no rompe lectores existentes.
"""
from __future__ import annotations

import logging
import shutil
import tempfile
import time
from pathlib import Path
from typing import Optional

from supabase import Client

from app.rag.chunker import SyllabusChunker
from app.rag.cost_tracker import cost_tracker
from app.rag.drive_downloader import (
    NetworkDownloadError,
    RecursoInaccesible,
    download_drive_file,
)
from app.rag.embedder import EmbeddingQuotaExhausted, SyllabusEmbedder
from app.rag.extraction_checkpoint import ExtractionCheckpoint
from app.rag.extractor import SyllabusExtractor
from app.rag.ingest import SyllabusIngestor
from app.rag.pipeline_config import (
    ESTADO_COMPLETE,
    ESTADO_FAILED,
    ESTADO_NETWORK_ERROR,
    ESTADO_RECLAMADO_POR_OTRO,
    ESTADO_SKIPPED_PERMISSIONS,
    ConfigIngesta,
    FuenteDocumento,
    IngestionError,
    ResultadoIngesta,
)

logger = logging.getLogger(__name__)

DOWNLOAD_DIR = Path(tempfile.gettempdir()) / "univia_rag_drive"


# ---------------------------------------------------------------------------
# Helpers de estado / checkpoints (lógica movida verbatim desde los scripts)
# ---------------------------------------------------------------------------

def actualizar_estado(
    sb: Client,
    recurso_id: int,
    estado: str,
    rag_error: Optional[str] = None,
    max_intentos: int = 3,
) -> None:
    """Actualiza rag_status (y rag_error) con reintentos ante microcortes.

    rag_error se limpia (None) cuando el estado es 'complete' o 'processing'
    y se fija con la causa cuando el estado es de fallo.
    """
    payload = {"rag_status": estado, "rag_error": rag_error}
    for intento in range(1, max_intentos + 1):
        try:
            sb.table("recursos").update(payload).eq("id", recurso_id).execute()
            return
        except Exception as e:
            logger.error(
                "Error actualizando estado del recurso %s a '%s' (intento %d/%d): %s.",
                recurso_id, estado, intento, max_intentos, e,
            )
            if intento < max_intentos:
                time.sleep(2)


def reclamar_recurso(sb: Client, recurso_id: int, force: bool = False) -> bool:
    """Reclama atómicamente una fila antes de iniciar su procesamiento."""
    query = sb.table("recursos").update({"rag_status": "processing"}).eq(
        "id", recurso_id
    )
    if not force:
        query = query.in_("rag_status", ["pending", "failed", "skipped_permissions"])
    resp = query.execute()
    return bool(resp.data)


def preparar_checkpoints(pdf_path: str, modified_time: Optional[str], resume: bool) -> None:
    """Borra checkpoints si el PDF cambió (drive_modified_time) o si no hay resume."""
    checkpoint_dir = Path(pdf_path).parent / f"{Path(pdf_path).stem}_checkpoints"
    marker = checkpoint_dir / ".drive_modified_time"
    version_anterior = marker.read_text(encoding="utf-8") if marker.exists() else None
    version_actual = modified_time or ""
    if checkpoint_dir.exists() and (not resume or version_anterior != version_actual):
        shutil.rmtree(checkpoint_dir)
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    marker.write_text(version_actual, encoding="utf-8")


def descargar_pdf(
    drive_file_id: str,
    connect_timeout: int = 15,
    read_timeout: int = 180,
    max_retries: int = 3,
) -> str:
    """Descarga el PDF de Drive a un archivo temporal y devuelve su ruta."""
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    tmp_path = DOWNLOAD_DIR / f"{drive_file_id}.pdf"
    logger.info("Descargando Drive file_id=%s con gdown.", drive_file_id)
    pdf_path = download_drive_file(drive_file_id, tmp_path, max_retries=max_retries)
    if not pdf_path:
        raise RecursoInaccesible(
            f"No se pudo descargar la ruta para drive_file_id={drive_file_id}"
        )
    return pdf_path


# ---------------------------------------------------------------------------
# Núcleo
# ---------------------------------------------------------------------------

class IngestionPipeline:
    """Procesa UN documento de punta a punta. Sin estado entre llamadas."""

    def __init__(self, supabase: Client, extractor: Optional[SyllabusExtractor] = None):
        self.sb = supabase
        # Los pesados (extractor/embedder) se crean perezosos por documento si
        # no se inyectan, para que el wrapper decida el rpm una sola vez.
        self._extractor = extractor
        self._embedders: dict[bool, SyllabusEmbedder] = {}

    # -- identidad --------------------------------------------------------

    def _registrar_recurso(self, titulo: str, curso_id: int, tipo: str) -> int:
        resp = self.sb.table("recursos").insert(
            {"curso_id": curso_id, "titulo": titulo, "tipo": tipo}
        ).execute()
        if not resp.data:
            raise RuntimeError("No se pudo registrar el recurso en BD.")
        return resp.data[0]["id"]

    def _buscar_recurso_existente(self, titulo: str, curso_id: int) -> Optional[int]:
        """Busca un recurso ya registrado con el mismo titulo y curso_id."""
        resp = (
            self.sb.table("recursos")
            .select("id")
            .eq("titulo", titulo)
            .eq("curso_id", curso_id)
            .limit(1)
            .execute()
        )
        return resp.data[0]["id"] if resp.data else None

    def _eliminar_recurso(self, recurso_id: int) -> None:
        try:
            self.sb.table("recursos").delete().eq("id", recurso_id).execute()
        except Exception as e:
            logger.warning("No se pudo eliminar el recurso %s: %s", recurso_id, e)

    # -- componentes ------------------------------------------------------

    def _extractor_para(self, rpm: int) -> SyllabusExtractor:
        if self._extractor is not None:
            return self._extractor
        return SyllabusExtractor(rpm=rpm)

    def _embedder_para(self, usar_cache: bool) -> SyllabusEmbedder:
        if usar_cache not in self._embedders:
            cache = None
            if usar_cache:
                try:
                    from app.rag.embedding_cache import EmbeddingCache
                    cache = EmbeddingCache(self.sb)
                except Exception as e:
                    logger.warning("EmbeddingCache no disponible (%s); sigo sin caché.", e)
            self._embedders[usar_cache] = SyllabusEmbedder(cache=cache)
        return self._embedders[usar_cache]

    # -- orquestación ------------------------------------------------------

    async def procesar_documento(
        self, fuente: FuenteDocumento, config: ConfigIngesta
    ) -> ResultadoIngesta:
        """Ejecuta el flujo completo para un documento.

        Nunca lanza excepciones por causas esperadas: devuelve
        ResultadoIngesta con el estado y la causa, aplicando la política
        `config.al_fallar` sobre la fila de `recursos`.
        """
        recurso_id = config.recurso_id
        recurso_creado = False
        resultado = ResultadoIngesta(recurso_id=recurso_id, estado=ESTADO_FAILED)

        try:
            # 1. Identidad del recurso -------------------------------------
            if recurso_id is None:
                if config.resume and config.titulo and config.curso_id is not None:
                    recurso_id = self._buscar_recurso_existente(config.titulo, config.curso_id)
                if recurso_id is None:
                    recurso_id = self._registrar_recurso(
                        config.titulo, config.curso_id, config.tipo_recurso
                    )
                    recurso_creado = True
                resultado.recurso_id = recurso_id
                resultado.recurso_creado = recurso_creado

            # 2. Claim atómico (flujo masivo multi-worker)
            if config.reclamar:
                if not reclamar_recurso(self.sb, recurso_id, config.force):
                    resultado.estado = ESTADO_RECLAMADO_POR_OTRO
                    resultado.causa_fallo = "claim_perdido"
                    resultado.detalle = "El recurso fue reclamado por otro worker."
                    return resultado

            # 3. Resolver el PDF local
            pdf_path = self._resolver_pdf(fuente, config)

            # 4. Checkpoints (solo flujo Drive historico)
            if config.preparar_checkpoints_drive:
                preparar_checkpoints(pdf_path, fuente.drive_modified_time, config.resume)

            # 5. Extracción
            extractor = self._extractor_para(config.rpm)
            texto = await self._extraer(extractor, pdf_path, config)
            metricas = extractor.last_run_stats or {}
            resultado.paginas_total = int(metricas.get("total_pages", 0))
            resultado.paginas_nativas = int(metricas.get("native_pages", 0))
            resultado.paginas_vision = int(metricas.get("vision_pages", 0))
            resultado.llamadas_vision = int(metricas.get("vision_calls", 0))

            if not texto or not texto.strip():
                raise IngestionError(
                    "Sin texto extraído (posible cuota agotada o página no legible).",
                    causa="empty_extraction",
                )

            # 6. Validación de páginas
            if config.modo_extraccion == "sync":
                # Flujo legacy compendio: valida contra el markdown output.
                paginas_ok = SyllabusExtractor._find_completed_pages(texto)
                if not paginas_ok:
                    raise IngestionError(
                        "No hay páginas con contenido real. Revisa los logs del extractor.",
                        causa="empty_extraction",
                    )
                resultado.paginas_total = resultado.paginas_total or len(paginas_ok)
            elif config.validar_secuencia_paginas:
                self._validar_secuencia(pdf_path, resultado.paginas_total)

            # 7. Chunking
            chunks = SyllabusChunker().chunk_text(texto)
            if not chunks:
                raise IngestionError(
                    "El chunker no generó fragmentos.", causa="no_chunks"
                )

            # 8. Embeddings (con caché opcional). Modo estricto: si la cuota
            # se agota tras reintentos, EmbeddingQuotaExhausted corta aquí y
            # el recurso se marca failed/quota_exhausted — nunca complete.
            embedder = self._embedder_para(config.usar_cache_embeddings)
            embeddings = embedder.embedding_generator(chunks, estricto=True)
            if not embeddings:
                raise IngestionError(
                    "El embedder no generó vectores.", causa="no_embeddings"
                )
            if len(embeddings) < len(chunks):
                # Completitud: NUNCA debe marcarse 'complete' con vectores
                # faltantes (el embedding diftó lotes por errores no-429).
                raise IngestionError(
                    f"Embeddings incompletos: {len(embeddings)}/{len(chunks)} "
                    "chunks vectorizados. Se requiere reintento del documento.",
                    causa="embeddings_incomplete",
                )

            # 9. Ingesta (transaccional 'replace' o inserción simple 'insert')
            ingestor = SyllabusIngestor(client=self.sb)
            if config.metodo_ingesta == "replace":
                insertados = ingestor.replace(
                    embeddings,
                    recurso_id=recurso_id,
                    curso_id=config.curso_id,
                    drive_modified_time=fuente.drive_modified_time,
                    expected_dims=embedder.expected_dimensions,
                )
                if insertados != len(embeddings):
                    raise RuntimeError(
                        f"La RPC confirmó {insertados}/{len(embeddings)} chunks"
                    )
            else:
                ok = ingestor.ingest(
                    embeddings,
                    recurso_id=recurso_id,
                    curso_id=config.curso_id,
                    expected_dims=embedder.expected_dimensions,
                )
                if not ok:
                    raise IngestionError(
                        "El ingestor reportó fallo.", causa="ingest_fallo"
                    )
                insertados = len(embeddings)

            # 10. Estado final
            resultado.estado = ESTADO_COMPLETE
            resultado.chunks_insertados = insertados
            if recurso_id is not None and not recurso_creado:
                # 'replace' ya marca complete vía mark_rag_complete; en 'insert'
                # histórico (compendio) el script no tocaba rag_status. Solo lo
                # fijamos explícitamente cuando veníamos del flujo con reclamo.
                if config.reclamar or config.metodo_ingesta == "insert":
                    actualizar_estado(self.sb, recurso_id, ESTADO_COMPLETE, rag_error=None)
            return resultado

        except RecursoInaccesible as e:
            resultado.estado = ESTADO_SKIPPED_PERMISSIONS
            resultado.causa_fallo = "drive_permisos"
            resultado.detalle = str(e)
        except NetworkDownloadError as e:
            resultado.estado = ESTADO_NETWORK_ERROR
            resultado.causa_fallo = "network_error"
            resultado.detalle = str(e)
        except EmbeddingQuotaExhausted as e:
            resultado.estado = ESTADO_FAILED
            resultado.causa_fallo = "quota_exhausted"
            resultado.detalle = str(e)
        except IngestionError as e:
            resultado.estado = e.estado
            resultado.causa_fallo = e.causa
            resultado.detalle = str(e)
        except Exception as e:  # noqa: BLE001 - el wrapper decide contadores
            resultado.estado = ESTADO_FAILED
            resultado.causa_fallo = "error_inesperado"
            resultado.detalle = str(e)

        # Política de fallo sobre la fila de `recursos`.
        if resultado.recurso_id is not None and config.al_fallar == "eliminar_recurso":
            if recurso_creado:
                self._eliminar_recurso(resultado.recurso_id)
        elif (
            resultado.recurso_id is not None
            and resultado.estado != ESTADO_RECLAMADO_POR_OTRO
            and not (recurso_creado and config.al_fallar == "eliminar_recurso")
        ):
            actualizar_estado(
                self.sb,
                resultado.recurso_id,
                resultado.estado,
                rag_error=resultado.causa_fallo,
            )
        return resultado

    # -- pasos internos ----------------------------------------------------

    def _resolver_pdf(self, fuente: FuenteDocumento, config: ConfigIngesta) -> str:
        if fuente.tipo == "drive":
            if not fuente.drive_file_id:
                raise IngestionError("Fuente drive sin drive_file_id.", causa="sin_drive_id")
            return descargar_pdf(
                fuente.drive_file_id,
                connect_timeout=config.connect_timeout,
                read_timeout=config.read_timeout,
            )
        pdf_path = str(fuente.pdf_path or "")
        if not pdf_path:
            raise IngestionError("Fuente local/upload sin pdf_path.", causa="sin_pdf_path")
        return pdf_path

    async def _extraer(
        self, extractor: SyllabusExtractor, pdf_path: str, config: ConfigIngesta
    ) -> str:
        modo = config.resolver_modo_ocr()
        if config.modo_extraccion == "sync":
            # Flujo legacy de cargar_compendio (extract_text línea 301).
            return extractor.extract_text(
                pdf_path,
                modo=modo,
                output_path=config.output_path,
                dpi=config.dpi,
                salvage=config.salvage,
                skip_failed=config.skip_failed,
            )
        return await extractor.extract_text_async(
            pdf_path,
            modo=modo,
            dpi=config.dpi,
            salvage=config.salvage,
            max_concurrency=config.max_concurrency,
            hybrid=config.hybrid,
            forzar_nativo=config.forzar_nativo,
        )

    @staticmethod
    def _validar_secuencia(pdf_path: str, total_paginas: int) -> None:
        paginas_completadas = ExtractionCheckpoint(pdf_path).completed_pages()
        paginas_esperadas = set(range(1, total_paginas + 1))
        if paginas_completadas != paginas_esperadas:
            faltantes = sorted(paginas_esperadas - paginas_completadas)
            inesperadas = sorted(paginas_completadas - paginas_esperadas)
            raise IngestionError(
                "Secuencia de páginas inconsistente. "
                f"Faltantes: {faltantes}; inesperadas: {inesperadas}. "
                "No se generarán embeddings ni se llamará a la RPC.",
                causa="paginas_incompletas",
            )
