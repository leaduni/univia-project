import asyncio
import logging

from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.actividad import (
    PERIODO_POR_DEFECTO,
    PERIODOS,
    actividad_por_dia,
    consultar_eventos,
    resumir_eventos,
)
from app.core.avance import (
    AvanceCarrera,
    calcular_avance,
    cargar_avance,
    promedio_ponderado,
)
from app.core.database import get_supabase
from app.core.auth_utils import get_current_user
from app.core.diagnostico import generar_diagnostico
from app.core.exceptions import raise_field_error
from app.core.prereqs import resolve_prereq_chain
from typing import Dict, List, Any, Optional, Set
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Academic Dashboard"])


async def _run(fn):
    """Ejecuta una llamada bloqueante de Supabase en un hilo aparte.

    El cliente supabase-py es síncrono: cada `.execute()` bloquea el hilo que
    lo ejecuta. Moverlo a un hilo aparte con to_thread libera el event loop
    de FastAPI mientras espera la respuesta de red, así el servidor puede
    atender otras peticiones (otra pestaña, otro usuario) mientras tanto.

    IMPORTANTE: no se deben lanzar varias llamadas de este tipo en paralelo
    (asyncio.gather) cuando comparten la misma instancia de `supabase`: el
    cliente usa una única conexión HTTP/2 por debajo, y golpearla desde
    varios hilos a la vez la corrompe (aparece como
    `ConnectionTerminated error_code:9`, intermitente). Por eso las llamadas
    siguen despachándose una por una, cada una liberando el event loop
    mientras espera su turno de red.
    """
    return await asyncio.to_thread(fn)


class AcademicStats(BaseModel):
    cursosCompletados: int
    cursosEnProgreso: int
    totalCursos: int
    porcentajeProgreso: float
    promedioPonderado: float
    horasEstudio: int

class Achievement(BaseModel):
    id: Any
    nombre: str
    descripcion: str
    icon: str
    unlocked: bool
    unlocked_at: Optional[str] = None

class DashboardSummary(BaseModel):
    stats: AcademicStats
    logros: List[Achievement]

def _resolver_malla_id(supabase, perfil: Optional[dict]) -> Optional[int]:
    """Obtiene malla_id del perfil, o busca la malla vigente de la carrera como fallback."""
    if not perfil:
        return None
    malla_id = perfil.get("malla_id")
    if malla_id:
        return malla_id
    carrera_id = perfil.get("carrera_id")
    if not carrera_id:
        return None
    try:
        resp = (
            supabase.table("mallas")
            .select("id")
            .eq("carrera_id", carrera_id)
            .eq("es_vigente", True)
            .order("id")
            .limit(1)
            .execute()
        )
        filas = getattr(resp, "data", None) or []
        return filas[0]["id"] if filas else None
    except Exception as e:
        logger.error(f"Error resolviendo malla vigente para carrera {carrera_id}: {e}")
        return None


