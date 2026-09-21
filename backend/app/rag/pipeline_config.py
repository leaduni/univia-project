"""Contratos de entrada/salida del pipeline unificado de ingesta RAG.

Estas dataclasses no contienen lógica: solo tipan los parámetros con los que
los wrappers CLI (generar_chunks_desde_drive.py, cargar_compendio.py) y el
futuro endpoint POST /recursos/upload invocan a IngestionPipeline.

Cero regresión: cada campo mapea 1:1 con un flag o comportamiento que ya
existía en los scripts actuales; los defaults reproducen el comportamiento
histórico de cada flujo.
"""

from dataclasses import dataclass, field
from typing import Literal, Optional

# Mapeo tipo de recurso -> modo OCR, usado cuando modo_ocr="auto".
# Conserva la convención actual: sílabos usan PROMPT_SILABO, todo lo demás
# (exámenes, prácticas, compendios, libros, apuntes) usa PROMPT_EXAMENES.
TIPOS_MODO_SILABO = {"silabo", "Silabo", "syllabus"}


def derivar_modo_ocr(tipo_recurso: str) -> str:
    """Modo OCR por defecto según el tipo declarado del recurso."""
    return "silabo" if (tipo_recurso or "").lower() in {t.lower() for t in TIPOS_MODO_SILABO} else "examenes"


@dataclass
class FuenteDocumento:
    """De dónde sale el PDF.

    tipos:
      - "drive":  se descarga con drive_downloader (requiere drive_file_id).
      - "local":  ya existe en disco (pdf_path). No se descarga ni se borran
                  checkpoints salvo resume=False con prepare_checkpoints=True.
      - "upload": igual que "local"; la diferencia semántica la maneja el
                  llamador (futuro endpoint web).
    """
    tipo: Literal["drive", "local", "upload"]
    drive_file_id: Optional[str] = None
    drive_modified_time: Optional[str] = None
    pdf_path: Optional[str] = None


@dataclass
class ConfigIngesta:
    """Configuración completa de una ingesta individual.

    Identidad del recurso:
      recurso_id: si viene, el pipeline NO crea fila en `recursos` (caso
          Drive/BD). Si es None, se registra una fila nueva con
          titulo/curso_id/tipo_recurso (caso compendio local / upload).
    """
    recurso_id: Optional[int] = None
    titulo: Optional[str] = None
    curso_id: Optional[int] = None
    tipo_recurso: str = "Compendio"

    # Extracción
    modo_ocr: str = "examenes"          # "silabo" | "examenes" | "auto"
    modo_extraccion: str = "async"      # "async" | "sync"
    rpm: int = 8
    dpi: int = 200
    salvage: bool = True
    skip_failed: bool = False
    hybrid: bool = True                 # HybridRouter (texto nativo vs Vision)
    forzar_nativo: bool = False         # solo aplica con hybrid=True y async
    max_concurrency: int = 8
    output_path: Optional[str] = None   # solo modo sync (compendio legacy)

    # Checkpoints / reanudación
    resume: bool = False
    preparar_checkpoints_drive: bool = False  # borra checkpoints si cambió modified_time
    validar_secuencia_paginas: bool = True    # exige páginas 1..N completas

    # Embeddings / ingesta
    usar_cache_embeddings: bool = True  # activa EmbeddingCache (tabla Supabase)
    metodo_ingesta: str = "replace"     # "replace" (RPC transaccional) | "insert"

    # Control de estados en `recursos`
    reclamar: bool = False              # claim atómico rag_status='processing'
    force: bool = False                 # permite reclamar aunque no esté pending/failed
    al_fallar: str = "marcar_fallido"   # "marcar_fallido" | "eliminar_recurso"
    connect_timeout: int = 15
    read_timeout: int = 180

    def resolver_modo_ocr(self) -> str:
        return derivar_modo_ocr(self.tipo_recurso) if self.modo_ocr == "auto" else self.modo_ocr


# Estados finales que puede devolver ResultadoIngesta. Los valores de la
# columna rag_status de `recursos` se conservan EXACTAMENTE como hoy:
# complete / failed / skipped_permissions / network_error (+ claim).
ESTADO_COMPLETE = "complete"
ESTADO_FAILED = "failed"
ESTADO_SKIPPED_PERMISSIONS = "skipped_permissions"
ESTADO_NETWORK_ERROR = "network_error"
ESTADO_RECLAMADO_POR_OTRO = "reclamado_por_otro"  # no se escribe en BD


@dataclass
class ResultadoIngesta:
    recurso_id: Optional[int]
    estado: str                        # uno de los ESTADO_* de arriba
    causa_fallo: Optional[str] = None  # código corto p/ rag_error (nullable en BD)
    detalle: Optional[str] = None      # mensaje legible
    paginas_total: int = 0
    paginas_nativas: int = 0
    paginas_vision: int = 0
    llamadas_vision: int = 0
    chunks_insertados: int = 0
    recurso_creado: bool = False       # True si el pipeline registró la fila

    @property
    def ok(self) -> bool:
        return self.estado == ESTADO_COMPLETE


class IngestionError(RuntimeError):
    """Error controlado del pipeline con estado BD y causa asociados."""

    def __init__(self, mensaje: str, causa: str = "error", estado: str = ESTADO_FAILED):
        super().__init__(mensaje)
        self.causa = causa
        self.estado = estado
