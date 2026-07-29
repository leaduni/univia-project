/**
 * Racha de días de estudio, calculada desde la actividad del estudiante.
 *
 * El backend (`GET /dashboard/actividad`) devuelve `actividad_por_dia` con un
 * conteo de eventos por fecha. Aquí se traduce a "cuántos días seguidos vengo
 * estudiando", que es lo que el dashboard muestra.
 */

/** Fecha local en formato YYYY-MM-DD, que es como llegan los días del backend. */
function claveDia(fecha: Date): string {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, "0")
  const d = String(fecha.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function restarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha)
  copia.setDate(copia.getDate() - dias)
  return copia
}

export interface DiaActividad {
  fecha: string
  eventos: number
}

/**
 * Días consecutivos con actividad, contando hacia atrás desde hoy.
 *
 * Si hoy todavía no hay actividad pero ayer sí, la racha se mantiene: el día
 * no ha terminado y cortarla a media mañana castigaría al estudiante por no
 * haber entrado aún.
 *
 * @param dias Lista de `{fecha, eventos}` del backend, en cualquier orden.
 * @param hoy Fecha de referencia; parametrizada para poder probarla.
 */
export function calcularRacha(dias: DiaActividad[], hoy: Date = new Date()): number {
  if (!dias?.length) return 0

  const conActividad = new Set(
    dias.filter((d) => d && d.eventos > 0 && d.fecha).map((d) => d.fecha.slice(0, 10)),
  )
  if (!conActividad.size) return 0

  // Punto de partida: hoy si hay actividad; si no, ayer. Cualquier otro caso
  // significa que la racha ya se cortó.
  let inicio: Date
  if (conActividad.has(claveDia(hoy))) {
    inicio = hoy
  } else if (conActividad.has(claveDia(restarDias(hoy, 1)))) {
    inicio = restarDias(hoy, 1)
  } else {
    return 0
  }

  let racha = 0
  let cursor = inicio
  while (conActividad.has(claveDia(cursor))) {
    racha++
    cursor = restarDias(cursor, 1)
  }

  return racha
}

/** Frase de la racha, adaptada a lo que el número significa. */
export function mensajeRacha(racha: number): string {
  if (racha === 0) return "Hoy es un buen día para retomar. Empieza por un curso."
  if (racha === 1) return "Llevas 1 día de racha. El primero siempre es el que cuesta."
  return `Llevas ${racha} días de racha estudiando. La constancia gana ciclos.`
}
