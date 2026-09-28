/**
 * Preferencias del estudiante guardadas en el navegador.
 *
 * No hay tabla de preferencias en la base todavía, así que esto vive en
 * localStorage: se conserva entre sesiones en el mismo equipo, pero no viaja
 * con la cuenta. Cuando exista el endpoint, este módulo es el único lugar que
 * hay que cambiar.
 */

const CLAVE_RECOMENDACIONES = "venus:preferencias:recomendaciones-ia"
const CLAVE_RECOMENDACIONES_ANTERIOR = "univia:preferencias:recomendaciones-ia"

/** Evento propio para que otras pantallas reaccionen sin recargar. */
export const EVENTO_PREFERENCIAS = "venus:preferencias-cambiadas"

export function verRecomendacionesIA(): boolean {
    if (typeof window === "undefined") return true // SSR: se asume activado
    const actual = window.localStorage.getItem(CLAVE_RECOMENDACIONES)
    if (actual !== null) return actual !== "false"
    const anterior = window.localStorage.getItem(CLAVE_RECOMENDACIONES_ANTERIOR)
    if (anterior !== null) {
        window.localStorage.setItem(CLAVE_RECOMENDACIONES, anterior)
        window.localStorage.removeItem(CLAVE_RECOMENDACIONES_ANTERIOR)
    }
    return anterior !== "false"
}

export function setRecomendacionesIA(activo: boolean): void {
    if (typeof window === "undefined") return
    window.localStorage.setItem(CLAVE_RECOMENDACIONES, String(activo))
    window.localStorage.removeItem(CLAVE_RECOMENDACIONES_ANTERIOR)
    // `storage` solo se dispara en otras pestañas; este evento cubre la actual.
    window.dispatchEvent(new CustomEvent(EVENTO_PREFERENCIAS))
}
