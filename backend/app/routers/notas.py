"""Notas inmutables: historial por curso e indicador académico.

Lectura exclusiva de las vistas `v_nota_curso_inmutable` y
`v_promedio_academico_inmutable` (Fase 10). No se toca `progreso_cursos.nota`:
el flujo existente de dashboard/malla sigue leyendo esa columna intacta.
"""

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth_utils import get_current_user
from app.core.database import get_supabase
from app.schemas.gamificacion import (
    HistorialCurso,
    IntentoHistorico,
    NotaPorCurso,
    ResumenNotas,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notas", tags=["notas"])

_COLUMNAS_INTENTO = (
    "id, evaluacion_id, curso_id, nota, puntaje_obtenido, puntaje_maximo, fecha_completado"
)


def _run(fn):
    """Ejecuta una llamada bloqueante de Supabase en un hilo aparte."""
    return asyncio.to_thread(fn)


@router.get("/cursos/{curso_id}/historial", response_model=HistorialCurso)
async def historial_curso(curso_id: int, user_data=Depends(get_current_user)):
    """Curva de notas inmutables de un curso: intentos y promedio ponderado."""
    user, token = user_data
    supabase = get_supabase(token)

    try:
        resp = await _run(
            lambda: (
                supabase.table("evaluacion_intentos")
                .select(_COLUMNAS_INTENTO)
                .eq("perfil_id", str(user.id))
                .eq("curso_id", curso_id)
                .order("fecha_completado", desc=True)
                .execute()
            )
        )
        resp_avg = await _run(
            lambda: (
                supabase.from_("v_nota_curso_inmutable")
                .select("nota_promedio, intentos, ultima_fecha")
                .eq("perfil_id", str(user.id))
                .eq("curso_id", curso_id)
                .maybe_single()
                .execute()
            )
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[NOTAS] Error leyendo historial de %s: %s", curso_id, e)
        raise HTTPException(status_code=500, detail="No se pudo cargar el historial de notas.")

    intentos = getattr(resp, "data", None) or []
    promedio = getattr(resp_avg, "data", None) or {}

    return HistorialCurso(
        curso_id=curso_id,
        nota_promedio=float(promedio["nota_promedio"]) if promedio.get("nota_promedio") is not None else None,
        total_intentos=len(intentos),
        ultima_fecha=promedio.get("ultima_fecha") or (intentos[0]["fecha_completado"] if intentos else None),
        intentos=[
            IntentoHistorico(
                id=i["id"],
                evaluacion_id=i["evaluacion_id"],
                curso_id=i["curso_id"],
                nota=float(i["nota"]),
                puntaje_obtenido=float(i["puntaje_obtenido"]),
                puntaje_maximo=float(i["puntaje_maximo"]),
                fecha_completado=i["fecha_completado"],
            )
            for i in intentos
        ],
    )


@router.get("/resumen", response_model=ResumenNotas)
async def resumen_notas(user_data=Depends(get_current_user)):
    """Promedio académico inmutable ponderado por créditos + resumen por curso."""
    user, token = user_data
    supabase = get_supabase(token)

    try:
        resp_prom = await _run(
            lambda: (
                supabase.from_("v_promedio_academico_inmutable")
                .select("promedio_ponderado")
                .eq("perfil_id", str(user.id))
                .maybe_single()
                .execute()
            )
        )
        resp_por_curso = await _run(
            lambda: (
                supabase.from_("v_nota_curso_inmutable")
                .select("*")
                .eq("perfil_id", str(user.id))
                .order("ultima_fecha", desc=True)
                .execute()
            )
        )
        resp_total = await _run(
            lambda: (
                supabase.table("evaluacion_intentos")
                .select("id", count="exact")
                .eq("perfil_id", str(user.id))
                .execute()
            )
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[NOTAS] Error leyendo resumen de %s: %s", user.id, e)
        raise HTTPException(status_code=500, detail="No se pudo cargar el resumen de notas.")

    promedio = getattr(resp_prom, "data", None) or {}
    filas = getattr(resp_por_curso, "data", None) or []
    total_intentos = int(getattr(resp_total, "count", 0) or 0)

    curso_ids = [fila["curso_id"] for fila in filas]
    nombres: dict = {}
    if curso_ids:
        try:
            resp_cursos = await _run(
                lambda: supabase.table("cursos").select("id, code, name").in_("id", curso_ids).execute()
            )
            nombres = {
                c["id"]: (c.get("name"), c.get("code"))
                for c in (getattr(resp_cursos, "data", None) or [])
            }
        except Exception as e:  # noqa: BLE001
            logger.warning("[NOTAS] No se pudieron cargar nombres de cursos: %s", e)

    por_curso = [
        NotaPorCurso(
            curso_id=fila["curso_id"],
            curso=nombres.get(fila["curso_id"], (None, None))[0],
            codigo=nombres.get(fila["curso_id"], (None, None))[1],
            nota_promedio=float(fila["nota_promedio"]) if fila.get("nota_promedio") is not None else None,
            intentos=int(fila.get("intentos") or 0),
            ultima_fecha=fila.get("ultima_fecha"),
        )
        for fila in filas
    ]

    return ResumenNotas(
        promedio_academico=float(promedio["promedio_ponderado"]) if promedio.get("promedio_ponderado") is not None else None,
        total_intentos=total_intentos,
        cursos_con_nota=len(por_curso),
        por_curso=por_curso,
    )