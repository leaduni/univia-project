"""
Router for Dashboard and Statistics endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from app.database import get_supabase
from supabase import Client
from typing import Optional

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    authorization: Optional[str] = Header(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Get dashboard statistics for authenticated student
    """
    try:
        # TODO: Extract user_id from JWT token
        # For now, return mock data or require user_id as parameter
        user_id = None
        
        if not user_id:
            # Return default stats if not authenticated
            return {
                "activeCourses": 0,
                "semesterProgress": 0,
                "masterSkills": 0,
                "currentCourses": []
            }
        
        # Get student statistics
        stats_result = supabase.table("estadisticas_estudiante")\
            .select("*")\
            .eq("estudiante_id", user_id)\
            .single()\
            .execute()
        
        stats = stats_result.data if stats_result.data else {
            "cursos_activos": 0,
            "progreso_semestre": 0,
            "habilidades_dominadas": 0
        }
        
        # Get current courses (in_progress matriculas)
        matriculas_result = supabase.table("matriculas")\
            .select("*, seccion:secciones_curso(*, curso:cursos(*))")\
            .eq("estudiante_id", user_id)\
            .eq("estado", "in_progress")\
            .execute()
        
        current_courses = []
        for matricula in matriculas_result.data:
            curso = matricula["seccion"]["curso"]
            current_courses.append({
                "id": curso["id"],
                "code": curso["codigo"],
                "name": curso["nombre"],
                "progress": matricula.get("progreso_porcentaje", 0),
                "nextDeadline": None,  # TODO: Calculate from timeline
                "status": "in_progress"
            })
        
        return {
            "activeCourses": stats.get("cursos_activos", 0),
            "semesterProgress": stats.get("progreso_semestre", 0),
            "masterSkills": stats.get("habilidades_dominadas", 0),
            "currentCourses": current_courses
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard stats: {str(e)}")

@router.get("/logros")
async def get_logros(
    authorization: Optional[str] = Header(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Get achievements (logros) for authenticated student
    """
    try:
        # TODO: Extract user_id from JWT token
        user_id = None
        
        if not user_id:
            # Return all available logros if not authenticated
            logros_result = supabase.table("logros")\
                .select("*")\
                .execute()
            
            return {
                "logros_desbloqueados": [],
                "logros_disponibles": [
                    {
                        "id": logro["id"],
                        "name": logro["nombre"],
                        "description": logro["descripcion"],
                        "icon": logro.get("icono", "🏆"),
                        "unlockedAt": None
                    }
                    for logro in logros_result.data
                ]
            }
        
        # Get all logros
        all_logros_result = supabase.table("logros")\
            .select("*")\
            .execute()
        
        # Get student's unlocked logros
        unlocked_result = supabase.table("logros_estudiantes")\
            .select("*, logro:logros(*)")\
            .eq("estudiante_id", user_id)\
            .execute()
        
        unlocked_ids = {l["logro"]["id"] for l in unlocked_result.data}
        
        logros_desbloqueados = [
            {
                "id": l["logro"]["id"],
                "name": l["logro"]["nombre"],
                "description": l["logro"]["descripcion"],
                "icon": l["logro"].get("icono", "🏆"),
                "unlockedAt": str(l["fecha_desbloqueo"])
            }
            for l in unlocked_result.data
        ]
        
        logros_disponibles = [
            {
                "id": logro["id"],
                "name": logro["nombre"],
                "description": logro["descripcion"],
                "icon": logro.get("icono", "🏆"),
                "unlockedAt": None
            }
            for logro in all_logros_result.data
            if logro["id"] not in unlocked_ids
        ]
        
        return {
            "logros_desbloqueados": logros_desbloqueados,
            "logros_disponibles": logros_disponibles
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching logros: {str(e)}")
