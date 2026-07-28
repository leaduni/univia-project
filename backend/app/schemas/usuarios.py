from pydantic import BaseModel, field_validator

from app.core.validators import (
    EMAIL_PATTERN,
    CODIGO_PATTERN,
    MSG_PASSWORD_VACIA,
    es_codigo_estudiante,
    es_email_institucional,
    normalizar_codigo,
    normalizar_email,
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
    "LoginRequest",
    "SolicitudRecuperacion",
    "RestablecerPassword",
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


class LoginRequest(BaseModel):
    """Login por correo institucional o código universitario (RF-01)."""

    identificador: str
    password: str

    @field_validator("identificador")
    @classmethod
    def validar_identificador(cls, v: str) -> str:
        if es_email_institucional(v):
            return normalizar_email(v)
        if es_codigo_estudiante(v):
            return normalizar_codigo(v)
        raise ValueError(
            "Ingresa tu correo institucional (@uni.pe) o tu código universitario "
            "de 8 números y 1 letra (ej. 20210001K)."
        )

    @field_validator("password")
    @classmethod
    def validar_pass(cls, v: str) -> str:
        # A propósito NO se aplica la política de complejidad aquí: al iniciar
        # sesión hay que aceptar contraseñas anteriores a la regla vigente, y
        # rechazarlas por formato revelaría la política a quien no tiene cuenta.
        if not v:
            raise ValueError(MSG_PASSWORD_VACIA)
        return v

    @property
    def es_email(self) -> bool:
        return es_email_institucional(self.identificador)


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


class SolicitudRecuperacion(BaseModel):
    """Solicitud de correo de recuperación de contraseña (RF-03)."""

    email: str

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str) -> str:
        return validar_email_institucional(v)


class RestablecerPassword(BaseModel):
    """Contraseña nueva enviada desde el enlace de recuperación (RF-03).

    No pide la contraseña anterior: el estudiante llega aquí justamente
    porque no la recuerda. Lo que acredita su identidad es la sesión que
    Supabase crea al abrir el enlace del correo.
    """

    password_nueva: str

    @field_validator("password_nueva")
    @classmethod
    def validar_pass_nueva(cls, v: str) -> str:
        return validar_password(v)


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