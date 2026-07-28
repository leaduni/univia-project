import re
from pydantic import BaseModel, field_validator

EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@uni\.pe$")
CODIGO_PATTERN = re.compile(r"^[0-9]{8}[A-Za-z]$")


class RegistroEstudiante(BaseModel):
    email: str
    codigo_estudiante: str
    nombre_completo: str

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str) -> str:
        if not EMAIL_PATTERN.match(v.strip()):
            raise ValueError(
                "El correo electrónico debe ser una cuenta institucional válida terminada en @uni.pe."
            )
        return v.strip().lower()

    @field_validator("codigo_estudiante")
    @classmethod
    def validar_codigo(cls, v: str) -> str:
        if not CODIGO_PATTERN.match(v.strip()):
            raise ValueError(
                "El código universitario debe tener 8 números y 1 letra verificadora al final (ej. 20210001K)."
            )
        return v.strip().upper()


class RegistroCompleto(BaseModel):
    email: str
    password: str
    codigo_estudiante: str
    nombre_completo: str

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str) -> str:
        if not EMAIL_PATTERN.match(v.strip()):
            raise ValueError(
                "El correo electrónico debe ser una cuenta institucional válida terminada en @uni.pe."
            )
        return v.strip().lower()

    @field_validator("codigo_estudiante")
    @classmethod
    def validar_codigo(cls, v: str) -> str:
        if not CODIGO_PATTERN.match(v.strip()):
            raise ValueError(
                "El código universitario debe tener 8 números y 1 letra verificadora al final (ej. 20210001K)."
            )
        return v.strip().upper()


class PerfilUpdate(BaseModel):
    email: str | None = None
    codigo_estudiante: str | None = None
    nombre_completo: str | None = None

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str | None) -> str | None:
        if v is not None and not EMAIL_PATTERN.match(v.strip()):
            raise ValueError(
                "El correo electrónico debe ser una cuenta institucional válida terminada en @uni.pe."
            )
        return v.strip().lower() if v else v

    @field_validator("codigo_estudiante")
    @classmethod
    def validar_codigo(cls, v: str | None) -> str | None:
        if v is not None and not CODIGO_PATTERN.match(v.strip()):
            raise ValueError(
                "El código universitario debe tener 8 números y 1 letra verificadora al final (ej. 20210001K)."
            )
        return v.strip().upper() if v else v
