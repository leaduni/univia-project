"""Schemas de Mensajería Directa (DM) entre estudiantes.

Contratos Pydantic para el router `app/routers/dm.py`. Siguen el estilo de
`schemas/foro.py` y `schemas/onboarding.py`.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

MAX_CUERPO_DM = 5000


class IniciarDMRequest(BaseModel):
    """Inicia (o reutiliza) una conversación 1 a 1.

    `primer_mensaje` es opcional: los botones de "Mensaje" abren el chat sin
    enviar un saludo automático (evita mensajes duplicados al reutilizar un
    hilo existente). Si se envía, se inserta como primer mensaje.
    """

    # UUID de `perfiles.id` (auth.users). Pydantic rechaza 00000000-... o
    # IDs sintéticos como `uni_XXXXXX` con 422 antes de tocar la base.
    usuario_id: UUID
    primer_mensaje: Optional[str] = Field(default=None, max_length=MAX_CUERPO_DM)

    @field_validator("primer_mensaje")
    @classmethod
    def validar_mensaje(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
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


class UsuarioDMBuscable(BaseModel):
    """Modelo público del directorio de contactos (sin email completo).

    `email_enmascarado` permite confirmar coincidencias de correo/código sin
    exponer el email íntegro de otro estudiante.
    """

    id: str
    nombre: Optional[str] = None
    alias: Optional[str] = None
    avatar_url: Optional[str] = None
    codigo_estudiante: Optional[str] = None
    email_enmascarado: Optional[str] = None