// Cliente del módulo de gamificación, notas inmutables y ranking (Fase 10).
// Reutiliza `fetchWithAuth` de api-service.ts (token, timeout y reintentos de
// GET) y el mismo shape de errores `{errors:[{message}]}` / `{detail}`.

import { fetchWithAuth } from "./api-service"
import { leerOCache, TTL } from "./api-cache"
import type {
  HistorialCurso,
  MiPosicionRanking,
  PeriodoRanking,
  RespuestaRanking,
  ResultadoCheckIn,
  ResultadoCompartir,
  ResultadoReferido,
  ResumenGamificacion,
  ResumenNotas,
} from "@/types/gamificacion"
import { API_URL } from "@/lib/env"

function extraerMensaje(body: any): string {
  return (
    body?.errors?.[0]?.message ||
    body?.detail ||
    "Ocurrió un error al procesar la solicitud."
  )
}

async function leer<T>(url: string, fallback: string): Promise<T> {
  const response = await fetchWithAuth(url)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(extraerMensaje(body) || fallback)
  }
  return response.json()
}

async function leerCache<T>(
  clave: string,
  url: string,
  fallback: string,
  ttl: number,
): Promise<T> {
  return leerOCache<T>(clave, () => leer<T>(url, fallback), { ttl })
}

async function enviar<T>(url: string, method: string, body: unknown, fallback: string): Promise<T> {
  const response = await fetchWithAuth(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(extraerMensaje(data) || fallback)
  }
  return data as T
}

/** Clave de caché única por periodo: cambiar de pestaña no re-descarga. */
function rankingClave(periodo: PeriodoRanking): string {
  return `gamificacion:ranking:${periodo}`
}

async function sinCacheRanking(periodo: PeriodoRanking): Promise<void> {
  // El ranking es dato en vivo (puestos que cambian con cada XP): nunca se sirve
  // desde la caché de navegación, sólo se invalida la copia que pudiera existir.
  const { invalidarClave } = await import("./api-cache")
  invalidarClave(rankingClave(periodo))
  invalidarClave("gamificacion:resumen")
}

export const gamificacionService = {
  /** XP total, nivel, racha y código de referido (una vez por minuto). */
  getResumen(): Promise<ResumenGamificacion> {
    return leerCache<ResumenGamificacion>(
      "gamificacion:resumen",
      `${API_URL}/gamificacion/resumen`,
      "No se pudo cargar tu resumen de gamificación.",
      TTL.UN_MINUTO,
    )
  },

  /** Check-in diario idempotente; invalida el resumen cacheado. */
  checkIn(): Promise<ResultadoCheckIn> {
    void sinCacheRanking("global")
    return enviar<ResultadoCheckIn>(
      `${API_URL}/gamificacion/check-in`,
      "POST",
      {},
      "No se pudo registrar tu check-in.",
    )
  },

  /** Ranking global o semanal paginado por cursor (sin caché). */
  getRanking(periodo: PeriodoRanking, limite: number, cursor?: string | null): Promise<RespuestaRanking> {
    const params = new URLSearchParams({ periodo, limite: String(limite) })
    if (cursor) params.append("cursor", cursor)
    return leer<RespuestaRanking>(
      `${API_URL}/gamificacion/ranking?${params.toString()}`,
      "No se pudo cargar el ranking.",
    )
  },

  /** Puesto del usuario autenticado en el periodo indicado. */
  getMiPosicion(periodo: PeriodoRanking): Promise<MiPosicionRanking> {
    return leer<MiPosicionRanking>(
      `${API_URL}/gamificacion/ranking/mi-posicion?periodo=${periodo}`,
      "No se pudo cargar tu posición.",
    )
  },

  /** Acredita el referido al completar onboarding (idempotente). */
  registrarReferido(codigo: string): Promise<ResultadoReferido> {
    return enviar<ResultadoReferido>(
      `${API_URL}/gamificacion/referidos/registrar-onboarding`,
      "POST",
      { codigo },
      "No se pudo registrar tu código de referido.",
    )
  },

  /** Telemetría de compartir: una intención por día. */
  registrarEventoCompartir(canal: string): Promise<ResultadoCompartir> {
    return enviar<ResultadoCompartir>(
      `${API_URL}/gamificacion/compartir/evento`,
      "POST",
      { canal },
      "No se pudo registrar el evento.",
    )
  },

  /** Historial inmutable de evaluaciones de un curso. */
  getHistorialCurso(cursoId: string | number): Promise<HistorialCurso> {
    return leerCache<HistorialCurso>(
      `notas:historial:${cursoId}`,
      `${API_URL}/notas/cursos/${cursoId}/historial`,
      "No se pudo cargar el historial de notas.",
      TTL.UN_MINUTO,
    )
  },

  /** Indicador de promedio académico inmutable + desglose por curso. */
  getResumenNotas(): Promise<ResumenNotas> {
    return leerCache<ResumenNotas>(
      "notas:resumen",
      `${API_URL}/notas/resumen`,
      "No se pudo cargar tu resumen de notas.",
      TTL.UN_MINUTO,
    )
  },
}