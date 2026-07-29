"use client"

import { useState } from "react"
import { ArrowRight, Network, Code, Factory, Cpu, Building2, GraduationCap, AlertCircle } from "lucide-react"
import type { Carrera, OnboardingData } from "@/types/onboarding"

const getCareerIcon = (name: string = "") => {
  const n = name.toLowerCase()
  if (n.includes("sistema") || n.includes("red")) return Network
  if (n.includes("software") || n.includes("computac")) return Code
  if (n.includes("industr")) return Factory
  if (n.includes("mecatr") || n.includes("electr")) return Cpu
  if (n.includes("civil") || n.includes("estruct")) return Building2
  return GraduationCap
}

interface CareerStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  careers: Carrera[]
}

export function CareerStep({ data, onNext, careers }: CareerStepProps) {
  const [selected, setSelected] = useState<number>(data.career)

  const handleContinue = () => {
    if (selected > 0) {
      onNext({ career: selected })
    }
  }

  // Sin carreras no hay nada que elegir: si el backend falló, el estudiante
  // solo veía una pantalla en blanco sin saber por qué.
  if (!careers?.length) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-16">
        <div className="p-4 rounded-full bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold text-foreground">
            No pudimos cargar las carreras
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Revisa tu conexión y vuelve a intentarlo en unos segundos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-card border border-border hover:bg-muted transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          ¿Qué carrera estudias?
        </h1>
        <p className="text-sm text-muted-foreground">
          Con esto armamos tu malla curricular personalizada.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {careers.map((career) => {
          const Icon = getCareerIcon(career.name)
          const isSelected = selected === career.id
          return (
            <button
              key={career.id}
              type="button"
              onClick={() => setSelected(career.id)}
              aria-pressed={isSelected}
              className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all duration-200 ${
                isSelected
                  ? "bg-card border-accent ring-1 ring-accent shadow-lg shadow-accent/10"
                  : "bg-card/60 border-border hover:border-accent/40 hover:bg-card"
              }`}
            >
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  isSelected
                    ? "gradient-brand-br text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <h3 className="font-heading text-sm font-bold text-foreground leading-snug">
                  {career.name}
                </h3>
                {/* La facultad desambigua carreras de nombre parecido entre
                    distintas facultades de la UNI. */}
                {career.facultad?.nombre && (
                  <p className="text-xs text-muted-foreground leading-snug">
                    {career.facultad.nombre}
                  </p>
                )}
                <span className="inline-block text-[11px] font-semibold tracking-wider text-accent uppercase pt-0.5">
                  {career.codigo}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected}
          className="px-8 py-3 rounded-xl font-semibold text-sm text-primary-foreground gradient-login-btn disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-accent/20 active:scale-[0.99] flex items-center gap-2"
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
