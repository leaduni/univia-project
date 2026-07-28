from pydantic import BaseModel, Field, field_validator
from typing import List

# Cota defensiva del ciclo. El límite real es 'duracion_ciclos' de la carrera
# elegida y se verifica en el router, que es quien puede consultarla.
CICLO_MAXIMO_ADMITIDO = 20

# Evita que una petición manipulada intente inscribir cientos de cursos.
MAX_CURSOS_INSCRITOS = 12


class OnboardingCompleteRequest(BaseModel):
    """Datos con los que el estudiante cierra su registro de perfil (RF-EST-01).

    Completa los campos que faltan tras el registro inicial: carrera, ciclo
    relativo y lista de cursos.
    """

    carrera_id: int = Field(gt=0)
    ciclo_actual: int = Field(ge=1, le=CICLO_MAXIMO_ADMITIDO)
    cursos_inscritos: List[int]

    @field_validator("cursos_inscritos")
    @classmethod
    def validar_cursos(cls, v: List[int]) -> List[int]:
        if not v:
            raise ValueError("Debes inscribirte en al menos 1 curso.")
        if len(v) > MAX_CURSOS_INSCRITOS:
            raise ValueError(
                f"No puedes inscribirte en más de {MAX_CURSOS_INSCRITOS} cursos a la vez."
            )
        if len(set(v)) != len(v):
            raise ValueError("Hay cursos repetidos en tu selección.")
        if any(cid <= 0 for cid in v):
            raise ValueError("La selección de cursos contiene un identificador inválido.")
        return v


class PrerrequisitoFaltante(BaseModel):
    """Prerrequisito no aprobado que mantiene bloqueado a un curso (RF-EST-03)."""

    id: int
    code: str
    name: str


class CursoPrereqItem(BaseModel):
    id: int
    code: str
    name: str
    credits: int
    ciclo: int
    carrera_id: int
    prerrequisito_ids: List[int] = []
    status: str = "available"
    # Permite al wizard explicar el bloqueo en vez de solo deshabilitar el curso.
    prerrequisitos_faltantes: List[PrerrequisitoFaltante] = []


class CursosPorCarreraResponse(BaseModel):
    carrera_id: int
    cursos: List[CursoPrereqItem]
