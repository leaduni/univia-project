"""Evaluaciones calificables: sesiones y entrega con corrección en el servidor.

SEPARACIÓN con la práctica IA (app/routers/evaluaciones.py): la práctica IA
sigue funcionando intacta y jamás toca el récord académico. Este router maneja
solo evaluaciones publicadas (`evaluaciones_publicadas`), cuyo puntaje recalcula
100% el servidor (RPC `fase10_registrar_intento`) contra la clave congelada en
la sesión; el navegador envía solo preguntas respondidas y jamás influye en la
nota ni en el XP.
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.auth_utils import get_current_user
from app.core.database import get_admin_client, get_supabase
from app.core.rate_limit import limiter
from app.core.rpc import invocar_rpc
from app.schemas.gamificacion import (
    CuerpoEntregar,
    RegistrarPracticaUnidad,
    ResultadoEntrega,
    IntentoEntregado,
    SesionCreada,
    SolicitudSesion,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["evaluaciones-calificables"])

# Duración de una sesión de evaluación calificable (configurable por entorno).
DURACION_SESION_MIN = int(os.getenv("EVALUACION_SESION_MINUTOS", "120"))

# Columnas que viajan al estudiante en el snapshot de preguntas (sin claves).
_CAMPOS_PREGUNTA = ("pregunta_id", "enunciado", "opciones", "tipo", "valor")


def _run(fn):
    """Ejecuta una llamada bloqueante de Supabase en un hilo aparte."""
    return asyncio.to_thread(fn)


def _a_datetime(valor) -> "datetime | None":
    """Convierte una fecha ISO devuelta por Supabase a datetime con timezone."""
    if not valor:
        return None
    if isinstance(valor, datetime):
        dt = valor
    else:
        dt = datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


@router.post("/evaluaciones/calificables/sesiones", status_code=201, response_model=SesionCreada)
@limiter.limit("30/minute")
async def crear_sesion_calificable(
    request: Request,
    data: SolicitudSesion,
    user_data=Depends(get_current_user),
):
    """Abre una sesión de evaluación calificable para el estudiante.

    Valida ventana de publicación y límite de intentos, y crea la sesión con un
    snapshot de preguntas sin respuestas y la clave de corrección que el
    servidor usará al entregar. La clave nunca sale en la respuesta.
    """
    user, token = user_data
    admin = get_admin_client()

    try:
        resp_pub = await _run(
            lambda: (
                admin.table("evaluaciones_publicadas")
                .select("*")
                .eq("id", data.evaluacion_id)
                .maybe_single()
                .execute()
            )
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[EVAL-CALIF] Error leyendo publicación %s: %s", data.evaluacion_id, e)
        raise HTTPException(status_code=500, detail="No se pudo iniciar la evaluación.")

    pub = getattr(resp_pub, "data", None)
    if not pub:
        raise HTTPException(status_code=404, detail="La evaluación no existe.")

    ahora = datetime.now(timezone.utc)
    if pub.get("estado") != "publicada":
        raise HTTPException(status_code=409, detail="La evaluación aún no está publicada.")
    abre = _a_datetime(pub.get("abre_at"))
    cierra = _a_datetime(pub.get("cierra_at"))
    if abre and abre > ahora:
        raise HTTPException(status_code=409, detail="La evaluación aún no está abierta.")
    if cierra and cierra < ahora:
        raise HTTPException(status_code=409, detail="La ventana de evaluación ya cerró.")

    try:
        resp_cont = await _run(
            lambda: (
                admin.table("evaluacion_intentos")
                .select("id", count="exact")
                .eq("perfil_id", str(user.id))
                .eq("evaluacion_id", data.evaluacion_id)
                .execute()
            )
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[EVAL-CALIF] Error contando intentos: %s", e)
        raise HTTPException(status_code=500, detail="No se pudo iniciar la evaluación.")

    total_intentos = int(getattr(resp_cont, "count", 0) or 0)
    max_intentos = int(pub.get("max_intentos") or 1)
    if total_intentos >= max_intentos:
        raise HTTPException(
            status_code=409,
            detail=f"Alcanzaste el límite de {max_intentos} intento(s) para esta evaluación.",
        )

    preguntas = pub.get("preguntas") or []
    preguntas_snapshot = {
        "version": pub.get("version", 1),
        "preguntas": [
            {campo: q[campo] for campo in _CAMPOS_PREGUNTA if campo in q}
            for q in preguntas
        ],
    }

    vence = ahora + timedelta(minutes=DURACION_SESION_MIN)
    if cierra and cierra < vence:
        vence = cierra

    fila = {
        "evaluacion_id": pub["id"],
        "perfil_id": str(user.id),
        "preguntas_snapshot": preguntas_snapshot,
        "clave_respuestas": pub.get("clave_respuestas") or {},
        "vence_at": vence.isoformat(),
    }

    try:
        resp_ins = await _run(
            lambda: (
                admin.table("evaluacion_sesiones")
                .insert(fila)
                .select("*")
                .single()
                .execute()
            )
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[EVAL-CALIF] Error creando sesión: %s", e)
        raise HTTPException(status_code=500, detail="No se pudo iniciar la evaluación.")

    sesion = getattr(resp_ins, "data", None)
    if not sesion:
        raise HTTPException(status_code=500, detail="No se pudo iniciar la evaluación.")

    return SesionCreada(
        id=sesion["id"],
        evaluacion_id=sesion["evaluacion_id"],
        curso_id=pub.get("curso_id"),
        titulo=pub.get("titulo", ""),
        peso=float(pub.get("peso") or 1),
        puntaje_maximo=float(pub.get("puntaje_maximo") or 0),
        version=int(pub.get("version") or 1),
        max_intentos=max_intentos,
        preguntas_snapshot=sesion["preguntas_snapshot"],
        iniciada_at=sesion["iniciada_at"],
        vence_at=sesion.get("vence_at"),
    )


@router.post("/evaluaciones/{sesion_id}/entregar", response_model=ResultadoEntrega)
@limiter.limit("20/minute")
async def entregar_sesion(
    request: Request,
    sesion_id: str,
    data: CuerpoEntregar,
    user_data=Depends(get_current_user),
):
    """Corrige en el servidor, registra el intento inmutable y otorga XP.

    La RPC `fase10_registrar_intento` valida titularidad, vencimiento, ventana y
    límite de intentos; recalcula el puntaje contra la clave de la sesión;
    escribe el intento y el ledger de forma idempotente. Este endpoint solo
    reenvía las respuestas y devuelve el resultado.
    """
    user, token = user_data
    supabase = get_supabase(token)

    respuestas = [
        {"pregunta_id": r.pregunta_id, "respuesta": r.respuesta}
        for r in data.respuestas
    ]
    filas = await invocar_rpc(
        supabase,
        "fase10_registrar_intento",
        {
            "p_sesion": sesion_id,
            "p_respuestas": respuestas,
            "p_metadata": data.metadata,
        },
    )
    if not filas:
        raise HTTPException(status_code=500, detail="No se pudo registrar el intento.")

    fila = filas[0]
    intento_id = fila.get("intent_id")
    if not intento_id:
        raise HTTPException(status_code=500, detail="No se pudo registrar el intento.")

    try:
        resp_int = await _run(
            lambda: (
                supabase.table("evaluacion_intentos")
                .select(
                    "id, evaluacion_id, curso_id, nota, puntaje_obtenido, "
                    "puntaje_maximo, fecha_completado"
                )
                .eq("id", intento_id)
                .maybe_single()
                .execute()
            )
        )
        intento = getattr(resp_int, "data", None)
        if not intento:
            raise HTTPException(status_code=404, detail="El intento no existe.")

        resp_prom = await _run(
            lambda: (
                supabase.from_("v_nota_curso_inmutable")
                .select("nota_promedio")
                .eq("perfil_id", str(user.id))
                .eq("curso_id", intento["curso_id"])
                .maybe_single()
                .execute()
            )
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("[EVAL-CALIF] Error leyendo intento %s: %s", intento_id, e)
        raise HTTPException(status_code=500, detail="No se pudo confirmar la entrega.")

    promedio = (getattr(resp_prom, "data", None) or {}).get("nota_promedio")

    return ResultadoEntrega(
        intento=IntentoEntregado(
            id=intento["id"],
            evaluacion_id=intento["evaluacion_id"],
            curso_id=intento["curso_id"],
            nota=float(intento["nota"]),
            puntaje_obtenido=float(intento["puntaje_obtenido"]),
            puntaje_maximo=float(intento["puntaje_maximo"]),
            fecha_completado=intento["fecha_completado"],
        ),
        nota_curso_promedio=float(promedio) if promedio is not None else None,
        xp_otorgado=int(fila.get("xp_otorgado") or 0),
    )