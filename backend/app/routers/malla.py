"""
Router for Malla Curricular (Curriculum Map) endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from app.database import get_supabase
from supabase import Client
from typing import Optional

router = APIRouter(prefix="/malla-curricular", tags=["Malla Curricular"])

def calcular_estado_curso(curso_id: int, matriculas: list, prerequisitos_map: dict) -> str:
    """
    Calculate course status based on enrollments and prerequisites
    """
    # Check if student is enrolled
    for matricula in matriculas:
        if matricula["seccion_curso"]["curso_id"] == curso_id:
            if matricula["estado"] == "completed":
                return "completed"
            elif matricula["estado"] == "in_progress":
                return "in_progress"
    
    # Check prerequisites
    prerequisitos = prerequisitos_map.get(curso_id, [])
    if not prerequisitos:
        return "available"
    
    # Check if all prerequisites are completed
    for prereq_id in prerequisitos:
        prereq_completed = False
        for matricula in matriculas:
            if matricula["seccion_curso"]["curso_id"] == prereq_id and matricula["estado"] == "completed":
                prereq_completed = True
                break
        if not prereq_completed:
            return "locked"
    
    return "available"

@router.get("")
async def get_malla_curricular(
    authorization: Optional[str] = Header(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Get curriculum map with course statuses for authenticated student
    """
    try:
        # Get user ID from authorization header (simplified - in production use proper JWT validation)
        user_id = None
        if authorization and authorization.startswith("Bearer "):
            # TODO: Implement proper JWT validation
            # For now, we'll return courses without status
            pass
        
        # Get all ciclos with courses
        ciclos_result = supabase.table("ciclos")\
            .select("*, cursos(*)")\
            .order("numero")\
            .execute()
        
        # Get student's matriculas if authenticated
        matriculas = []
        if user_id:
            matriculas_result = supabase.table("matriculas")\
                .select("*, seccion_curso:secciones_curso(curso_id)")\
                .eq("estudiante_id", user_id)\
                .execute()
            matriculas = matriculas_result.data
        
        # Get all prerequisites
        prereq_result = supabase.table("prerequisitos")\
            .select("curso_id, prerequisito_curso_id")\
            .execute()
        
        # Build prerequisites map
        prerequisitos_map = {}
        for prereq in prereq_result.data:
            if prereq["curso_id"] not in prerequisitos_map:
                prerequisitos_map[prereq["curso_id"]] = []
            prerequisitos_map[prereq["curso_id"]].append(prereq["prerequisito_curso_id"])
        
        # Format response
        malla = []
        for ciclo in ciclos_result.data:
            cursos = []
            for curso in ciclo.get("cursos", []):
                status = calcular_estado_curso(curso["id"], matriculas, prerequisitos_map) if user_id else "locked"
                
                cursos.append({
                    "id": curso["id"],
                    "code": curso["codigo"],
                    "name": curso["nombre"],
                    "credits": curso["creditos"],
                    "status": status,
                    "description": curso.get("descripcion", "")
                })
            
            malla.append({
                "ciclo": ciclo["nombre"],
                "numero": ciclo["numero"],
                "credits": ciclo.get("creditos_totales", 0),
                "courses": cursos
            })
        
        return malla
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching malla curricular: {str(e)}")
