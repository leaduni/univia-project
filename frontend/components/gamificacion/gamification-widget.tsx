// Widget compacto de gamificación para el Header: racha y XP con enlace al
// ranking. Una sola consulta por montaje (caché de 1 min en el service), se
// oculta si el usuario aún no tiene datos o si la red falla.
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Flame, Zap } from "lucide-react"
import { gamificacionService } from "@/lib/gamificacion-service"
import { formatearXp } from "@/lib/gamificacion-utils"
import type { ResumenGamificacion } from "@/types/gamificacion"

const CLASES_PILDORA =
  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm " +
  "bg-white/[0.06] border border-white/[0.1] text-muted-foreground " +
  "hover:text-foreground hover:bg-white/[0.1] hover:border-[#7957f1]/40 " +
  "transition-all duration-200"

export function GamificationWidget() {
  const [resumen, setResumen] = useState<ResumenGamificacion | null>(null)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    gamificacionService
      .getResumen()
      .then(setResumen)
      .catch(() => setFallo(true))
  }, [])

  // Sin datos de gamificación o sin red: el widget no debe bloquear el header.
  if (fallo) return null

  return (
    <Link
      href="/ranking"
      aria-label={`Racha ${resumen?.racha_actual ?? 0} días y ${formatearXp(resumen?.xp_total)} XP. Ver ranking`}
      title="Ver el ranking"
      onMouseEnter={() => {
        if (!resumen) {
          gamificacionService.getResumen().then(setResumen).catch(() => {})
        }
      }}
      className={CLASES_PILDORA}
    >
      {/* Placeholder esqueleto: evita saltos de layout al cargar (progress-layout). */}
      {!resumen ? (
        <span className="h-4 w-24 animate-pulse rounded bg-white/[0.08]" aria-hidden="true" />
      ) : (
        <>
          <span className="flex items-center gap-1.5 tabular-nums" aria-label={`${resumen.racha_actual} días de racha`}>
            <Flame className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span className="font-semibold text-sm text-foreground">{resumen.racha_actual}</span>
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="flex items-center gap-1.5 tabular-nums" aria-label={`${formatearXp(resumen.xp_total)} XP nivel ${resumen.nivel}`}>
            <Zap className="w-4 h-4 text-[#7957f1]" aria-hidden="true" />
            <span className="font-semibold text-sm text-foreground">{formatearXp(resumen.xp_total)}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">XP</span>
          </span>
        </>
      )}
    </Link>
  )
}