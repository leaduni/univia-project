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
    <section
      aria-label="Top contribuidores de la semana"
      className="rounded-2xl border border-white/10 bg-card/80 backdrop-blur-md p-4"
    >
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
        Top esta semana
      </h3>

      {items === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aún no hay actividad semanal.</p>
      ) : (
        <ol className="space-y-1">
          {items.map((entrada, i) => (
            <li
              key={`${entrada.alias_publico}-${i}`}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                i === 0 && "bg-[#7957f1]/10",
              )}
            >
              <span className="w-5 text-center text-xs">
                {MEDALLAS[i] ?? (
                  <span className="tabular-nums text-muted-foreground">{i + 1}</span>
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground/90">
                {entrada.alias_publico}
              </span>
              {i === 0 && <Crown className="h-3.5 w-3.5 text-amber-300" />}
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {entrada.xp_total} XP
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
