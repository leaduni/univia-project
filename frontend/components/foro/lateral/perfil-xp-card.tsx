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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/80 backdrop-blur-md">
      {/* Franja superior con glow */}
      <div className="h-14 bg-gradient-to-r from-[#7957f1]/40 via-[#a6249d]/30 to-transparent" />
      <div className="-mt-7 px-4 pb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-950 text-xl font-bold text-[#a78bfa] shadow-lg">
          {resumen ? (
            (resumen.alias_publico || "U").slice(0, 1).toUpperCase()
          ) : (
            <span className="h-5 w-5 animate-pulse rounded bg-white/10" />
          )}
        </div>

        {resumen ? (
          <div className="mt-2.5 anim-up">
            <p className="truncate font-poppins font-semibold text-foreground">
              {resumen.alias_publico || "Estudiante"}
            </p>
            <p className="flex items-center gap-1 text-xs text-[#a78bfa]">
              <Star className="h-3 w-3" />
              {rangoAcademico(resumen.nivel)} · Nivel {resumen.nivel}
            </p>

            {/* XP + barra de progreso */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 tabular-nums">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  {resumen.xp_total} XP
                </span>
                <span className="tabular-nums">
                  {resumen.progreso_siguiente.xp_actual_nivel}/
                  {resumen.progreso_siguiente.xp_requerido}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(resumen.progreso_siguiente.porcentaje)}
                aria-label="Progreso al siguiente nivel"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7957f1] to-[#a6249d] transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(0, resumen.progreso_siguiente.porcentaje))}%`,
                  }}
                />
              </div>
            </div>

            <p className="mt-2.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Flame className="h-3 w-3 text-orange-400" />
              Racha actual:{" "}
              <span className="font-medium text-foreground/90 tabular-nums">
                {resumen.racha_actual} {resumen.racha_actual === 1 ? "día" : "días"}
              </span>
            </p>
          </div>
        ) : (
          <div className="mt-2.5 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-32 animate-pulse rounded bg-white/5" />
            <div className="mt-3 h-1.5 animate-pulse rounded-full bg-white/10" />
          </div>
        )}
      </div>
    </div>
  )
}
