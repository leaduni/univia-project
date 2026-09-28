// Gestión BYOK (Bring Your Own Key): la clave de Gemini del usuario vive
// ÚNICAMENTE en su navegador (localStorage) y nunca viaja a la base de datos ni
// a logs. Solo se envía al backend por la cabecera X-User-LLM-Key en las
// peticiones de IA (chatbot, evaluaciones y matrícula).

const CLAVE_BYOK = "venus_byok_gemini"
const CLAVE_BYOK_ANTERIOR = "univia_byok_gemini"

// No se valida el formato en el cliente: las claves de AI Studio empiezan por
// "AIza…", pero las de Google Cloud/Vertex pueden tener otro prefijo, y una
// validación rígida bloquearía claves legítimas. Lo único que se exige es que
// el usuario haya pegado algo: la validación real la hace el backend con una
// llamada a Google (endpoint /chatbot/validate-key).
export function esClaveByokUsable(clave: string): boolean {
    return clave.trim().length > 0
}

export function leerClaveByok(): string | null {
    try {
        const crudoActual = localStorage.getItem(CLAVE_BYOK)
        const crudo = crudoActual ?? localStorage.getItem(CLAVE_BYOK_ANTERIOR)
        if (crudoActual === null && crudo !== null) {
            try {
                localStorage.setItem(CLAVE_BYOK, crudo)
                localStorage.removeItem(CLAVE_BYOK_ANTERIOR)
            } catch {
                // La clave anterior sigue siendo legible si falla la migración.
            }
        }
        return crudo && crudo.trim() ? crudo.trim() : null
    } catch {
        // Modo privado o almacenamiento restringido: sin BYOK, no es un fallo.
        return null
    }
}

export function guardarClaveByok(clave: string): void {
    try {
        localStorage.setItem(CLAVE_BYOK, clave.trim())
        localStorage.removeItem(CLAVE_BYOK_ANTERIOR)
    } catch {
        /* nada que hacer si no se puede persistir */
    }
}

export function borrarClaveByok(): void {
    try {
        localStorage.removeItem(CLAVE_BYOK)
        localStorage.removeItem(CLAVE_BYOK_ANTERIOR)
    } catch {
        /* idem */
    }
}