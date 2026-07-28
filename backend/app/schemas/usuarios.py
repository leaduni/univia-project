from pydantic import BaseModel, field_validator

from app.core.validators import (
    EMAIL_PATTERN,
    CODIGO_PATTERN,
    validar_codigo_estudiante,
    validar_email_institucional,
    validar_password,
)

# Se reexportan los patrones porque otros módulos ya los importaban desde aquí.
__all__ = [
    "EMAIL_PATTERN",
    "CODIGO_PATTERN",
    "RegistroEstudiante",
    "RegistroCompleto",
    "PerfilUpdate",
    "CambioPassword",
]


class RegistroEstudiante(BaseModel):
    email: str
    codigo_estudiante: str
    nombre_completo: str

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str) -> str:
        return validar_email_institucional(v)

    @field_validator("codigo_estudiante")
    @classmethod
    def validar_codigo(cls, v: str) -> str:
        return validar_codigo_estudiante(v)


class RegistroCompleto(BaseModel):
    email: str
    password: str
    codigo_estudiante: str
    nombre_completo: str

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str) -> str:
        return validar_email_institucional(v)

    @field_validator("codigo_estudiante")
    @classmethod
    def validar_codigo(cls, v: str) -> str:
        return validar_codigo_estudiante(v)

    @field_validator("password")
    @classmethod
    def validar_pass(cls, v: str) -> str:
        return validar_password(v)


class PerfilUpdate(BaseModel):
    email: str | None = None
    codigo_estudiante: str | None = None
    nombre_completo: str | None = None

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str | None) -> str | None:
        return validar_email_institucional(v) if v is not None else v

    @field_validator("codigo_estudiante")
    @classmethod
    def validar_codigo(cls, v: str | None) -> str | None:
        return validar_codigo_estudiante(v) if v is not None else v


class CambioPassword(BaseModel):
    """Cambio de contraseña del estudiante (RF-PRF-03).

    Las reglas viven en core/validators.py para que el flujo de recuperación
    de la Fase 2 aplique exactamente las mismas condiciones de seguridad.
    """

    password_actual: str
    password_nueva: str

    @field_validator("password_nueva")
    @classmethod
    def validar_pass_nueva(cls, v: str) -> str:
        return validar_password(v)
