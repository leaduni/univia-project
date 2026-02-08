from fastapi import APIRouter, HTTPException, Depends, Body
from database import get_supabase
from auth_utils import get_current_user
from typing import List

router = APIRouter()

@router.get("/onboarding/data")
async def get_onboarding_data(user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)
    
    try:
        # 1. Obtener carreras
        carreras_resp = supabase.table("carreras").select("id, name, codigo").execute()
        
        # 2. Obtener todos los cursos con su ciclo
        # Nota: Como ahora nos enfocamos en Sistemas, esto traerá la malla de Sistemas
        cursos_resp = supabase.table("cursos").select("*").order("ciclo").order("name").execute()
        
        # 3. Mapear cursos por ciclo para que el frontend lo procese más fácil
        malla_dict = {}
        for curso in cursos_resp.data:
            ciclo_label = f"Ciclo {curso['ciclo']}"
            if ciclo_label not in malla_dict:
                malla_dict[ciclo_label] = {
                    "ciclo": ciclo_label,
                    "credits": 0,
                    "courses": []
                }
            malla_dict[ciclo_label]["courses"].append(curso)
            malla_dict[ciclo_label]["credits"] += curso.get("credits", 0)
            
        return {
            "carreras": carreras_resp.data,
            "malla": list(malla_dict.values())
        }
    except Exception as e:
        print(f"Error fetching onboarding data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/onboarding/complete")
async def complete_onboarding(
    data: dict = Body(...),
    user_data = Depends(get_current_user)
):
    user, token = user_data
    supabase = get_supabase(token)
    
    # data: { carrera_id: int, ciclo_actual: int, cursos_completados: int[], matricula_actual: int[] }
    
    try:
        # 1. Actualizar perfil del usuario
        supabase.table("perfiles").update({
            "carrera_id": data.get("carrera_id"),
            "ciclo_actual": data.get("ciclo_actual"),
            "onboarding_completado": True,
            "updated_at": "now()"
        }).eq("id", user.id).execute()
        
        # 2. Registrar progreso de cursos
        progreso_items = []
        
        # Cursos completados
        for curso_id in data.get("cursos_completados", []):
            progreso_items.append({
                "perfil_id": user.id,
                "curso_id": curso_id,
                "status": "completed",
                "fecha_completado": "now()"
            })
            
        # Matrícula actual
        for curso_id in data.get("matricula_actual", []):
            progreso_items.append({
                "perfil_id": user.id,
                "curso_id": curso_id,
                "status": "in_progress"
            })
            
        if progreso_items:
            supabase.table("progreso_cursos").upsert(progreso_items).execute()

        # 3. Otorgar logro de bienvenida si no lo tiene
        try:
            supabase.table("logros_usuarios").upsert({
                "perfil_id": user.id,
                "logro_id": 1, # ID del logro 'Bienvenido'
                "unlocked_at": "now()"
            }).execute()
        except Exception as achievement_error:
            print(f"No se pudo otorgar el logro: {achievement_error}")
            # No lanzamos excepción aquí para no bloquear el onboarding

        return {"status": "success", "message": "Onboarding completado exitosamente"}
    except Exception as e:
        print(f"Error en onboarding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al guardar datos: {str(e)}")
