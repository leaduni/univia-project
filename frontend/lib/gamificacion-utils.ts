// Utilidades puras del módulo de gamificación (testeables sin red ni UI).
// Muestran el progreso de nivel sin duplicar su cálculo: el servidor
// (fase10_actualizar_xp) sigue siendo la autoridad; aquí solo se formatea.

import type { IntentoHistorico } from "@/types/gamificacion"

/** Formatea XP con separadores de miles (es-PE): 2150 → "2 150". */
export function formatearXp(xp: number | null | undefined): string {
  const valor = Math.max(0, Math.round(Number(xp ?? 0)))
  try {
    return new Intl.NumberFormat("es-PE").format(valor)
  } catch {
    return String(valor)
  }
}

/** Fecha corta legible (dd/mm/aaaa) desde un ISO del backend. */
export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return "—"
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso.slice(0, 10)
  return fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export interface PuntoGrafica {
  x: number
  y: number
  nota: number
  fecha: string
}

/**
 * Puntos `x,y` de una curva SVG de notas (eje X tiempo, eje Y nota sobre 20).
 * Escala fija de 0 a 20 para que dos curvas diferentes sean comparables.
 */
export function puntosGraficaNotas(
  intentos: Pick<IntentoHistorico, "nota" | "fecha_completado">[],
  ancho = 320,
  alto = 96,
): PuntoGrafica[] {
  if (!intentos?.length) return []
  const n = intentos.length
  const padX = 20
  const padY = 14
  return intentos.map((intento, i) => {
    const x = n === 1 ? Math.round(ancho / 2) : Math.round(padX + (i * (ancho - 2 * padX)) / (n - 1))
    const nota = Math.max(0, Math.min(20, Number(intento.nota) || 0))
    const y = Math.round(alto - padY - (nota / 20) * (alto - 2 * padY))
    return { x, y, nota, fecha: String(intento.fecha_completado).slice(0, 10) }
  })
}

/** String `"x,y x,y..."` compatible con el atributo `points` de una polyline. */
export function svgPolyline(puntos: PuntoGrafica[]): string | null {
  if (!puntos?.length) return null
  return puntos.map((p) => `${p.x},${p.y}`).join(" ")
}

/** Medalla y color del podio según el puesto (1..3). */
export function podioDePuesto(puesto: number): { medalla: string; gradiente: string } | null {
  if (puesto === 1) return { medalla: "🥇", gradiente: "from-amber-400 to-yellow-600" }
  if (puesto === 2) return { medalla: "🥈", gradiente: "from-slate-300 to-slate-400" }
  if (puesto === 3) return { medalla: "🥉", gradiente: "from-orange-400 to-amber-600" }
  return null
}

// ---------------------------------------------------------------------------
// Código de referido (`?ref=`) — sobrevive del registro al onboarding.
// El backend los genera como 10 caracteres hex en mayúsculas (migración fase 10).
// ---------------------------------------------------------------------------

const CLAVE_CODIGO_REFERIDO = "univia:codigo_referido"
const CODIGO_REFFERIDO_PATTERN = /^[0-9a-fA-F]{10}$/

/** True si el parámetro `?ref=` tiene el formato de un código de referido. */
export function esCodigoReferidoValido(codigo: string | null | undefined): boolean {
  return typeof codigo === "string" && CODIGO_REFFERIDO_PATTERN.test(codigo.trim())
}

/** Persiste el código de referido para consumirlo al completar el onboarding. */
export function guardarCodigoReferido(codigo: string | null | undefined): void {
  if (!esCodigoReferidoValido(codigo)) return
  try {
    localStorage.setItem(CLAVE_CODIGO_REFERIDO, (codigo as string).trim().toUpperCase())
  } catch { /* almacenamiento restringido: el referido se pierde, no es crítico */ }
}

/** Lee y borra el código guardado (una sola atribución por flujo de registro). */
export function tomarCodigoReferido(): string | null {
  try {
    const codigo = localStorage.getItem(CLAVE_CODIGO_REFERIDO)
    localStorage.removeItem(CLAVE_CODIGO_REFERIDO)
    return codigo && esCodigoReferidoValido(codigo) ? codigo : null
  } catch {
    return null
  }
}