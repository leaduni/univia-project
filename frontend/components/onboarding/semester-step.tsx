"use client"

import { useState } from "react"
import { ChevronLeft, ArrowRight, AlertTriangle } from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"
import { aRomano } from "@/lib/ciclos"

interface SemesterStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  onBack: () => void
  /** Ciclos del plan de la carrera elegida (`duracion_ciclos` del backend). */
  maxCiclos: number
  /** Ciclo que ya consta en el perfil, si el estudiante viene a actualizarlo. */
  cicloRegistrado?: number
}

export function SemesterStep({
  data,
  onNext,
  onBack,
  maxCiclos,
  cicloRegistrado,
}: SemesterStepProps) {
  const [selected, setSelected] = useState(data.semester)

  const ciclos = Array.from({ length: maxCiclos }, (_, i) => i + 1)

  // El ciclo solo avanza. Retroceder dejaba la cuenta en un estado que ninguna
  // pantalla sabe representar: `ciclo_actual` bajaba, pero los cursos aprobados
  // y los créditos viven en `progreso_cursos`, que nadie borra, así que el
  // dashboard seguía mostrando el avance y los cursos del ciclo alto.
  // No quita nada: quien jaló un curso no necesita volver a su ciclo: los
  // arrastres de ciclos anteriores se eligen en el paso siguiente.
  const esRetroceso = (ciclo: number) =>
    cicloRegistrado !== undefined && ciclo < cicloRegistrado

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          ¿En qué ciclo estás?
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Elige el ciclo que estás cursando ahora para ordenar tu avance académico.
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-w-2xl mx-auto mb-6">
        {ciclos.map((ciclo) => {
          const isSelected = selected === ciclo
          const bloqueado = esRetroceso(ciclo)
          return (
            <button
              key={ciclo}
              type="button"
              onClick={() => setSelected(ciclo)}
              disabled={bloqueado}
              aria-pressed={isSelected}
              aria-label={`Ciclo ${ciclo}`}
              title={
                bloqueado
                  ? `Ya cursaste el Ciclo ${aRomano(ciclo)}. El ciclo solo avanza; si te quedaron cursos de ese ciclo, los eliges en el paso siguiente.`
                  : undefined
              }
              className={`py-4 px-3 rounded-2xl border text-center transition-all duration-200 ${
                isSelected
                  ? "bg-card border-accent ring-1 ring-accent shadow-lg shadow-accent/20"
                  : bloqueado
                    ? "bg-card/30 border-border/40 opacity-50 cursor-not-allowed"
                    : "bg-card/60 border-border hover:border-accent/40 hover:bg-card"
              }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Ciclo
              </span>
              <span
                className={`font-heading text-2xl font-bold ${
                  isSelected
                    ? "gradient-brand-text"
                    : bloqueado
                      ? "text-muted-foreground"
                      : "text-foreground"
                }`}
              >
                {aRomano(ciclo)}
              </span>
            </button>
          )
        })}
      </div>

      {cicloRegistrado !== undefined && cicloRegistrado > 1 && (
        <div className="max-w-2xl mx-auto flex items-start gap-2.5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            Estás registrado en el <strong>Ciclo {aRomano(cicloRegistrado)}</strong>, así que los
            ciclos anteriores quedan cerrados: el ciclo solo avanza. Si te quedaron cursos de
            ciclos pasados, no necesitas volver atrás — los eliges en el paso siguiente junto
            con los de este ciclo.
          </p>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-card border border-border text-center">
        <p className="text-xs text-muted-foreground">
          Tu plan de estudios tiene {maxCiclos} ciclos. Con este dato personalizamos
          tu malla y las recomendaciones de aprendizaje.
        </p>
      </div>

      <div className="flex justify-between items-center pt-4 max-w-2xl mx-auto w-full">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted hover:border-accent/40 transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Atrás
        </button>
        <button
          type="button"
          onClick={() => onNext({ semester: selected })}
          className="px-8 py-3 rounded-xl font-semibold text-sm text-primary-foreground gradient-login-btn transition-all shadow-lg shadow-accent/20 active:scale-[0.99] flex items-center gap-2"
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
