"use client"

// Tarjeta de perfil gamificado (columna derecha, Fase 5): alias, rango
// académico por nivel, XP total y progreso animado al siguiente nivel.
// Datos: gamificacionService.getResumen() (Fase 10).

import { useEffect, useState } from "react"
import { Flame, Sparkles, Star } from "lucide-react"
import { gamificacionService } from "@/lib/gamificacion-service"
import type { ResumenGamificacion } from "@/types/gamificacion"

/** Rango académico según el nivel del usuario. */
function rangoAcademico(nivel: number): string {
  if (nivel >= 10) return "Sabio UNI"
  if (nivel >= 7) return "Mago de Sistemas"
  if (nivel >= 4) return "Ingeniero de Datos"
  if (nivel >= 2) return "Estudiante Dedicado"
  return "Aprendiz"
}

export function PerfilXpCard() {
  const [resumen, setResumen] = useState<ResumenGamificacion | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let activo = true
    gamificacionService
      .getResumen()
      .then((r) => {
        if (activo) setResumen(r)
      })
      .catch(() => {
        if (activo) setError(true)
      })
    return () => {
      activo = false
    }
  }, [])

  if (error) return null

  return (
    <div className="group relative overflow-hidden rounded-[20px]">
      {/* gradient header */}
      <div className="relative h-20 overflow-hidden bg-gradient-to-br from-violet-600/30 via-fuchsia-600/20 to-transparent">
        <div className="absolute -right-10 -top-20 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-[60px]" />
        <div className="absolute left-8 top-4 h-20 w-20 rounded-full bg-violet-400/15 blur-[40px]" />
      </div>

      <div className="relative px-4 pb-4">
        <div className="-mt-7 mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-[#0c0c16] bg-violet-500/[0.14] text-xl font-semibold text-violet-300 shadow-xl">
          {resumen ? (
            (resumen.alias_publico || "U").slice(0, 1).toUpperCase()
          ) : (
            <span className="h-5 w-5 animate-pulse rounded bg-white/10" />
          )}
        </div>

        {resumen ? (
          <div className="anim-up">
            <p className="truncate text-sm font-semibold text-white/90">
              {resumen.alias_publico || "Estudiante"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-violet-300/70">
              <Star className="h-3 w-3" />
              {rangoAcademico(resumen.nivel)} · Nivel {resumen.nivel}
            </p>

            {/* XP + barra de progreso */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] tabular-nums text-amber-300/70">
                  <Sparkles className="h-3 w-3" />
                  {resumen.xp_total} XP
                </span>
                <span className="text-[10px] tabular-nums text-white/25">
                  {resumen.progreso_siguiente.xp_actual_nivel}/
                  {resumen.progreso_siguiente.xp_requerido}
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(resumen.progreso_siguiente.porcentaje)}
                aria-label="Progreso al siguiente nivel"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(0, resumen.progreso_siguiente.porcentaje))}%`,
                  }}
                />
              </div>
            </div>

            <p className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-[10px] text-white/40">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              Racha actual:{" "}
              <span className="font-medium tabular-nums text-white/75">
                {resumen.racha_actual} {resumen.racha_actual === 1 ? "día" : "días"}
              </span>
            </p>
          </div>
        ) : (
          <div className="mt-2.5 space-y-2 pb-1">
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-32 animate-pulse rounded bg-white/5" />
            <div className="mt-3 h-1.5 animate-pulse rounded-full bg-white/10" />
          </div>
        )}
      </div>
    </div>
  )
}
