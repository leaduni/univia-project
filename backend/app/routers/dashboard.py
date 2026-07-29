import logging

from fastapi import APIRouter, HTTPException, Depends
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
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Academic Dashboard"])

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

def _calcular_stats(user, supabase) -> Dict[str, Any]:
    """Métricas académicas del dashboard.

    El avance sale de core/avance (RF-07) y no se recalcula aquí: antes este
    endpoint lo medía por cantidad de cursos mientras el resumen del
    onboarding lo medía por créditos, y el mismo estudiante veía dos
    porcentajes distintos según la pantalla.
    """
    try:
        profile_resp = (
            supabase.table("perfiles")
            .select("carrera_id")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        perfil = getattr(profile_resp, "data", None) if profile_resp else None
        carrera_id = perfil.get("carrera_id") if perfil else None

        progreso_resp = (
            supabase.table("progreso_cursos")
            .select("status, nota")
            .eq("perfil_id", user.id)
            .execute()
        )
        progreso_data = getattr(progreso_resp, "data", None) or []

        avance = (
            cargar_avance(supabase, user.id, carrera_id)
            if carrera_id
            else AvanceCarrera()
        )

        notas = [p.get("nota") for p in progreso_data if p.get("nota") is not None]
        promedio = sum(notas) / len(notas) if notas else 0.0

        return {
            "cursosCompletados": avance.cursos_aprobados,
            "cursosEnProgreso": avance.cursos_en_curso,
            "totalCursos": avance.cursos_totales,
            "porcentajeProgreso": avance.porcentaje_avance,
            "promedioPonderado": round(promedio, 2),
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


def _obtener_logros(user, supabase) -> List[Dict[str, Any]]:
    """
    Sincroniza logros usando las tablas: logros y logros_usuarios.
    """
    try:
        logros_resp = supabase.table("logros").select("*").execute()
        
        unlocked_resp = (
            supabase.table("logros_usuarios")
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
    return {
        "stats": _calcular_stats(user, supabase),
        "logros": _obtener_logros(user, supabase)
    }


@router.get("/test-nivel")
async def get_test_nivel(user_data=Depends(get_current_user)) -> dict:
    """Test de nivel inicial y ruta sugerida (RF-19, RF-20).

    El diagnóstico se deriva del récord que el estudiante ya declaró en el
    onboarding: qué aprobó, con qué nota y en qué ciclo va. No se le piden
    respuestas para deducir algo que la plataforma ya tiene.
    """
    user, token = user_data
    supabase = get_supabase(token)

    try:
        perfil_resp = (
            supabase.table("perfiles")
            .select("carrera_id, ciclo_actual")
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

    carrera_id = perfil.get("carrera_id")
    if not carrera_id:
        raise_field_error(
            "carrera_id",
            "Necesitas completar tu onboarding para obtener tu diagnóstico.",
            status_code=400,
        )

    try:
        cursos_resp = (
            supabase.table("cursos")
            .select("id, code, name, credits, ciclo")
            .eq("carrera_id", carrera_id)
            .execute()
        )
        cursos = {c["id"]: c for c in (getattr(cursos_resp, "data", None) or [])}

        progreso_resp = (
            supabase.table("progreso_cursos")
            .select("curso_id, status, nota")
            .eq("perfil_id", user.id)
            .execute()
        )
        progreso = {
            p["curso_id"]: p for p in (getattr(progreso_resp, "data", None) or [])
        }

        prereq_resp = (
            supabase.table("curso_prerrequisitos")
            .select("curso_id, prerrequisito_id")
            .in_("curso_id", list(cursos))
            .execute()
        )
        prereq_filas = getattr(prereq_resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error cargando datos del diagnóstico de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo generar tu diagnóstico.")

    prereq_map: Dict[Any, List[Any]] = {}
    for fila in prereq_filas:
        prereq_map.setdefault(fila["curso_id"], []).append(fila["prerrequisito_id"])

    aprobados = {cid for cid, p in progreso.items() if p.get("status") == "completed"}

    # Disponible = aún no lo lleva y tiene toda su cadena de prerrequisitos
    # aprobada. Misma regla que usa la malla, para no dar dos respuestas
    # distintas a '¿qué puedo llevar?'.
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
        avance=calcular_avance(cursos, estados),
        promedio=promedio_ponderado(cursos, progreso),
    )