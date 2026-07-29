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
    # Binario, derivado del estado. El avance fino dentro de un curso (por
    # unidades) es RF-11 y vive en el detalle de curso, no en la malla.
    progreso: int = 0
    # Datos del historial del estudiante. Solo vienen si tiene registro en
    # progreso_cursos; un curso que nunca llevó los deja en None.
    nota: Optional[float] = None
    fecha_completado: Optional[str] = None
    prerequisitos: List[PrerrequisitoInfo] = []
    prerequisitos_cumplidos: bool = True


class ResumenCiclo(BaseModel):
    """Conteo de estados del ciclo, para no recalcularlo en cada pantalla."""

    total: int = 0
    aprobados: int = 0
    en_curso: int = 0
    disponibles: int = 0
    bloqueados: int = 0
    creditos_aprobados: int = 0


class CicloDetail(BaseModel):
    # Etiqueta lista para mostrar ("Ciclo 3").
    ciclo: str
    # El número en crudo. Sin este campo el frontend tenía que hacer
    # ciclo.split(" ")[1] para recuperarlo, y eso se rompe apenas cambie el
    # texto de la etiqueta o se traduzca.
    ciclo_num: int
    credits: int
    resumen: ResumenCiclo = ResumenCiclo()
    courses: List[CourseDetail]
