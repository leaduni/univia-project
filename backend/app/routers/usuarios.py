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
    Get current user profile using the Supabase JWT.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    print(f"Auth header received: {authorization[:20]}...")
    token = authorization.split(" ")[1]
    
    try:
        # Validate the token with Supabase
        # NOTE: This requires a valid SUPABASE_KEY in the backend
        print("Validating token with Supabase...")
        auth_user = supabase.auth.get_user(token)
        
        if not auth_user.user:
            print("Token validation failed: User not found in session")
            raise HTTPException(status_code=401, detail="Invalid token")
            
        user_id = auth_user.user.id
        print(f"Token validated. User ID: {user_id}")
        
        # Now fetch the public profile from our table
        # If using SERVICE_ROLE_KEY, this bypasses RLS
        # If using ANON_KEY, we might need: supabase.postgrest.auth(token)
        print(f"Fetching profile for user_id: {user_id}")
        result = supabase.table("usuarios")\
            .select("*, estudiante:estudiantes(*, carrera:carreras(*))")\
            .eq("id", user_id)\
            .single()\
            .execute()
        
        if not result.data:
            print(f"Profile not found in 'usuarios' table for ID: {user_id}")
            raise HTTPException(status_code=404, detail="User profile not found")
        
        print("Profile fetched successfully")
        return result.data
        
    except Exception as e:
        print(f"Error in get_my_profile: {type(e).__name__}: {str(e)}")
        # Check if it's already an HTTPException
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
