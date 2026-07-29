"""Registro y consulta de actividad del estudiante (RF-21, RF-22).

Se apoya en la tabla `eventos_actividad`, creada por
`base_de_datos/esquema/migracion_fase3_actividad.sql`.

Todas las escrituras son best-effort: registrar actividad es telemetría, no
parte del trámite que el estudiante está haciendo. Si falla el insert de un
evento de login, el login igual debe completarse.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

TABLA = "eventos_actividad"

TIPO_LOGIN = "login"
TIPO_EVALUACION = "evaluacion"
TIPO_UNIDAD = "unidad_completada"
TIPO_CURSO_COMPLETADO = "curso_completado"

# Periodos admitidos por el filtro de RF-22, en días.
PERIODOS: Dict[str, Optional[int]] = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "semestre": 180,
    "todo": None,
}
PERIODO_POR_DEFECTO = "30d"


def _tabla_ausente(error: Exception) -> bool:
    """True si el error es 'la tabla no existe' y no otra falla."""
    texto = str(error)
    return "PGRST205" in texto or "Could not find the table" in texto


def registrar_evento(
    supabase,
    perfil_id,
    tipo: str,
    curso_id: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> bool:
    """Deja constancia de una actividad. Nunca propaga errores.

    Returns:
        True si se registró; False si no se pudo (y quedó en el log).
    """
    fila = {
        "perfil_id": str(perfil_id),
        "tipo": tipo,
        "metadata": metadata or {},
    }
    if curso_id is not None:
        fila["curso_id"] = curso_id

    try:
        supabase.table(TABLA).insert(fila).execute()
        return True
    except Exception as e:
        if _tabla_ausente(e):
            logger.warning(
                f"Tabla '{TABLA}' no existe; no se registró el evento '{tipo}'. "
                "Falta ejecutar migracion_fase3_actividad.sql."
            )
        else:
            logger.error(f"No se pudo registrar el evento '{tipo}' de {perfil_id}: {e}")
        return False


def fecha_desde(periodo: str) -> Optional[str]:
    """Fecha de corte ISO para un periodo, o None si el periodo es 'todo'."""
    dias = PERIODOS.get(periodo, PERIODOS[PERIODO_POR_DEFECTO])
    if dias is None:
        return None
    return (datetime.now(timezone.utc) - timedelta(days=dias)).isoformat()


def consultar_eventos(
    supabase,
    perfil_id,
    periodo: str = PERIODO_POR_DEFECTO,
    curso_id: Optional[int] = None,
) -> List[dict]:
    """Eventos del estudiante, filtrados por periodo y curso (RF-22).

    Devuelve lista vacía si la tabla todavía no existe, para que el dashboard
    siga respondiendo en un entorno sin la migración aplicada.
    """
    try:
        consulta = (
            supabase.table(TABLA)
            .select("tipo, curso_id, metadata, created_at")
            .eq("perfil_id", str(perfil_id))
        )

        corte = fecha_desde(periodo)
        if corte:
            consulta = consulta.gte("created_at", corte)
        if curso_id is not None:
            consulta = consulta.eq("curso_id", curso_id)

        resp = consulta.order("created_at", desc=True).execute()
        return getattr(resp, "data", None) or []
    except Exception as e:
        if _tabla_ausente(e):
            logger.warning(
                f"Tabla '{TABLA}' no existe; la actividad se reporta vacía. "
                "Falta ejecutar migracion_fase3_actividad.sql."
            )
        else:
            logger.error(f"Error consultando actividad de {perfil_id}: {e}")
        return []


def resumir_eventos(eventos: List[dict]) -> Dict[str, Any]:
    """Conteos de RF-21 a partir de los eventos ya filtrados.

    Cálculo puro: recibe los eventos leídos y no consulta la base.
    """
    inicios_sesion = 0
    rendidas = 0
    aprobadas = 0
    notas: List[float] = []
    unidades = 0
    ultimo_acceso: Optional[str] = None

    for evento in eventos:
        tipo = evento.get("tipo")
        creado = evento.get("created_at")

        # Los eventos vienen ordenados de más nuevo a más viejo.
        if ultimo_acceso is None and creado:
            ultimo_acceso = creado

        if tipo == TIPO_LOGIN:
            inicios_sesion += 1
        elif tipo == TIPO_EVALUACION:
            rendidas += 1
            meta = evento.get("metadata") or {}
            if meta.get("aprobado"):
                aprobadas += 1
            nota = meta.get("nota")
            if nota is not None:
                try:
                    notas.append(float(nota))
                except (TypeError, ValueError):
                    logger.warning(f"Nota no numérica en un evento de evaluación: {nota!r}")
        elif tipo == TIPO_UNIDAD:
            unidades += 1

    return {
        "inicios_sesion": inicios_sesion,
        "evaluaciones_rendidas": rendidas,
        "evaluaciones_aprobadas": aprobadas,
        # Sobre las rendidas, no sobre el total de eventos.
        "tasa_aprobacion": round(aprobadas / rendidas * 100, 1) if rendidas else 0.0,
        "nota_promedio_evaluaciones": round(sum(notas) / len(notas), 2) if notas else 0.0,
        "unidades_completadas": unidades,
        "ultimo_acceso": ultimo_acceso,
        "total_eventos": len(eventos),
    }


def actividad_por_dia(eventos: List[dict]) -> List[dict]:
    """Eventos agrupados por día, para dibujar la racha de estudio.

    Orden cronológico ascendente: un gráfico se lee de izquierda a derecha.
    """
    por_dia: Dict[str, int] = {}
    for evento in eventos:
        creado = evento.get("created_at")
        if not creado:
            continue
        dia = str(creado)[:10]  # YYYY-MM-DD
        por_dia[dia] = por_dia.get(dia, 0) + 1

    return [{"fecha": dia, "eventos": por_dia[dia]} for dia in sorted(por_dia)]
