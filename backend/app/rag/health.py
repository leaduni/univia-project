"""Registro ligero de salud del subsistema RAG.

Propósito: que las fallas silenciosas (p. ej. `vectorizar_consulta` devolviendo
[] por falta de saldo del proveedor de embeddings) queden registradas con
timestamp y componente, en lugar de pasar desapercibidas mientras el chatbot
degrada suavemente.

Es in-memory por proceso (sin dependencias nuevas). Los lectores externos
(endpoints de health, logs) consultan `ultimos_fallos()` / `estado()`.
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Optional

_lock = threading.Lock()

# Máximo de fallos retenidos por componente (los más recientes).
_MAX_POR_COMPONENTE = 20


@dataclass
class FalloRAG:
    componente: str          # "embeddings_query" | "embeddings_ingesta" | ...
    mensaje: str
    timestamp: float = field(default_factory=time.time)


_fallos: dict[str, list[FalloRAG]] = {}


def reportar_fallo(componente: str, error: BaseException | str) -> None:
    """Registra un fallo del subsistema RAG para observabilidad activa.

    No lanza ni interfiere con el flujo del llamador: es observabilidad pura.
    """
    entrada = FalloRAG(componente=componente, mensaje=str(error)[:500])
    with _lock:
        lista = _fallos.setdefault(componente, [])
        lista.append(entrada)
        del lista[:-_MAX_POR_COMPONENTE]


def ultimo_fallo(componente: str) -> Optional[FalloRAG]:
    with _lock:
        lista = _fallos.get(componente) or []
        return lista[-1] if lista else None


def estado() -> dict:
    """Resumen por componente: último fallo y edad en segundos."""
    ahora = time.time()
    with _lock:
        return {
            comp: {
                "ultimo_mensaje": fallos[-1].mensaje,
                "ultimo_hace_s": round(ahora - fallos[-1].timestamp, 1),
                "conteo_reciente": len(fallos),
            }
            for comp, fallos in _fallos.items()
            if fallos
        }
