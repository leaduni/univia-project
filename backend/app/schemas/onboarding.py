from pydantic import BaseModel
from typing import List


class OnboardingCompleteRequest(BaseModel):
    carrera_id: int
    ciclo_actual: int
    cursos_inscritos: List[int]


class CursoPrereqItem(BaseModel):
    id: int
    code: str
    name: str
    credits: int
    ciclo: int
    carrera_id: int
    prerrequisito_ids: List[int] = []
    status: str = "available"


class CursosPorCarreraResponse(BaseModel):
    carrera_id: int
    cursos: List[CursoPrereqItem]
