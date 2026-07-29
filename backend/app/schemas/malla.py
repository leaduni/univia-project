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
    # Etiqueta lista para mostrar ("Ciclo 3").
    ciclo: str
    # El número en crudo. Sin este campo el frontend tenía que hacer
    # ciclo.split(" ")[1] para recuperarlo, y eso se rompe apenas cambie el
    # texto de la etiqueta o se traduzca.
    ciclo_num: int
    credits: int
    courses: List[CourseDetail]
