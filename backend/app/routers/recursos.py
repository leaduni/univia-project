"""Endpoint stub de recursos académicos.

El frontend consume GET /api/recursos para la sección 'Recursos nuevos en tus
cursos' del dashboard y la biblioteca de recursos.  Hasta que se implemente el
banco de recursos completo, este router devuelve una lista vacía y el frontend
muestra su fallback de datos de ejemplo.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from app.core.auth_utils import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/recursos")
async def get_recursos(
    tipo: Optional[str] = Query(None),
    ciclo: Optional[int] = Query(None),
    codigo_curso: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user_data=Depends(get_current_user),
):
    """Lista de recursos académicos (stub — devuelve vacío por ahora)."""
    return []
