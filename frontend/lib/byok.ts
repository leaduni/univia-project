// Gestión BYOK (Bring Your Own Key): la clave de Gemini del usuario vive
// ÚNICAMENTE en su navegador (localStorage) y nunca viaja a la base de datos ni
// a logs. Solo se envía al backend por la cabecera X-User-LLM-Key en las
// peticiones de IA (chatbot, evaluaciones y matrícula).

const CLAVE_BYOK = "univia_byok_gemini"

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