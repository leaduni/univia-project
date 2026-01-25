from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.database import get_supabase
from supabase import Client

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
async def login(
    data: LoginRequest,
    supabase: Client = Depends(get_supabase)
):
    """
    Authenticate user by email and password.
    Returns user details if successful.
    """
    try:
        # Search for user by email and password
        # NOTE: In a real app, use password hashing!
        result = supabase.table("usuarios")\
            .select("*, estudiante:estudiantes(*, carrera:carreras(*))")\
            .eq("email", data.email)\
            .eq("password", data.password)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=401, detail="Credenciales inválidas")
        
        user = result.data[0]
        
        # In a real app, generate a JWT token here
        return {
            "user": user,
            "token": "mock-jwt-token-for-dev"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el login: {str(e)}")
