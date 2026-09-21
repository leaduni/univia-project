"""Invocación de RPCs de Supabase con traducción de errores de PostgREST.

Los RPC de Fase 10 (`fase10_*`) son `SECURITY DEFINER` y pueden fallar con
excepciones controladas de Postgres (SQLSTATE 28000, 22023, 23505, 55000...).
Este módulo centraliza su ejecución en un hilo aparte (el cliente supabase-py
es síncrono) y traduce esos códigos a HTTP con mensajes seguros para el
estudiante, el mismo criterio que sigue el resto del backend.
"""

import asyncio
import logging
import re

from fastapi import HTTPException

logger = logging.getLogger(__name__)


def _detalles(exc: Exception) -> dict:
    """Extrae `code`/`message`/`details` de una ApiError de supabase-py."""
    code = str(getattr(exc, "code", "") or "")
    message = str(getattr(exc, "message", "") or exc)
    details = str(getattr(exc, "details", "") or "")
    texto = f"{message} {details} {code}"
    if not code:
        coincidencia = re.search(r"(?:SQLSTATE|ERRCODE)[=:\s]*([0-9A-Z]{5})", texto)
        if coincidencia:
            code = coincidencia.group(1)
    return {"code": code.upper(), "message": message, "texto": texto}


def traducir_error(exc: Exception) -> HTTPException:
    """Convierte un fallo de RPC en un HTTPException acorde al código PG."""
    info = _detalles(exc)
    codigo = info["code"]
    if codigo == "28000":
        return HTTPException(status_code=401, detail="Sesión inválida o expirada.")
    if codigo == "55000":
        return HTTPException(
            status_code=409,
            detail="Operación rechazada: los registros académicos son inmutables.",
        )
    if codigo == "PGRST116":
        return HTTPException(status_code=404, detail="No se encontró el recurso solicitado.")
    if codigo in ("22023", "23514"):
        return HTTPException(
            status_code=409,
            detail=info["message"] or "La operación no es válida en este momento.",
        )
    if codigo == "23505":
        return HTTPException(status_code=409, detail="Esta operación ya fue registrada.")
    # Cualquier otro fallo controlado se expone sin detalles internos.
    logger.warning("RPC rechazado por Postgres: %s", info["texto"][:300])
    return HTTPException(
        status_code=400,
        detail=info["message"] or "La operación fue rechazada por el servidor.",
    )


async def invocar_rpc(supabase, nombre: str, params: dict) -> list:
    """Ejecuta `supabase.rpc(nombre, params)` y devuelve la lista de filas."""
    try:
        resp = await asyncio.to_thread(lambda: supabase.rpc(nombre, params).execute())
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — cualquier ApiError de PostgREST
        raise traducir_error(exc) from exc
    return getattr(resp, "data", None) or []