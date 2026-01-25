"""
Pydantic models for Onboarding
"""
from pydantic import BaseModel
from typing import List, Optional

class OnboardingData(BaseModel):
    carrera_id: int
    ciclo_actual: int
    cursos_completados: List[int]
    matricula_actual: Optional[List[int]] = []

class OnboardingResponse(BaseModel):
    success: bool
    estudiante: dict
