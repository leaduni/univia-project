// Cliente del módulo de donaciones (Fase 12).
import { fetchWithAuth } from './api-service'
import { API_URL } from './env'

export interface ResumenDonaciones {
  meta: number
  recaudado: number
  gastado: number
  caja_neto: number
  porcentaje: number
  total_donaciones: number
  total_donantes: number
  destino_aporte: string
  actualizado_en: string
}

export interface DonanteTop {
  puesto: number
  nombre: string
  facultad: string | null
  total: number
  aportes: number
}

export interface MensajeMuro {
  nombre: string
  facultad: string | null
  mensaje: string
  monto: number
  creado_en: string
}

export interface IntencionDonacion {
  id: number
  monto_base: number
  monto_exacto: number
  centavo: number
  expira_en: string
  minutos_reserva: number
}

export interface DatosIntencion {
  monto: number
  tipo_donante: 'estudiante' | 'egresado'
  facultad?: string | null
  nombre_mostrar?: string | null
  es_anonimo: boolean
  mensaje_muro?: string | null
}

async function leerError(response: Response, fallback: string): Promise<Error> {
  const cuerpo = await response.json().catch(() => null)
  const mensaje = cuerpo?.errors?.[0]?.message || cuerpo?.detail || fallback
  return new Error(String(mensaje).replace(/^Value error,\s*/i, ''))
}

export async function getResumenDonaciones(): Promise<ResumenDonaciones> {
  const response = await fetchWithAuth(`${API_URL}/donaciones/resumen`)
  if (!response.ok) throw await leerError(response, 'No se pudo cargar el resumen de donaciones.')
  return response.json()
}

export async function getTopDonantes(limite = 10): Promise<DonanteTop[]> {
  const response = await fetchWithAuth(`${API_URL}/donaciones/top?limite=${limite}`)
  if (!response.ok) throw await leerError(response, 'No se pudo cargar el cuadro de honor.')
  return response.json()
}

export async function getMuroDonaciones(limite = 20): Promise<MensajeMuro[]> {
  const response = await fetchWithAuth(`${API_URL}/donaciones/muro?limite=${limite}`)
  if (!response.ok) throw await leerError(response, 'No se pudo cargar el muro.')
  return response.json()
}

/** Reserva el centavo identificador y devuelve el monto exacto a yapear. */
export async function crearIntencion(datos: DatosIntencion): Promise<IntencionDonacion> {
  const response = await fetchWithAuth(`${API_URL}/donaciones/intencion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  if (!response.ok) throw await leerError(response, 'No se pudo iniciar tu donación.')
  return response.json()
}

/** Marca "ya yapeé" sobre una intención activa. */
export async function reportarEnvio(donacionId: number): Promise<void> {
  const response = await fetchWithAuth(`${API_URL}/donaciones/${donacionId}/reportar`, {
    method: 'POST',
  })
  if (!response.ok) throw await leerError(response, 'No se pudo registrar tu aporte.')
}
