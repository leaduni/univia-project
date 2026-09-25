"use client"

// Accesos rápidos y compartir (columna derecha, Fase 5): enlaces a /recursos
// y /malla + copiar enlace de invitación (telemetría vía evento compartir).

import { useState } from "react"
import Link from "next/link"
import { BookOpen, Check, Link2, Map } from "lucide-react"
import { gamificacionService } from "@/lib/gamificacion-service"

export function AccesosRapidos() {
  const [copiado, setCopiado] = useState(false)

  const compartir = async () => {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/registro`
          : "https://univia.app/registro"
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
      gamificacionService.registrarEventoCompartir("foro").catch(() => {})
    } catch {
      // Sin clipboard disponible: no bloquea la UI.
    }
  }

  const clasesLink =
    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"

  return (
    <section aria-label="Enlaces rápidos" className="space-y-0.5">
      <Link href="/recursos" className={clasesLink}>
        <BookOpen className="h-4 w-4 shrink-0" />
        Biblioteca de recursos
      </Link>
      <Link href="/malla" className={clasesLink}>
        <Map className="h-4 w-4 shrink-0" />
        Mi ruta académica
      </Link>
      <button type="button" onClick={compartir} className={`${clasesLink} w-full text-left`}>
        {copiado ? (
          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
        ) : (
          <Link2 className="h-4 w-4 shrink-0" />
        )}
        {copiado ? "¡Enlace copiado!" : "Invitar a un amigo"}
      </button>
    </section>
  )
}
