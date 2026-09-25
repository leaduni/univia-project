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

  const enlaceBase =
    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
  const iconoBase =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
  const textoBase = "text-xs text-white/45 group-hover:text-white/75"

  return (
    <section aria-label="Enlaces rápidos" className="space-y-0.5">
      <Link href="/recursos" className={enlaceBase}>
        <span className={`${iconoBase} bg-cyan-400/[0.06] text-cyan-300/70`}>
          <BookOpen className="h-4 w-4" />
        </span>
        <span className={textoBase}>Biblioteca de recursos</span>
      </Link>
      <Link href="/malla" className={enlaceBase}>
        <span className={`${iconoBase} bg-violet-400/[0.06] text-violet-300/70`}>
          <Map className="h-4 w-4" />
        </span>
        <span className={textoBase}>Mi ruta académica</span>
      </Link>
      <button type="button" onClick={compartir} className={enlaceBase}>
        <span className={`${iconoBase} bg-fuchsia-400/[0.06] text-fuchsia-300/70`}>
          {copiado ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
        </span>
        <span className={textoBase}>{copiado ? "¡Enlace copiado!" : "Invitar a un amigo"}</span>
      </button>
    </section>
  )
}
