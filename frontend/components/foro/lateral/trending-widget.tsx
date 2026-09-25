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
    <section aria-label="Tendencias">
      <div className="mb-4 flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            Tendencias
          </span>
        </div>
        <span className="text-[10px] text-white/25">
          {ventana === "24h" ? "24 h" : "7 d"}
        </span>
      </div>

      {hilos === null ? (
        <div className="space-y-2 px-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      ) : hilos.length === 0 ? (
        <p className="px-2 text-xs text-white/30">Sin actividad reciente.</p>
      ) : (
        <ol className="space-y-3">
          {hilos.map((hilo, i) => (
            <li key={hilo.id}>
              <Link
                href={`/foro/seccion/${hilo.seccion_id}/publicacion/${hilo.id}`}
                className="group flex w-full items-start gap-3 text-left"
              >
                <span
                  className={`pt-0.5 text-xs font-semibold tabular-nums ${
                    i === 0 ? "text-violet-400" : "text-white/30"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white/65 group-hover:text-white/90">
                    {hilo.titulo}
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-[10px] text-white/25">
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