async def _calcular_stats(user, supabase) -> Dict[str, Any]:
    """Métricas académicas del dashboard.

    El avance sale de core/avance (RF-07) sobre la malla activa del estudiante.
    """
    try:
        profile_resp = await _run(
            lambda: supabase.table("perfiles")
            .select("carrera_id, malla_id")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        perfil = getattr(profile_resp, "data", None) if profile_resp else None
        malla_id = _resolver_malla_id(supabase, perfil)

        avance = AvanceCarrera()
        promedio = 0.0

        if malla_id:
            avance = await _run(lambda: cargar_avance(supabase, user.id, malla_id))
            mc_resp = await _run(
                lambda: supabase.table("malla_cursos")
                .select("curso_id, credits")
                .eq("malla_id", malla_id)
                .execute()
            )
            progreso_resp = await _run(
                lambda: supabase.table("progreso_cursos")
                .select("curso_id, status, nota")
                .eq("perfil_id", user.id)
                .execute()
            )

            cursos = {
                c["curso_id"]: {"credits": c.get("credits") or 0}
                for c in (getattr(mc_resp, "data", None) or [])
            }
            progreso = {
                p["curso_id"]: p for p in (getattr(progreso_resp, "data", None) or [])
            }
            promedio = promedio_ponderado(cursos, progreso)

        return {
            "cursosCompletados": avance.cursos_aprobados,
            "cursosEnProgreso": avance.cursos_en_curso,
            "totalCursos": avance.cursos_totales,
            "porcentajeProgreso": avance.porcentaje_avance,
            "promedioPonderado": promedio,
            "horasEstudio": 120,  # Placeholder hasta tener tabla de tracking
        }
    except Exception as e:
        logger.error(f"Error calculando stats de {user.id}: {e}")
        return {
            "cursosCompletados": 0,
            "cursosEnProgreso": 0,
            "totalCursos": 0,
            "porcentajeProgreso": 0,
            "promedioPonderado": 0,
            "horasEstudio": 0,
        }


async def _obtener_logros(user, supabase) -> List[Dict[str, Any]]:
    """
    Sincroniza logros usando las tablas: logros y logros_usuarios.
    """
    try:
        logros_resp = await _run(lambda: supabase.table("logros").select("*").execute())
        unlocked_resp = await _run(
            lambda: supabase.table("logros_usuarios")
            .select("logro_id, unlocked_at")
            .eq("perfil_id", user.id)
            .execute()
        )

        unlocked_map = {item["logro_id"]: item["unlocked_at"] for item in (unlocked_resp.data or [])}

        resultado = []
        for logro in (logros_resp.data or []):
            is_unlocked = logro["id"] in unlocked_map
            resultado.append({
                "id": logro["id"],
                "nombre": logro["nombre"],
                "descripcion": logro["descripcion"],
                "icon": logro["icon"],
                "unlocked": is_unlocked,
                "unlocked_at": unlocked_map.get(logro["id"]) if is_unlocked else None,
            })
        return resultado
    except Exception as e:
        print(f"[DEBUG] Error en _obtener_logros: {str(e)}")
        return []

@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)
    stats = await _calcular_stats(user, supabase)
    logros = await _obtener_logros(user, supabase)
    return {
        "stats": stats,
        "logros": logros,
    }


