/**
 * Validaciones compartidas del frontend.
 *
 * Espejo de `backend/app/core/validators.py`. Las reglas y los mensajes se
 * mantienen idénticos a propósito: si el formulario acepta algo que el backend
 * rechaza, el estudiante llena todo y recién al enviar se entera del error.
 *
 * Si cambia una regla en el backend, hay que cambiarla también aquí.
 */

export const DOMINIO_INSTITUCIONAL = "uni.pe"

/** Correo institucional: cualquier usuario, pero solo dominio @uni.pe. */
export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@uni\.pe$/

/** Código UNI: 8 dígitos y 1 letra verificadora (ej. 20210001K). */
export const CODIGO_PATTERN = /^[0-9]{8}[A-Za-z]$/

export const PASSWORD_MIN_LENGTH = 8
/** Límite de bcrypt, que es lo que usa Supabase Auth por debajo. */
export const PASSWORD_MAX_LENGTH = 72

export const MSG_EMAIL_INVALIDO =
  `El correo electrónico debe ser una cuenta institucional válida terminada en @${DOMINIO_INSTITUCIONAL}.`
export const MSG_CODIGO_INVALIDO =
  "El código universitario debe tener 8 números y 1 letra verificadora al final (ej. 20210001K)."
export const MSG_PASSWORD_CORTA =
  `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
export const MSG_PASSWORD_LARGA =
  `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`
export const MSG_PASSWORD_SIN_LETRA = "La contraseña debe incluir al menos una letra."
export const MSG_PASSWORD_SIN_NUMERO = "La contraseña debe incluir al menos un número."
export const MSG_PASSWORD_VACIA = "La contraseña es obligatoria."

/** Al iniciar sesión se admite el correo institucional o el código UNI. */
export const MSG_IDENTIFICADOR_INVALIDO =
  "Ingresa tu correo institucional (@uni.pe) o tu código universitario de 8 números y 1 letra (ej. 20210001K)."

export const esEmailInstitucional = (valor: string): boolean =>
  EMAIL_PATTERN.test(valor.trim())

export const esCodigoEstudiante = (valor: string): boolean =>
  CODIGO_PATTERN.test(valor.trim())

export const normalizarEmail = (valor: string): string => valor.trim().toLowerCase()

export const normalizarCodigo = (valor: string): string => valor.trim().toUpperCase()

export const tieneLetra = (valor: string): boolean => /[a-zA-Z]/.test(valor)

export const tieneNumero = (valor: string): boolean => /[0-9]/.test(valor)
