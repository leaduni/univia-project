from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.database import get_supabase
from supabase import Client

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.get("/status")
async def get_auth_status():
    """
    Check if auth service is up.
    """
    return {"status": "Auth service is configured to use Supabase Auth"}
