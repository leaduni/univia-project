"""Validaciones transversales de UniVia (Fase 1 — núcleo de datos y seguridad).

Este módulo es la fuente única de verdad para las reglas que se repiten en
varios módulos del backend. Los routers y schemas deben importar desde aquí
en lugar de redefinir patrones o mensajes propios, para que un cambio de regla
(por ejemplo, el dominio institucional) se aplique en toda la API a la vez.

Cubre:
    - RF-EST-02: formato de correo institucional y formato de código de alumno.
    - RNF-04 / RF-PRF-03: condiciones de seguridad de contraseña.
"""

import re

# --- Correo institucional (RF-EST-02) ---

DOMINIO_INSTITUCIONAL = "uni.pe"
EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

MSG_EMAIL_INVALIDO = (
    "El correo electrónico debe ser una cuenta institucional válida "
    f"terminada en @{DOMINIO_INSTITUCIONAL}."
)
MSG_EMAIL_DUPLICADO = "Este correo institucional ya tiene una cuenta asociada."

# --- Código universitario (RF-EST-02) ---
# Formato UNI: 8 dígitos + 1 letra verificadora (ej. 20210001K).

CODIGO_PATTERN = re.compile(r"^[0-9]{8}[A-Za-z]$")

MSG_CODIGO_INVALIDO = (
    "El código universitario debe tener 8 números y 1 letra verificadora "
    "al final (ej. 20210001K)."
)
MSG_CODIGO_DUPLICADO = "Este código universitario ya se encuentra registrado en el sistema."

# --- Contraseña (RNF-04, consumido por RF-PRF-03) ---

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 72  # Límite de bcrypt, que es lo que usa Supabase Auth por debajo.

MSG_PASSWORD_CORTA = (
    f"La contraseña debe tener al menos {PASSWORD_MIN_LENGTH} caracteres."
)
MSG_PASSWORD_LARGA = (
    f"La contraseña no puede superar los {PASSWORD_MAX_LENGTH} caracteres."
)
MSG_PASSWORD_SIN_LETRA = "La contraseña debe incluir al menos una letra."
MSG_PASSWORD_SIN_NUMERO = "La contraseña debe incluir al menos un número."
MSG_PASSWORD_VACIA = "La contraseña es obligatoria."


# --- Nombres y apellidos (RF-PRF-02) ---

NOMBRE_MIN_LENGTH = 3
NOMBRE_MAX_LENGTH = 120

MSG_NOMBRE_VACIO = "Escribe tus nombres y apellidos."
MSG_NOMBRE_CORTO = f"El nombre debe tener al menos {NOMBRE_MIN_LENGTH} caracteres."
MSG_NOMBRE_LARGO = f"El nombre no puede superar los {NOMBRE_MAX_LENGTH} caracteres."
MSG_NOMBRE_CON_DIGITOS = "El nombre no puede contener números."


def normalizar_email(valor: str) -> str:
    """Normaliza un correo para comparación y almacenamiento."""
    return valor.strip().lower()


def normalizar_codigo(valor: str) -> str:
    """Normaliza un código de alumno para comparación y almacenamiento."""
    return valor.strip().upper()


def es_email_institucional(valor: str) -> bool:
    """Indica si el valor tiene forma de correo institucional, sin lanzar error."""
    return bool(EMAIL_PATTERN.match(valor.strip()))


def es_codigo_estudiante(valor: str) -> bool:
    """Indica si el valor tiene forma de código universitario, sin lanzar error."""
    return bool(CODIGO_PATTERN.match(valor.strip()))


def validar_email_institucional(valor: str) -> str:
    """Valida y normaliza un correo institucional.

    Raises:
        ValueError: si el correo no pertenece al dominio institucional.
    """
    if not es_email_institucional(valor):
        raise ValueError(MSG_EMAIL_INVALIDO)
    return normalizar_email(valor)


def validar_codigo_estudiante(valor: str) -> str:
    """Valida y normaliza un código universitario.

    Raises:
        ValueError: si el código no cumple el formato de 8 dígitos + letra.
    """
    if not es_codigo_estudiante(valor):
        raise ValueError(MSG_CODIGO_INVALIDO)
    return normalizar_codigo(valor)


def validar_nombre_completo(valor: str) -> str:
    """Valida y normaliza nombres y apellidos (RF-PRF-02).

    Colapsa los espacios repetidos: 'Juan   Pérez' y 'Juan Pérez' son la misma
    persona y guardarlos distinto ensucia búsquedas y comparaciones.

    No se restringen tildes, apellidos compuestos ni apóstrofos: filtrar por
    alfabeto latino estricto deja fuera nombres válidos.

    Raises:
        ValueError: si el nombre está vacío, es muy corto/largo o trae números.
    """
    if valor is None:
        raise ValueError(MSG_NOMBRE_VACIO)

    limpio = " ".join(valor.split())

    if not limpio:
        raise ValueError(MSG_NOMBRE_VACIO)
    if len(limpio) < NOMBRE_MIN_LENGTH:
        raise ValueError(MSG_NOMBRE_CORTO)
    if len(limpio) > NOMBRE_MAX_LENGTH:
        raise ValueError(MSG_NOMBRE_LARGO)
    if any(c.isdigit() for c in limpio):
        raise ValueError(MSG_NOMBRE_CON_DIGITOS)

    return limpio


def validar_password(valor: str) -> str:
    """Valida una contraseña contra las condiciones de seguridad (RNF-04).

    Reglas vigentes: mínimo 8 caracteres, con al menos una letra y un número.
    La contraseña no se normaliza ni se recorta: los espacios son significativos.

    Raises:
        ValueError: con el primer incumplimiento encontrado, en mensaje accionable.
    """
    if not valor:
        raise ValueError(MSG_PASSWORD_VACIA)
    if len(valor) < PASSWORD_MIN_LENGTH:
        raise ValueError(MSG_PASSWORD_CORTA)
    if len(valor) > PASSWORD_MAX_LENGTH:
        raise ValueError(MSG_PASSWORD_LARGA)
    if not any(c.isalpha() for c in valor):
        raise ValueError(MSG_PASSWORD_SIN_LETRA)
    if not any(c.isdigit() for c in valor):
        raise ValueError(MSG_PASSWORD_SIN_NUMERO)
    return valor