async def _avance_por_curso(supabase, user, malla_id: Optional[int], curso_id: Optional[int]) -> List[Dict[str, Any]]:
    """Avance del estudiante curso por curso (RF-21) sobre malla_cursos."""
    if not malla_id:
        return []
    try:
        mc_resp = await _run(
            lambda: supabase.table("malla_cursos")
            .select("curso_id, ciclo, credits, cursos(code, name)")
            .eq("malla_id", malla_id)
            .execute()
        )
        mc_data = getattr(mc_resp, "data", None) or []
        cursos = {}
        for mc in mc_data:
            c_info = mc.get("cursos") or {}
            cursos[mc["curso_id"]] = {
                "code": c_info.get("code"),
                "name": c_info.get("name"),
                "credits": mc.get("credits") or 0,
                "ciclo": mc.get("ciclo"),
            }

        def _progreso_query():
            q = (
                supabase.table("progreso_cursos")
                .select("curso_id, status, nota, fecha_completado")
                .eq("perfil_id", user.id)
            )
            if curso_id is not None:
                q = q.eq("curso_id", curso_id)
            return q.execute()

        progreso_resp = await _run(_progreso_query)
        progreso = getattr(progreso_resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error cargando avance por curso de {user.id}: {e}")
        return []

    filas = []
    for registro in progreso:
        cid = registro.get("curso_id")
        curso = cursos.get(cid)
        if not curso:
            continue
        estado = registro.get("status")
        filas.append({
            "curso_id": cid,
            "code": curso.get("code"),
            "name": curso.get("name"),
            "credits": curso.get("credits") or 0,
            "ciclo": curso.get("ciclo"),
            "status": estado,
            "nota": float(registro["nota"]) if registro.get("nota") is not None else None,
            "fecha_completado": registro.get("fecha_completado"),
            "progreso": 100 if estado == "completed" else 0,
        })

    filas.sort(key=lambda f: (f["ciclo"] if f["ciclo"] is not None else 99, f["code"] or ""))
    return filas


@router.get("/actividad")
async def get_actividad(
    user_data=Depends(get_current_user),
    periodo: str = Query(PERIODO_POR_DEFECTO, description="7d | 30d | 90d | semestre | todo"),
    curso_id: Optional[int] = Query(None, description="Limita las métricas a un curso"),
) -> dict:
    """Estadísticas de actividad del estudiante (RF-21) con filtros (RF-22)."""
    user, token = user_data
    supabase = get_supabase(token)

    if periodo not in PERIODOS:
        raise_field_error(
            "periodo",
            f"Periodo no válido. Usa uno de: {', '.join(PERIODOS)}.",
            status_code=400,
        )

    try:
        perfil_resp = await _run(
            lambda: supabase.table("perfiles")
            .select("carrera_id, malla_id")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        perfil = getattr(perfil_resp, "data", None) if perfil_resp else None
    except Exception as e:
        logger.error(f"Error consultando perfil {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo verificar tu perfil.")

    malla_id = _resolver_malla_id(supabase, perfil)

    eventos = await _run(
        lambda: consultar_eventos(supabase, user.id, periodo=periodo, curso_id=curso_id)
    )
    avance_por_curso = (
        await _avance_por_curso(supabase, user, malla_id, curso_id) if malla_id else []
    )

    return {
        "periodo": periodo,
        "curso_id": curso_id,
        "resumen": resumir_eventos(eventos),
        "actividad_por_dia": actividad_por_dia(eventos),
        "avance_por_curso": avance_por_curso,
    }


@router.get("/cursos-activos")
async def get_cursos_activos(user_data=Depends(get_current_user)) -> dict:
    """Cursos en curso con su avance real y el tema donde se quedó."""
    user, token = user_data
    supabase = get_supabase(token)

    try:
        progreso_resp = await _run(
            lambda: supabase.table("progreso_cursos")
            .select("curso_id")
            .eq("perfil_id", user.id)
            .eq("status", "in_progress")
            .execute()
        )
        curso_ids = [p["curso_id"] for p in (getattr(progreso_resp, "data", None) or [])]
    except Exception as e:
        logger.error(f"Error cargando cursos activos de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudieron cargar tus cursos activos.")

    if not curso_ids:
        return {"cursos": []}

    try:
        perfil_resp = await _run(
            lambda: supabase.table("perfiles")
            .select("carrera_id, malla_id")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        perfil = getattr(perfil_resp, "data", None) if perfil_resp else None
        malla_id = _resolver_malla_id(supabase, perfil)

        if not malla_id:
            return {"cursos": []}

        mc_resp = await _run(
            lambda: supabase.table("malla_cursos")
            .select("curso_id, ciclo, credits, cursos(code, name)")
            .eq("malla_id", malla_id)
            .in_("curso_id", curso_ids)
            .execute()
        )
        steps_resp = await _run(
            lambda: supabase.table("learning_path_steps")
            .select("id, curso_id, title, order_index")
            .in_("curso_id", curso_ids)
            .order("order_index")
            .execute()
        )
        mc_data = getattr(mc_resp, "data", None) or []
        cursos = {
            mc["curso_id"]: {
                "id": mc["curso_id"],
                "code": (mc.get("cursos") or {}).get("code"),
                "name": (mc.get("cursos") or {}).get("name"),
                "credits": mc.get("credits") or 0,
                "ciclo": mc.get("ciclo"),
            }
            for mc in mc_data
        }
        steps = getattr(steps_resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error cargando temas de cursos activos de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudieron cargar tus cursos activos.")

    completadas: Set[int] = set()
    if steps:
        try:
            unidades_resp = await _run(
                lambda: supabase.table("progreso_unidades")
                .select("step_id, completado")
                .eq("perfil_id", user.id)
                .in_("step_id", [s["id"] for s in steps])
                .execute()
            )
            completadas = {
                u["step_id"]
                for u in (getattr(unidades_resp, "data", None) or [])
                if u.get("completado")
            }
        except Exception as e:
            if "PGRST205" in str(e) or "Could not find the table" in str(e):
                logger.warning("Tabla 'progreso_unidades' no existe; avance por curso en 0.")
            else:
                logger.error(f"Error cargando progreso de unidades de {user.id}: {e}")

    temas_por_curso: Dict[Any, List[dict]] = {}
    for step in steps:
        temas_por_curso.setdefault(step["curso_id"], []).append(step)

    resultado = []
    for curso_id in curso_ids:
        curso = cursos.get(curso_id)
        if not curso:
            continue

        temas = sorted(
            temas_por_curso.get(curso_id, []),
            key=lambda s: s.get("order_index") or 0,
        )
        total = len(temas)
        hechos = sum(1 for t in temas if t["id"] in completadas)
        siguiente = next((t for t in temas if t["id"] not in completadas), None)

        resultado.append({
            "id": curso_id,
            "code": curso.get("code"),
            "name": curso.get("name"),
            "credits": curso.get("credits") or 0,
            "ciclo": curso.get("ciclo"),
            "progreso": round(hechos / total * 100) if total else 0,
            "temas_completados": hechos,
            "temas_totales": total,
            "siguiente_tema": siguiente.get("title") if siguiente else None,
        })

    resultado.sort(key=lambda c: (-c["progreso"], c["code"] or ""))
    return {"cursos": resultado}


@router.get("/test-nivel")
async def get_test_nivel(user_data=Depends(get_current_user)) -> dict:
    """Test de nivel inicial y ruta sugerida (RF-19, RF-20)."""
    user, token = user_data
    supabase = get_supabase(token)

    try:
        perfil_resp = await _run(
            lambda: supabase.table("perfiles")
            .select("carrera_id, malla_id, ciclo_actual")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        perfil = getattr(perfil_resp, "data", None) if perfil_resp else None
    except Exception as e:
        logger.error(f"Error consultando perfil {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo verificar tu perfil.")

    if not perfil:
        raise_field_error(
            "perfil", "No encontramos tu perfil. Vuelve a iniciar sesión.", status_code=400
        )

    malla_id = _resolver_malla_id(supabase, perfil)
    if not malla_id:
        raise_field_error(
            "malla_id",
            "Necesitas completar tu onboarding para obtener tu diagnóstico.",
            status_code=400,
        )

    try:
        mc_resp = await _run(
            lambda: supabase.table("malla_cursos")
            .select("id, curso_id, ciclo, credits, cursos(code, name)")
            .eq("malla_id", malla_id)
            .execute()
        )
        progreso_resp = await _run(
            lambda: supabase.table("progreso_cursos")
            .select("curso_id, status, nota")
            .eq("perfil_id", user.id)
            .execute()
        )
        mc_data = getattr(mc_resp, "data", None) or []
        cursos = {
            mc["curso_id"]: {
                "id": mc["curso_id"],
                "code": (mc.get("cursos") or {}).get("code"),
                "name": (mc.get("cursos") or {}).get("name"),
                "credits": mc.get("credits") or 0,
                "ciclo": mc.get("ciclo"),
            }
            for mc in mc_data
        }
        progreso = {
            p["curso_id"]: p for p in (getattr(progreso_resp, "data", None) or [])
        }

        mc_ids = [mc["id"] for mc in mc_data]
        prereq_filas = []
        if mc_ids:
            prereq_resp = await _run(
                lambda: supabase.table("malla_curso_prerrequisitos")
                .select("malla_curso_id, prerrequisito_malla_curso_id")
                .in_("malla_curso_id", mc_ids)
                .execute()
            )
            prereq_filas = getattr(prereq_resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error cargando datos del diagnóstico de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo generar tu diagnóstico.")

    from app.core.prereqs import build_prereq_map_from_malla
    prereq_map = build_prereq_map_from_malla(mc_data, prereq_filas, use_curso_id=True)

    aprobados = {cid for cid, p in progreso.items() if p.get("status") == "completed"}

    disponibles = [
        cid
        for cid in cursos
        if cid not in progreso
        and all(pid in aprobados for pid in resolve_prereq_chain(cid, prereq_map))
    ]

    estados = {cid: p.get("status") for cid, p in progreso.items()}

    return generar_diagnostico(
        cursos=cursos,
        progreso=progreso,
        prereq_map=prereq_map,
        disponibles=disponibles,
        ciclo_actual=perfil.get("ciclo_actual") or 1,
        avance=cargar_avance(supabase, user.id, malla_id),
        promedio=promedio_ponderado(cursos, progreso),
    )