"""
Pydantic models for User and Student profiles
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date

class UserBase(BaseModel):
    email: EmailStr
    nombre_completo: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    foto_url: Optional[str] = None

class UserProfile(BaseModel):
    id: str
    email: str
    nombre_completo: Optional[str]
    foto_url: Optional[str]
    carrera: Optional[dict]
    ciclo_actual: Optional[int]
    codigo_estudiante: Optional[str]
    onboarding_completado: bool

class EstudianteCreate(BaseModel):
    carrera_id: int
    ciclo_actual: int
    codigo_estudiante: Optional[str] = None
    fecha_ingreso: Optional[date] = None
