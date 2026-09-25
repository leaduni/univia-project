// Muro: mensajes que dejaron quienes aportaron.
"use client"

import { MessageSquareHeart } from "lucide-react"
import { formatearSoles } from "./constantes"
import type { MensajeMuro } from "@/lib/donaciones-service"

interface MuroMensajesProps {
  mensajes: MensajeMuro[]
  cargando: boolean
}

export function MuroMensajes({ mensajes, cargando }: MuroMensajesProps) {
  if (cargando) {
    return (
      <section className="rounded-3xl border border-white/[0.08] bg-card/60 p-6 sm:p-8">
        <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </section>
    )
  }

  if (mensajes.length === 0) return null

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-6 sm:p-8">
      <h2 className="flex items-center gap-2 font-heading text-2xl font-bold text-foreground">
        <MessageSquareHeart className="w-5 h-5 text-[#d93340]" aria-hidden="true" />
        Muro de la comunidad
      </h2>

      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mensajes.map((item, indice) => (
          <li
            key={`${item.creado_en}-${indice}`}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <p className="text-sm leading-relaxed text-foreground">“{item.mensaje}”</p>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-semibold text-[#c4b5fd]">{item.nombre}</span>
              {item.facultad && <span>· {item.facultad}</span>}
              <span>· {formatearSoles(item.monto)}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
