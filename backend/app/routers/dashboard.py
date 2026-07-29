import logging

from fastapi import APIRouter, HTTPException, Depends
from app.core.avance import AvanceCarrera, cargar_avance
from app.core.database import get_supabase
from app.core.auth_utils import get_current_user
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