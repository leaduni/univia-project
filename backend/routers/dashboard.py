from fastapi import APIRouter, HTTPException, Depends
from database import get_supabase
from auth_utils import get_current_user
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/dashboard", tags=["Academic Dashboard"])

# --- Esquemas de Datos (Pydantic) ---

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

# --- Lógica de Negocio ---

def _calcular_stats(user, supabase) -> Dict[str, Any]:
    """
    Calcula métricas académicas usando el esquema exacto de UNIVIA-PROJECT.
    Tablas: perfiles, cursos, progreso_cursos.
    """
    try:
        # 1. Obtener perfil del usuario (Tabla: perfiles)
        # Campos: id, carrera_id, nombre_completo
        profile_resp = (
            supabase.table("perfiles")
            .select("carrera_id")
            .eq("id", user.id)
            .single()
            .execute()
        )
        carrera_id = profile_resp.data.get("carrera_id") if profile_resp.data else None

        # 2. Obtener progreso del usuario (Tabla: progreso_cursos)
        # Campos: perfil_id, status, nota
        progreso_resp = (
            supabase.table("progreso_cursos")
            .select("status, nota")
            .eq("perfil_id", user.id)
            .execute()
        )
        progreso_data = progreso_resp.data or []

        # 3. Obtener total de cursos de la carrera (Tabla: cursos)
        # Campos: carrera_id
        total_cursos = 0
        if carrera_id:
            cursos_resp = (
                supabase.table("cursos")
                .select("id", count="exact")
                .eq("carrera_id", carrera_id)
                .execute()
            )
            total_cursos = cursos_resp.count if cursos_resp.count is not None else 0

        # Procesamiento de métricas
        completados = sum(1 for p in progreso_data if p.get("status") == "completed")
        en_progreso = sum(1 for p in progreso_data if p.get("status") == "in_progress")
        porcentaje = (completados / total_cursos * 100) if total_cursos > 0 else 0
        
        # Cálculo de promedio ponderado (Tabla: progreso_cursos -> campo: nota)
        notas = [p.get("nota") for p in progreso_data if p.get("nota") is not None]
        promedio = sum(notas) / len(notas) if notas else 0.0

        return {
            "cursosCompletados": completados,
            "cursosEnProgreso": en_progreso,
            "totalCursos": total_cursos,
            "porcentajeProgreso": round(porcentaje, 1),
            "promedioPonderado": round(promedio, 2),
            "horasEstudio": 120, # Placeholder hasta tener tabla de tracking
        }
    except Exception as e:
        print(f"[DEBUG] Error en _calcular_stats: {str(e)}")
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
        # Tabla: logros (id, nombre, descripcion, icon)
        logros_resp = supabase.table("logros").select("*").execute()
        
        # Tabla: logros_usuarios (perfil_id, logro_id, unlocked_at)
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

# --- Endpoints ---

@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)
    return {
        "stats": _calcular_stats(user, supabase),
        "logros": _obtener_logros(user, supabase)
    }