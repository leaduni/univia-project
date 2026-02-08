from fastapi import APIRouter, Depends, HTTPException
from database import get_supabase
from auth_utils import get_current_user
from typing import List, Dict, Any

router = APIRouter()

@router.get("/malla-curricular")
async def get_malla(user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)
    
    # 1. Obtener todos los cursos
    cursos_resp = supabase.table("cursos").select("*").execute()
    if not cursos_resp.data:
        return []

    # 2. Obtener progreso del usuario actual
    progreso_resp = supabase.table("progreso_cursos").select("curso_id, status").eq("perfil_id", user.id).execute()
    
    # Mapear progreso por ID de curso para búsqueda rápida
    progreso_map = {p["curso_id"]: p["status"] for p in progreso_resp.data}

    # Organizar por ciclo como espera el frontend
    malla = {}
    for curso in cursos_resp.data:
        ciclo_key = f"Ciclo {curso['ciclo']}"
        if ciclo_key not in malla:
            malla[ciclo_key] = {
                "ciclo": ciclo_key,
                "credits": 0,
                "courses": []
            }
        
        # Determinar status: base en progreso_cursos o 'available' por defecto
        status = progreso_map.get(curso["id"], "available")
        
        malla[ciclo_key]["courses"].append({
            "id": curso["id"],
            "code": curso["code"],
            "name": curso["name"],
            "credits": curso["credits"],
            "status": status,
            "description": curso["description"]
        })
        malla[ciclo_key]["credits"] += curso["credits"]

    # Convertir a lista y ordenar por ciclo
    result = list(malla.values())
    result.sort(key=lambda x: int(x["ciclo"].split(" ")[1]))
    
    return result
