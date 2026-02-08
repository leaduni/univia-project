from fastapi import Header, HTTPException
from database import get_supabase
from typing import Optional

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token no proporcionado")
    
    token = authorization.replace("Bearer ", "")
    supabase = get_supabase()
    
    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user, token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Sesión inválida: {str(e)}")
