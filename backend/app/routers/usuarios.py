from fastapi import APIRouter, HTTPException, Depends, Header
from app.database import get_supabase
from supabase import Client
from typing import Optional

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

@router.get("/me")
async def get_my_profile(
    authorization: Optional[str] = Header(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Get current user profile.
    Fallback to a test user if no authentication is provided.
    """
    try:
        # TODO: Implement proper JWT validation
        # For now, we search for a specific test user or the first one available
        
        # Test User ID (using a likely UUID or seeking the first available)
        # In a real scenario, this would come from the JWT sub claim
        user_id = None 
        
        # Try to find any user to use as "Me" for development
        users_result = supabase.table("usuarios").select("*, estudiante:estudiantes(*, carrera:carreras(*))").limit(1).execute()
        
        if not users_result.data:
            # Create a mock response if DB is empty, or raise error
            return {
                "id": "00000000-0000-0000-0000-000000000000",
                "email": "test@univia.edu",
                "nombre_completo": "Usuario de Prueba",
                "rol": "estudiante",
                "estudiante": {
                    "codigo_estudiante": "2024TEST",
                    "ciclo_actual": 1,
                    "carrera": {
                        "nombre": "Carrera No Asignada",
                        "facultad": "Facultad No Asignada"
                    }
                }
            }
        
        user_data = users_result.data[0]
        return user_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching profile: {str(e)}")
