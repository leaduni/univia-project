from fastapi import APIRouter, Depends, HTTPException
from database import get_supabase
from auth_utils import get_current_user

router = APIRouter()

@router.get("/usuarios/me")
async def get_profile(user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)
    
    try:
        # Intentar obtener el perfil de la tabla 'perfiles'
        profile_response = supabase.table("perfiles").select("*").eq("id", user.id).single().execute()
        
        if not profile_response.data:
            # Si no existe (raro por el trigger), retornar datos básicos de auth
            return {
                "id": user.id,
                "email": user.email,
                "nombre_completo": user.user_metadata.get("nombre_completo", ""),
                "onboarding_completado": False
            }
            
        return profile_response.data
    except Exception as e:
        # En caso de error, retornar lo que sabemos del usuario de auth
        return {
            "id": user.id,
            "email": user.email,
            "nombre_completo": user.user_metadata.get("nombre_completo", ""),
            "onboarding_completado": False,
            "error_fetching_profile": str(e)
        }
