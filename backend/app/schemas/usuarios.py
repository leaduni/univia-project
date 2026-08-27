from pydantic import BaseModel, Field, field_validator

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
    validar_nombre_completo,
    validar_password,
)

# Se reexportan los patrones porque otros módulos ya los importaban desde aquí.
__all__ = [
    "EMAIL_PATTERN",
    "CODIGO_PATTERN",
    "RegistroEstudiante",
    "RegistroCompleto",
    "LoginRequest",
    "RegistroInvitado",
    "SolicitudRecuperacion",
    "RestablecerPassword",
    "PerfilUpdate",
    "CambioPassword",
    "CambiarMalla",
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
            "Ingresa tu correo electrónico o código universitario de 8 números y 1 letra "
            "(ej. 20210001K)."
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


class RegistroInvitado(BaseModel):
    """Solicitud de acceso como invitado (POST /auth/solicitar-invitado).

    No crea cuenta ni escribe en Supabase: solo se notifica a los
    desarrolladores por correo.
    """

    nombre_completo: str
    email_contacto: str
    universidad_empresa: str
    motivo_solicitud: str

    @field_validator("nombre_completo")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        return validar_nombre_completo(v)

    @field_validator("email_contacto")
    @classmethod
    def validar_contacto(cls, v: str) -> str:
        v = (v or "").strip()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Ingresa un correo de contacto válido.")
        return v

    @field_validator("universidad_empresa")
    @classmethod
    def validar_institucion(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < 2:
            raise ValueError("Indica tu universidad o empresa.")
        return v

    @field_validator("motivo_solicitud")
    @classmethod
    def validar_motivo(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < 10:
            raise ValueError(
                "Cuéntanos brevemente el motivo de tu solicitud (mínimo 10 caracteres)."
            )
        return v


class PerfilUpdate(BaseModel):
    """Datos personales editables por el estudiante (RF-PRF-02).

    Solo nombres y apellidos, a propósito. El correo institucional y el código
    universitario identifican al estudiante ante la UNI: no son preferencias
    suyas y cambiarlos rompería la unicidad que valida el registro (RF-EST-02)
    y el login por código (RF-01). Antes este modelo los aceptaba, así que un
    PUT bien formado podía reescribirlos.
    """

    nombre_completo: str

    @field_validator("nombre_completo")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        return validar_nombre_completo(v)


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


class CambiarMalla(BaseModel):
    """Nueva malla seleccionada desde la vista de perfil (cambio de plan).

    Solo reasigna el plan al perfil; la re-selección de cursos aprobados la
    hace el estudiante al re-correr el onboarding (/onboarding).
    """

    malla_id: int = Field(gt=0)