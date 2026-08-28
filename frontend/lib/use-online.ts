// Estado de conexión del navegador, para avisar antes de que una acción falle.
"use client"

import { useEffect, useState } from "react"

/**
 * `true` mientras el navegador se considere conectado.
 *
 * Arranca en `true` a propósito: en el servidor no existe `navigator`, y
 * empezar en `false` haría que el primer render pintara el aviso de "sin
 * conexión" y luego lo quitara (parpadeo y desajuste de hidratación). El valor
 * real se lee en el primer efecto, ya en el cliente.
 *
 * Ojo: `navigator.onLine` indica que hay una interfaz de red activa, no que
 * internet funcione. Sirve para el caso común (Wi-Fi caído, modo avión); un
 * backend inaccesible con Wi-Fi conectado no se detecta aquí, y de eso se
 * encargan los timeouts del cliente HTTP.
 */
export function useOnline(): boolean {
    const [enLinea, setEnLinea] = useState(true)

    useEffect(() => {
        if (typeof window === "undefined") return

        // Sincroniza con el estado real: pudo perderse la conexión antes de
        // que este componente se montara.
        setEnLinea(window.navigator.onLine)

        const alConectar = () => setEnLinea(true)
        const alDesconectar = () => setEnLinea(false)

        window.addEventListener("online", alConectar)
        window.addEventListener("offline", alDesconectar)

        return () => {
            window.removeEventListener("online", alConectar)
            window.removeEventListener("offline", alDesconectar)
        }
    }, [])

    return enLinea
}
