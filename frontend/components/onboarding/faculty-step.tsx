"use client"

import { useState } from "react"
import { ArrowRight, AlertCircle, Building2, Cog, Factory, GraduationCap } from "lucide-react"
import type { Carrera, Facultad, OnboardingData } from "@/types/onboarding"

/** Ícono por facultad. El código es estable; el nombre puede cambiar de redacción. */
const getFacultadIcon = (codigo: string = "", nombre: string = "") => {
  const c = codigo.toUpperCase()
  if (c === "FIM") return Cog
  if (c === "FIIS") return Factory
  const n = nombre.toLowerCase()
  if (n.includes("mecánic") || n.includes("mecanic")) return Cog
  if (n.includes("industrial") || n.includes("sistemas")) return Factory
  if (n.includes("civil") || n.includes("arquitect")) return Building2
  return GraduationCap
}

interface FacultyStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  facultades: Facultad[]
  /** Se usa solo para contar carreras por facultad, no para elegirlas aquí. */
  careers: Carrera[]
}

export function FacultyStep({ data, onNext, facultades, careers }: FacultyStepProps) {
  const [selected, setSelected] = useState<number>(data.facultad ?? 0)

  const handleContinue = () => {
    if (selected > 0) {
      onNext({ facultad: selected })
    }
  }

  // Una facultad sin carreras cargadas no lleva a ningún lado: el paso
  // siguiente quedaría vacío y el estudiante no sabría por qué. Se listan
  // igual, pero deshabilitadas y diciéndolo.
  const carrerasPorFacultad = new Map<number, number>()
  for (const c of careers) {
    if (!c.facultad?.id) continue
    carrerasPorFacultad.set(c.facultad.id, (carrerasPorFacultad.get(c.facultad.id) ?? 0) + 1)
  }

  if (!facultades?.length) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-16">
        <div className="p-4 rounded-full bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold text-foreground">
            No pudimos cargar las facultades
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
          ¿A qué facultad perteneces?
        </h1>
        <p className="text-sm text-muted-foreground">
          Con esto filtramos las carreras y el material que verás en la biblioteca.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {facultades.map((facultad) => {
          const Icon = getFacultadIcon(facultad.codigo, facultad.nombre)
          const isSelected = selected === facultad.id
          const totalCarreras = carrerasPorFacultad.get(facultad.id) ?? 0
          const sinCarreras = totalCarreras === 0

          return (
            <button
              key={facultad.id}
              type="button"
              onClick={() => setSelected(facultad.id)}
              aria-pressed={isSelected}
              disabled={sinCarreras}
              className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all duration-200 ${
                isSelected
                  ? "bg-card border-accent ring-1 ring-accent shadow-lg shadow-accent/10"
                  : "bg-card/60 border-border hover:border-accent/40 hover:bg-card"
              } ${sinCarreras ? "opacity-50 cursor-not-allowed hover:border-border" : ""}`}
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
                  {facultad.nombre}
                </h3>
                <p className="text-xs text-muted-foreground leading-snug">
                  {sinCarreras
                    ? "Todavía sin carreras disponibles"
                    : `${totalCarreras} ${totalCarreras === 1 ? "carrera" : "carreras"}`}
                </p>
                <span className="inline-block text-[11px] font-semibold tracking-wider text-accent uppercase pt-0.5">
                  {facultad.codigo}
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
