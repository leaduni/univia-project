"""
Router for Recursos (Resources) endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from app.database import get_supabase
from supabase import Client
from typing import Optional

router = APIRouter(prefix="/recursos", tags=["Recursos"])

@router.get("")
async def get_recursos(
    tipo: Optional[str] = Query(None, description="Filter by type: Examen, Práctica, Libro, Apunte"),
    ciclo: Optional[int] = Query(None, description="Filter by ciclo number"),
    codigo_curso: Optional[str] = Query(None, description="Filter by course code"),
    search: Optional[str] = Query(None, description="Search in title"),
    supabase: Client = Depends(get_supabase)
):
    """
    Get resources from the central library with optional filters
    """
    try:
        # Start query
        query = supabase.table("recursos")\
            .select("*, facultad:facultades(nombre)")
        
        # Apply filters
        if tipo:
            query = query.eq("tipo", tipo)
        
        if ciclo:
            query = query.eq("ciclo", ciclo)
        
        if codigo_curso:
            query = query.eq("curso_codigo", codigo_curso)
        
        if search:
            query = query.ilike("titulo", f"%{search}%")
        
        # Execute query
        result = query.order("descargas", desc=True).execute()
        
        # Format response
        recursos = []
        for recurso in result.data:
            recursos.append({
                "id": recurso["id"],
                "title": recurso["titulo"],
                "code": recurso.get("curso_codigo", ""),
                "semester": recurso.get("semestre", ""),
                "type": recurso["tipo"],
                "ciclo": recurso.get("ciclo"),
                "facultad": recurso["facultad"]["nombre"] if recurso.get("facultad") else "General",
                "year": recurso.get("anio"),
                "downloads": recurso.get("descargas", 0),
                "rating": float(recurso.get("calificacion", 0)),
                "preview": recurso.get("tiene_preview", False),
                "hasSolucionario": recurso.get("tiene_solucionario", False)
            })
        
        return recursos
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recursos: {str(e)}")

@router.get("/{recurso_id}/download")
async def download_recurso(recurso_id: int, supabase: Client = Depends(get_supabase)):
    """
    Download a resource (increments download counter)
    """
    try:
        # Get resource
        result = supabase.table("recursos")\
            .select("*")\
            .eq("id", recurso_id)\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Recurso not found")
        
        recurso = result.data
        
        # Increment download counter
        supabase.table("recursos")\
            .update({"descargas": recurso["descargas"] + 1})\
            .eq("id", recurso_id)\
            .execute()
        
        # Return download URL
        return {
            "download_url": recurso.get("archivo_url", ""),
            "filename": f"{recurso['titulo']}.pdf"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading recurso: {str(e)}")
