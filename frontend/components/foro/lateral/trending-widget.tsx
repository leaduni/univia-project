"use client"

// Widget de tendencias (columna izquierda, Fase 5): top 5 hilos de las
// últimas 24h (fallback 7d del backend), ordenados por score.

import { useEffect, useState } from "react"
import Link from "next/link"
import { Flame, MessageSquare } from "lucide-react"
import { foroService } from "@/lib/foro-service"
import type { Publicacion } from "@/types/foro"

export function TrendingWidget() {
  const [hilos, setHilos] = useState<Publicacion[] | null>(null)
  const [ventana, setVentana] = useState<"24h" | "7d">("24h")

  useEffect(() => {
    let activo = true
    foroService
      .getTendencias()
      .then((resp) => {
        if (!activo) return
        setHilos(resp.publicaciones)
        setVentana(resp.ventana)
      })
      .catch(() => {
        if (activo) setHilos([])
      })
    return () => {
      activo = false
    }
  }, [])

  return (
    <section aria-label="Tendencias" className="space-y-1">
      <h3 className="mb-1.5 flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Flame className="h-3.5 w-3.5 text-orange-400" />
        Tendencias
        <span className="ml-auto font-normal normal-case">{ventana === "24h" ? "24 h" : "7 d"}</span>
      </h3>

      {hilos === null ? (
        <div className="space-y-2 px-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : hilos.length === 0 ? (
        <p className="px-3 text-xs text-muted-foreground">Sin actividad reciente.</p>
      ) : (
        <ol className="space-y-0.5">
          {hilos.map((hilo, i) => (
            <li key={hilo.id}>
              <Link
                href={`/foro/seccion/${hilo.seccion_id}/publicacion/${hilo.id}`}
                className="group flex items-start gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
              >
                <span className="mt-0.5 text-xs font-bold tabular-nums text-[#a78bfa]">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground/90 group-hover:text-foreground">
                    {hilo.titulo}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {hilo.num_comentarios} · {hilo.num_votos} votos
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
