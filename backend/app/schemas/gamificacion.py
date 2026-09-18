"""Contratos Pydantic del módulo de gamificación, notas inmutables y ranking.

Fechas y UUIDs viajan como strings ISO al cruzar el límite Server/Client (el
cliente supabase-py los devuelve serializados); por eso aquí se modelan como
`str | None` y el frontend no asume tipos nativos.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

CANALES_COMPARTIR = {"copiar_enlace", "whatsapp", "telegram", "correo", "redes"}


# ---------------------------------------------------------------------------
# Evaluaciones calificables (entrega)
# ---------------------------------------------------------------------------

class RespuestaPregunta(BaseModel):
    pregunta_id: str = Field(min_length=1, max_length=64)
    respuesta: Any

    @field_validator("pregunta_id")
    @classmethod
    def normalizar_id(cls, v: str) -> str:
        texto = str(v).strip()
        if not texto:
            raise ValueError("pregunta_id no puede quedar vacío.")
        return texto


class CuerpoEntregar(BaseModel):
    """Entrega de una sesión: la corrección ocurre 100% en el servidor."""

    respuestas: List[RespuestaPregunta] = Field(default_factory=list, max_length=200)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("respuestas")
    @classmethod
    def sin_respuestas_duplicadas(cls, v: List[RespuestaPregunta]) -> List[RespuestaPregunta]:
        ids = [r.pregunta_id for r in v]
        if len(ids) != len(set(ids)):
            raise ValueError("No puedes enviar dos respuestas para la misma pregunta.")
        return v


class SolicitudSesion(BaseModel):
    evaluacion_id: int = Field(gt=0)


class SesionCreada(BaseModel):
    id: str
    evaluacion_id: int
    curso_id: int
    titulo: str
    peso: float = 1.0
    puntaje_maximo: float
    version: int = 1
    max_intentos: int = 1
    preguntas_snapshot: Dict[str, Any]
    iniciada_at: str
    vence_at: Optional[str] = None


class IntentoEntregado(BaseModel):
    id: str
    evaluacion_id: int
    curso_id: int
    nota: float
    puntaje_obtenido: float
    puntaje_maximo: float
    fecha_completado: str


class ResultadoEntrega(BaseModel):
    intento: IntentoEntregado
    nota_curso_promedio: Optional[float] = None
    xp_otorgado: int = 0


# ---------------------------------------------------------------------------
# Notas inmutables
# ---------------------------------------------------------------------------

class IntentoHistorico(BaseModel):
    id: str
    evaluacion_id: int
    curso_id: int
    nota: float
    puntaje_obtenido: float
    puntaje_maximo: float
    fecha_completado: str


class HistorialCurso(BaseModel):
    curso_id: int
    nota_promedio: Optional[float] = None
    total_intentos: int = 0
    ultima_fecha: Optional[str] = None
    intentos: List[IntentoHistorico] = Field(default_factory=list)


class NotaPorCurso(BaseModel):
    curso_id: int
    curso: Optional[str] = None
    codigo: Optional[str] = None
    nota_promedio: Optional[float] = None
    intentos: int = 0
    ultima_fecha: Optional[str] = None


class ResumenNotas(BaseModel):
    promedio_academico: Optional[float] = None
    total_intentos: int = 0
    cursos_con_nota: int = 0
    por_curso: List[NotaPorCurso] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Gamificación
# ---------------------------------------------------------------------------

class ResultadoCheckIn(BaseModel):
    racha_actual: int
    racha_maxima: int
    xp_otorgado: int
    ya_registrado: bool


class ResumenGamificacion(BaseModel):
    xp_total: int = 0
    nivel: int = 1
    racha_actual: int = 0
    racha_maxima: int = 0
    ultima_fecha_actividad: Optional[str] = None
    alias_publico: Optional[str] = None
    codigo_referido: Optional[str] = None
    pueda_checkin: bool = True
    bono_proximo_checkin: int = 0
    progreso_siguiente: Dict[str, float] = Field(
        default_factory=lambda: {
            "xp_actual_nivel": 0.0,
            "xp_requerido": 100.0,
            "porcentaje": 0.0,
        }
    )


# ---------------------------------------------------------------------------
# Referidos
# ---------------------------------------------------------------------------

class RegistroOnboardingReferido(BaseModel):
    codigo: str = Field(min_length=4, max_length=16)

    @field_validator("codigo")
    @classmethod
    def normalizar_codigo(cls, v: str) -> str:
        texto = "".join((v or "").split()).upper()
        if not texto:
            raise ValueError("El código de referido es obligatorio.")
        return texto


class ResultadoReferido(BaseModel):
    registrado: bool = False
    ya_registrado: bool = False
    referente_alias: Optional[str] = None
    xp_otorgado: int = 0


# ---------------------------------------------------------------------------
# Ranking
# ---------------------------------------------------------------------------

class EntradaRanking(BaseModel):
    alias_publico: str
    avatar_url: Optional[str] = None
    xp_total: int = 0
    nivel: int = 1
    puesto: Optional[int] = None


class RespuestaRanking(BaseModel):
    periodo: str
    items: List[EntradaRanking] = Field(default_factory=list)
    next_cursor: Optional[str] = None
    tiene_mas: bool = False


class MiPosicionRanking(BaseModel):
    alias_publico: Optional[str] = None
    avatar_url: Optional[str] = None
    xp_total: int = 0
    nivel: int = 1
    puesto: Optional[int] = None


# ---------------------------------------------------------------------------
# Compartir (telemetría)
# ---------------------------------------------------------------------------

class EventoCompartir(BaseModel):
    canal: str

    @field_validator("canal")
    @classmethod
    def validar_canal(cls, v: str) -> str:
        canal = (v or "").strip().lower()
        if canal not in CANALES_COMPARTIR:
            raise ValueError(
                "Canal no válido. Opciones: copiar_enlace, whatsapp, telegram, correo, redes."
            )
        return canal


class ResultadoCompartir(BaseModel):
    registrado: bool = True
    canal: str
    limite_diario: bool = False