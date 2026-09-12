"""Schemas de Mensajería Directa (DM) entre estudiantes.

Contratos Pydantic para el router `app/routers/dm.py`. Siguen el estilo de
`schemas/foro.py` y `schemas/onboarding.py`.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

MAX_CUERPO_DM = 5000


class IniciarDMRequest(BaseModel):
    """Inicia (o reutiliza) una conversación 1 a 1 y envía el primer mensaje."""

    usuario_id: str = Field(min_length=36)
    primer_mensaje: str = Field(min_length=1, max_length=MAX_CUERPO_DM)

    @field_validator("primer_mensaje")
    @classmethod
    def validar_mensaje(cls, v: str) -> str:
        t = v.strip()
        if not t:
            raise ValueError("El mensaje no puede estar vacío.")
        return t


class EnviarMensajeDMRequest(BaseModel):
    """Envío de un mensaje dentro de una conversación existente."""

    cuerpo: str = Field(min_length=1, max_length=MAX_CUERPO_DM)

    @field_validator("cuerpo")
    @classmethod
    def validar_cuerpo(cls, v: str) -> str:
        t = v.strip()
        if not t:
            raise ValueError("El mensaje no puede estar vacío.")
        return t


class ConversacionDMOut(BaseModel):
    id: int
    usuario_a: str
    usuario_b: str
    creado_por: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Id y nombre del "otro" participante (el que no es el usuario actual).
    otro_id: Optional[str] = None
    otro_nombre: Optional[str] = None
    # Último mensaje y no leídos, para la bandeja.
    ultimo_mensaje: Optional[str] = None
    ultimo_mensaje_fecha: Optional[datetime] = None
    no_leidos: int = 0


class MensajeDMOut(BaseModel):
    id: int
    conversacion_dm_id: int
    remitente_id: str
    remitente_nombre: Optional[str] = None
    cuerpo: str
    leido: bool
    created_at: datetime
    # Conveniencia para la UI: true si el mensaje es del usuario actual.
    propio: bool = False