from enum import Enum
from typing import List, Optional
from pydantic import BaseModel


class StatusCurso(str, Enum):
    COMPLETED = "completed"
    IN_PROGRESS = "in_progress"
    AVAILABLE = "available"
    LOCKED = "locked"


class PrerrequisitoInfo(BaseModel):
    id: str
    code: str
    name: str
    completado: bool


class CourseDetail(BaseModel):
    id: str
    code: str
    name: str
    credits: int
    status: StatusCurso
    description: Optional[str] = None
    progreso: int = 0
    prerequisitos: List[PrerrequisitoInfo] = []
    prerequisitos_cumplidos: bool = True


class CicloDetail(BaseModel):
    ciclo: str
    credits: int
    courses: List[CourseDetail]
