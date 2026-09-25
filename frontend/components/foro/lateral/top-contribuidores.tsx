"use client"

// Top contribuidores semanal (columna derecha, Fase 5): ranking semanal
// compacto (Top 5) desde gamificacionService.getRanking("semanal").

import { useEffect, useState } from "react"
import { Crown, TrendingUp } from "lucide-react"
import { gamificacionService } from "@/lib/gamificacion-service"
import type { EntradaRanking } from "@/types/gamificacion"
import { cn } from "@/lib/utils"

const MEDALLAS = ["🥇", "🥈", "🥉"]

export function TopContribuidores() {
  const [items, setItems] = useState<EntradaRanking[] | null>(null)

  useEffect(() => {
    let activo = true
    gamificacionService
      .getRanking("semanal", 5)
      .then((resp) => {
        if (activo) setItems(resp.items.slice(0, 5))
      })
      .catch(() => {
        if (activo) setItems([])
      })
    return () => {
      activo = false
    }
  }, [])

  return (
    <section aria-label="Top contribuidores de la semana">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
          Top esta semana
        </span>
      </div>

      {items === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-white/30">Aún no hay actividad semanal.</p>
      ) : (
        <ol className="space-y-1">
          {items.map((entrada, i) => (
            <li
              key={`${entrada.alias_publico}-${i}`}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
                i === 0
                  ? "border border-amber-400/[0.10] bg-amber-400/[0.045] hover:bg-amber-400/[0.08]"
                  : "hover:bg-white/[0.04]",
              )}
            >
              {MEDALLAS[i] ? (
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-sm",
                    i === 0 && "bg-amber-400/[0.10] text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.08)]",
                    i === 1 && "bg-slate-300/[0.07]",
                    i === 2 && "bg-orange-400/[0.07]",
                  )}
                >
                  {MEDALLAS[i]}
                </span>
              ) : (
                <span className="w-7 text-center text-[10px] tabular-nums text-white/20">
                  {i + 1}
                </span>
              )}
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-xs",
                  i === 0 ? "font-medium text-white/70" : "font-medium text-white/55",
                )}
              >
                {entrada.alias_publico}
              </span>
              {i === 0 && <Crown className="h-3.5 w-3.5 text-amber-300" />}
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  i === 0 ? "text-amber-300/70" : "text-white/30",
                )}
              >
                {entrada.xp_total} XP
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
