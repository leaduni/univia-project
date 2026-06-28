from fastapi import Header, HTTPException
from database import get_supabase
from typing import Optional

async def get_current_user(authorization: Optional[str] = Header(None)):
    print(f"[AUTH_UTILS] Received authorization header: '{authorization}'")
    if not authorization:
        print("[AUTH_UTILS] Authorization header is missing or empty")
        raise HTTPException(status_code=401, detail="Token no proporcionado")
    
    token = authorization.replace("Bearer ", "")
    supabase = get_supabase()
    
    try:
        print(f"[AUTH_UTILS] Calling get_user with token length: {len(token)}")
        user_response = supabase.auth.get_user(token)
        print(f"[AUTH_UTILS] Succeeded. User ID: {user_response.user.id if user_response.user else 'None'}")
        return user_response.user, token
    except Exception as e:
        print(f"[AUTH_UTILS] Exception in get_user: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Sesión inválida: {str(e)}")
