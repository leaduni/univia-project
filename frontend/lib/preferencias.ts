/**
 * Preferencias del estudiante guardadas en el navegador.
 *
 * No hay tabla de preferencias en la base todavía, así que esto vive en
 * localStorage: se conserva entre sesiones en el mismo equipo, pero no viaja
 * con la cuenta. Cuando exista el endpoint, este módulo es el único lugar que
 * hay que cambiar.
 */

const CLAVE_RECOMENDACIONES = "univia:preferencias:recomendaciones-ia"

/** Evento propio para que otras pantallas reaccionen sin recargar. */
export const EVENTO_PREFERENCIAS = "univia:preferencias-cambiadas"

export function verRecomendacionesIA(): boolean {
    if (typeof window === "undefined") return true // SSR: se asume activado
    return window.localStorage.getItem(CLAVE_RECOMENDACIONES) !== "false"
}

export function setRecomendacionesIA(activo: boolean): void {
    if (typeof window === "undefined") return
    window.localStorage.setItem(CLAVE_RECOMENDACIONES, String(activo))
    // `storage` solo se dispara en otras pestañas; este evento cubre la actual.
    window.dispatchEvent(new CustomEvent(EVENTO_PREFERENCIAS))
}
