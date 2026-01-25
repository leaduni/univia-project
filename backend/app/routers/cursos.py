"""
Router for Cursos (Courses) endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_supabase
from supabase import Client

router = APIRouter(prefix="/cursos", tags=["Cursos"])

@router.get("/{curso_id}")
async def get_curso(curso_id: int, supabase: Client = Depends(get_supabase)):
    """
    Get course details by ID
    """
    try:
        # Get course with ciclo information
        result = supabase.table("cursos")\
            .select("*, ciclo:ciclos(numero, nombre)")\
            .eq("id", curso_id)\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Curso not found")
        
        curso = result.data
        
        # Get prerequisites
        prereq_result = supabase.table("prerequisitos")\
            .select("prerequisito:prerequisito_curso_id(id, codigo, nombre)")\
            .eq("curso_id", curso_id)\
            .execute()
        
        prerequisitos = [p["prerequisito"] for p in prereq_result.data if p.get("prerequisito")]
        
        return {
            "id": curso["id"],
            "code": curso["codigo"],
            "name": curso["nombre"],
            "credits": curso["creditos"],
            "description": curso.get("descripcion"),
            "ciclo": {
                "numero": curso["ciclo"]["numero"],
                "nombre": curso["ciclo"]["nombre"]
            } if curso.get("ciclo") else None,
            "prerequisitos": prerequisitos
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching curso: {str(e)}")
