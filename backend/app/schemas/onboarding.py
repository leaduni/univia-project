from pydantic import BaseModel, Field, field_validator
from typing import List

from app.core.validators import es_codigo_estudiante

# Cota defensiva del ciclo. El límite real es 'duracion_ciclos' de la carrera
# elegida y se verifica en el router, que es quien puede consultarla.
CICLO_MAXIMO_ADMITIDO = 20

# Evita que una petición manipulada intente inscribir cientos de cursos.
MAX_CURSOS_INSCRITOS = 12

# Cota del historial declarado: ninguna malla de la universidad pasa de este
# número de cursos, así que un envío mayor solo puede venir manipulado.
MAX_CURSOS_APROBADOS = 200

# Duración de plan asumida cuando la carrera no la tiene registrada.
CICLO_POR_DEFECTO = 10


class SeleccionCursosBase(BaseModel):
    """Reglas comunes a elegir cursos, tanto en el onboarding como cada ciclo."""

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


class OnboardingCompleteRequest(SeleccionCursosBase):
    """Datos con los que el estudiante cierra su registro de perfil (RF-EST-01).

    Completa los campos que faltan tras el registro inicial: carrera, ciclo
    relativo y lista de cursos.
    """

    carrera_id: int = Field(gt=0)
    malla_id: int | None = None
    # Historial que el estudiante declara en el wizard. No se puede deducir:
    # `progreso_cursos` está vacía al registrarse, así que sin este dato quien
    # entra en un ciclo avanzado quedaba sin ningún curso previo aprobado.
    #
    # None y [] NO son lo mismo, y la diferencia es la que evita una pérdida de
    # datos: `None` es "no declaro historial" (un cliente que ni envía el campo)
    # y deja intacto lo ya aprobado; `[]` es "declaro que no aprobé nada" y sí
    # desaprueba lo anterior. Sin esa distinción, una petición sin el campo
    # habría borrado el avance del estudiante.
    cursos_aprobados: List[int] | None = None

    @field_validator("cursos_aprobados")
    @classmethod
    def validar_aprobados(cls, v: List[int] | None) -> List[int] | None:
        if v is None:
            return None
        if len(set(v)) != len(v):
            raise ValueError("Hay cursos repetidos en tu historial académico.")
        if any(cid <= 0 for cid in v):
            raise ValueError("Tu historial académico contiene un identificador inválido.")
        if len(v) > MAX_CURSOS_APROBADOS:
            raise ValueError("Tu historial académico declara demasiados cursos.")
        return v

    # Campo opcional para completar la ficha de usuarios que entran por Google
    # SSO (que no traen código): se valida su formato y se persiste en perfiles.
    codigo_estudiante: str | None = None

    @field_validator("codigo_estudiante")
    @classmethod
    def validar_codigo_estudiante(cls, v: str | None) -> str | None:
        if v is None or not str(v).strip():
            return None
        if not es_codigo_estudiante(str(v)):
            raise ValueError(
                "El código universitario debe tener 8 dígitos y una letra verificadora (ej. 20210001U)."
            )
        return str(v).strip()


class ActualizarCursosRequest(SeleccionCursosBase):
    """Cambio de cursos al iniciar un ciclo nuevo (RF-PRF-01).

    No incluye carrera: se conserva la del perfil. Cambiar de carrera
    invalidaría todo el historial académico y no es parte del requisito.
    """


class FacultadItem(BaseModel):
    id: int
    codigo: str
    nombre: str


class CarreraItem(BaseModel):
    """Carrera para el paso 'Career Step' del wizard."""

    id: int
    codigo: str
    name: str
    description: str | None = None
    # Largo del plan de estudios: define hasta qué ciclo puede declararse el
    # estudiante en el paso siguiente.
    duracion_ciclos: int = 10
    facultad: FacultadItem | None = None


class RangoCiclos(BaseModel):
    """Ciclos seleccionables en el paso 'Semester Step'."""

    min: int = 1
    max: int


class MallaItem(BaseModel):
    id: int
    carrera_id: int
    nombre: str
    codigo_plan: str | None = None
    es_vigente: bool = True


class OnboardingDataResponse(BaseModel):
    carreras: List[CarreraItem]
    facultades: List[FacultadItem]
    ciclos: RangoCiclos


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
