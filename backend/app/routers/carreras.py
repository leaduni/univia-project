"""
Router for Carreras (Academic Programs) endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_supabase
from supabase import Client

router = APIRouter(prefix="/carreras", tags=["Carreras"])

@router.get("")
async def get_carreras(supabase: Client = Depends(get_supabase)):
    """
    Get all available academic programs (carreras)
    """
    try:
        result = supabase.table("carreras")\
            .select("*, facultad:facultades(nombre)")\
            .execute()
        
        # Format response
        carreras = []
        for carrera in result.data:
            carreras.append({
                "id": carrera["id"],
                "codigo": carrera["codigo"],
                "nombre": carrera["nombre"],
                "facultad": carrera["facultad"]["nombre"] if carrera.get("facultad") else None,
                "descripcion": carrera.get("descripcion"),
                "duracion_ciclos": carrera.get("duracion_ciclos")
            })
        
        return carreras
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching carreras: {str(e)}")

@router.get("/{carrera_id}")
async def get_carrera_by_id(carrera_id: int, supabase: Client = Depends(get_supabase)):
    """
    Get a specific carrera by ID
    """
    try:
        result = supabase.table("carreras")\
            .select("*, facultad:facultades(nombre)")\
            .eq("id", carrera_id)\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Carrera not found")
        
        carrera = result.data
        return {
            "id": carrera["id"],
            "codigo": carrera["codigo"],
            "nombre": carrera["nombre"],
            "facultad": carrera["facultad"]["nombre"] if carrera.get("facultad") else None,
            "descripcion": carrera.get("descripcion"),
            "duracion_ciclos": carrera.get("duracion_ciclos")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching carrera: {str(e)}")
