"""Schemas Pydantic del módulo Agenda.

Validan las entradas y serializan las salidas de los endpoints CRUD de
eventos, etiquetas, configuración y sesiones de estudio.
"""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


# ── Cotas defensivas ──────────────────────────────────────────────────────
MAX_TITULO = 200
MAX_DESCRIPCION = 2000
MAX_INVITADOS = 20

COLORES_VALIDOS = {"indigo", "rose", "emerald", "fuchsia", "amber", "sky", "orange"}
TIPOS_VALIDOS = {"evento", "tarea", "examen", "bloque_estudio"}
RECURRENCIAS_VALIDAS = {"none", "daily", "weekly", "weekdays"}


# ── Etiquetas ─────────────────────────────────────────────────────────────

class EtiquetaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=60)
    color: str = Field(..., min_length=1)

    @field_validator("color")
    @classmethod
    def validar_color(cls, v: str) -> str:
        if v not in COLORES_VALIDOS:
            raise ValueError(f"Color inválido. Usa uno de: {', '.join(sorted(COLORES_VALIDOS))}")
        return v


class EtiquetaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=60)
    color: Optional[str] = None

    @field_validator("color")
    @classmethod
    def validar_color(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in COLORES_VALIDOS:
            raise ValueError(f"Color inválido. Usa uno de: {', '.join(sorted(COLORES_VALIDOS))}")
        return v


class EtiquetaResponse(BaseModel):
    id: int
    nombre: str
    color: str
    is_system: bool = False


# ── Eventos ───────────────────────────────────────────────────────────────

class EventoCreate(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=MAX_TITULO)
    subtitulo: Optional[str] = Field(None, max_length=500)
    tipo: str = "evento"
    etiqueta_id: Optional[int] = None
    fecha_iso: str  # "YYYY-MM-DD"
    fecha_fin_iso: Optional[str] = None
    hora_inicio: float = Field(..., ge=0, le=24)
    duracion: float = Field(..., gt=0, le=24)
    todo_el_dia: bool = False
    recurrencia: str = "none"
    is_recurring: bool = False
    rrule: Optional[str] = Field(None, max_length=500)
    ubicacion: Optional[str] = Field(None, max_length=300)
    videollamada: Optional[str] = Field(None, max_length=500)
    notificacion: Optional[str] = Field(None, max_length=50)
    descripcion: Optional[str] = Field(None, max_length=MAX_DESCRIPCION)
    invitados: Optional[List[str]] = None

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, v: str) -> str:
        if v not in TIPOS_VALIDOS:
            raise ValueError(f"Tipo inválido. Usa uno de: {', '.join(sorted(TIPOS_VALIDOS))}")
        return v

    @field_validator("recurrencia")
    @classmethod
    def validar_recurrencia(cls, v: str) -> str:
        if v not in RECURRENCIAS_VALIDAS:
            raise ValueError(f"Recurrencia inválida. Usa uno de: {', '.join(sorted(RECURRENCIAS_VALIDAS))}")
        return v

    @field_validator("invitados")
    @classmethod
    def validar_invitados(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v and len(v) > MAX_INVITADOS:
            raise ValueError(f"No puedes invitar a más de {MAX_INVITADOS} personas.")
        return v

    @field_validator("fecha_iso", "fecha_fin_iso")
    @classmethod
    def validar_fecha(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("Formato de fecha inválido. Usa YYYY-MM-DD.")
        return v


class EventoUpdate(BaseModel):
    titulo: Optional[str] = Field(None, min_length=1, max_length=MAX_TITULO)
    subtitulo: Optional[str] = Field(None, max_length=500)
    tipo: Optional[str] = None
    etiqueta_id: Optional[int] = None
    fecha_iso: Optional[str] = None
    fecha_fin_iso: Optional[str] = None
    hora_inicio: Optional[float] = Field(None, ge=0, le=24)
    duracion: Optional[float] = Field(None, gt=0, le=24)
    todo_el_dia: Optional[bool] = None
    recurrencia: Optional[str] = None
    is_recurring: Optional[bool] = None
    rrule: Optional[str] = Field(None, max_length=500)
    ubicacion: Optional[str] = Field(None, max_length=300)
    videollamada: Optional[str] = Field(None, max_length=500)
    notificacion: Optional[str] = Field(None, max_length=50)
    descripcion: Optional[str] = Field(None, max_length=MAX_DESCRIPCION)
    invitados: Optional[List[str]] = None
    completed: Optional[bool] = None

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in TIPOS_VALIDOS:
            raise ValueError(f"Tipo inválido.")
        return v

    @field_validator("recurrencia")
    @classmethod
    def validar_recurrencia(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in RECURRENCIAS_VALIDAS:
            raise ValueError(f"Recurrencia inválida.")
        return v

    @field_validator("fecha_iso", "fecha_fin_iso")
    @classmethod
    def validar_fecha(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("Formato de fecha inválido. Usa YYYY-MM-DD.")
        return v


class EventoResponse(BaseModel):
    id: int
    titulo: str
    subtitulo: Optional[str] = None
    tipo: str = "evento"
    etiqueta_id: Optional[int] = None
    fecha_iso: str
    fecha_fin_iso: Optional[str] = None
    hora_inicio: float
    duracion: float
    todo_el_dia: bool = False
    recurrencia: str = "none"
    ubicacion: Optional[str] = None
    videollamada: Optional[str] = None
    notificacion: Optional[str] = None
    descripcion: Optional[str] = None
    invitados: Optional[List[str]] = None
    completed: bool = False
    completed_at: Optional[str] = None
    is_recurring: bool = False
    rrule: Optional[str] = None

# ── Tareas de Evento ──────────────────────────────────────────────────────

class TareaCreate(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=MAX_TITULO)
    is_completed: bool = False

class TareaUpdate(BaseModel):
    titulo: Optional[str] = Field(None, min_length=1, max_length=MAX_TITULO)
    is_completed: Optional[bool] = None

class TareaResponse(BaseModel):
    id: int
    evento_id: int
    titulo: str
    is_completed: bool
    created_at: str


# ── Configuración ─────────────────────────────────────────────────────────

class ConfiguracionUpdate(BaseModel):
    sleep_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    sleep_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    semester_start: Optional[str] = None
    semester_end: Optional[str] = None
    meta_horas_semanal: Optional[float] = Field(None, ge=1, le=100)
    pomodoro_focus_min: Optional[int] = Field(None, ge=5, le=120)
    pomodoro_break_min: Optional[int] = Field(None, ge=1, le=60)

    @field_validator("semester_start", "semester_end")
    @classmethod
    def validar_fecha(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("Formato de fecha inválido. Usa YYYY-MM-DD.")
        return v


class ConfiguracionResponse(BaseModel):
    sleep_start: str = "23:00"
    sleep_end: str = "07:00"
    semester_start: Optional[str] = None
    semester_end: Optional[str] = None
    meta_horas_semanal: float = 20.0
    pomodoro_focus_min: int = 50
    pomodoro_break_min: int = 10


# ── Sesiones de estudio ───────────────────────────────────────────────────

class SesionEstudioCreate(BaseModel):
    evento_id: Optional[int] = None
    minutos_configurados: int = Field(..., ge=1, le=600)
    minutos_reales: int = Field(..., ge=0, le=600)
    finalizado_temprano: bool = False
    started_at: str  # ISO datetime
    ended_at: str    # ISO datetime


class ProductividadResponse(BaseModel):
    horas_estudiadas: float = 0.0
    meta: float = 20.0
    porcentaje: float = 0.0
    sesiones_semana: int = 0
    total_sesiones: int = 0
