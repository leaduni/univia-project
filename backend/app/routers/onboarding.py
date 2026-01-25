"""
Router for Onboarding endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from app.database import get_supabase
from app.models.onboarding import OnboardingData, OnboardingResponse
from supabase import Client
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

@router.post("/complete", response_model=OnboardingResponse)
async def complete_onboarding(
    data: OnboardingData,
    authorization: Optional[str] = Header(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Complete onboarding process for a new student
    """
    try:
        # TODO: Extract user_id from JWT token
        user_id = None
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Update or create estudiante record
        estudiante_result = supabase.table("estudiantes")\
            .upsert({
                "id": user_id,
                "carrera_id": data.carrera_id,
                "ciclo_actual": data.ciclo_actual,
                "onboarding_completado": True,
                "fecha_ingreso": datetime.now().date().isoformat()
            })\
            .execute()
        
        # Create matriculas for completed courses
        if data.cursos_completados:
            # Get active sections for completed courses
            for curso_id in data.cursos_completados:
                # Find or create a section for this course
                seccion_result = supabase.table("secciones_curso")\
                    .select("id")\
                    .eq("curso_id", curso_id)\
                    .limit(1)\
                    .execute()
                
                if seccion_result.data:
                    seccion_id = seccion_result.data[0]["id"]
                    
                    # Create completed matricula
                    supabase.table("matriculas")\
                        .insert({
                            "estudiante_id": user_id,
                            "seccion_curso_id": seccion_id,
                            "estado": "completed",
                            "progreso_porcentaje": 100,
                            "fecha_completado": datetime.now().isoformat()
                        })\
                        .execute()
        
        # Create matriculas for current enrollment
        if data.matricula_actual:
            for curso_id in data.matricula_actual:
                seccion_result = supabase.table("secciones_curso")\
                    .select("id")\
                    .eq("curso_id", curso_id)\
                    .eq("semestre", "2024-II")\
                    .limit(1)\
                    .execute()
                
                if seccion_result.data:
                    seccion_id = seccion_result.data[0]["id"]
                    
                    # Create in_progress matricula
                    supabase.table("matriculas")\
                        .insert({
                            "estudiante_id": user_id,
                            "seccion_curso_id": seccion_id,
                            "estado": "in_progress",
                            "progreso_porcentaje": 0
                        })\
                        .execute()
        
        # Initialize statistics
        supabase.table("estadisticas_estudiante")\
            .upsert({
                "estudiante_id": user_id,
                "cursos_activos": len(data.matricula_actual) if data.matricula_actual else 0,
                "progreso_semestre": 0,
                "habilidades_dominadas": 0
            })\
            .execute()
        
        # Get updated estudiante data
        estudiante = supabase.table("estudiantes")\
            .select("*, carrera:carreras(*)")\
            .eq("id", user_id)\
            .single()\
            .execute()
        
        return {
            "success": True,
            "estudiante": {
                "id": estudiante.data["id"],
                "carrera_id": estudiante.data["carrera_id"],
                "ciclo_actual": estudiante.data["ciclo_actual"],
                "onboarding_completado": estudiante.data["onboarding_completado"]
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error completing onboarding: {str(e)}")
