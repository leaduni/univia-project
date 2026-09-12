// Gestión BYOK (Bring Your Own Key): la clave de Gemini del usuario vive
// ÚNICAMENTE en su navegador (localStorage) y nunca viaja a la base de datos ni
// a logs. Solo se envía al backend por la cabecera X-User-LLM-Key en las
// peticiones del chatbot.

const CLAVE_BYOK = "univia_byok_gemini"

// El patrón de claves de Google AI Studio/Gemini empieza por "AIza".
// Es solo un chequeo de formato rápido; la validación real es server-side.
export function formatoGeminiValido(clave: string): boolean {
    return /^AIza[0-9A-Za-z_\-]{20,}$/.test(clave.trim())
}

export function leerClaveByok(): string | null {
    try {
        const crudo = localStorage.getItem(CLAVE_BYOK)
        return crudo && crudo.trim() ? crudo.trim() : null
    } catch {
        // Modo privado o almacenamiento restringido: sin BYOK, no es un fallo.
        return null
    }
}

export function guardarClaveByok(clave: string): void {
    try {
        localStorage.setItem(CLAVE_BYOK, clave.trim())
    } catch {
        /* nada que hacer si no se puede persistir */
    }
}

export function borrarClaveByok(): void {
    try {
        localStorage.removeItem(CLAVE_BYOK)
    } catch {
        /* idem */
    }
}