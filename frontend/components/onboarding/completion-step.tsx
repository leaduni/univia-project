"use client"

import { AlertCircle, ArrowRight, CheckCircle2, ChevronLeft, Loader2 } from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"
import { aRomano } from "@/lib/ciclos"

interface CompletionStepProps {
  data: OnboardingData
  onBack: () => void
  onComplete: () => void
  isSubmitting?: boolean
  careerName?: string
  facultadName?: string | null
  /** Ciclos del plan, para decir "III de X" con el dato real. */
  maxCiclos: number
  /** Mensaje si el guardado falló. */
  submitError?: string | null
}

const PROXIMOS_PASOS = [
  "Revisa tus cursos activos en el inicio",
  "Explora tu malla curricular completa",
  "Descubre recursos personalizados en la biblioteca",
]

export function CompletionStep({
  data,
  onBack,
  onComplete,
  isSubmitting = false,
  careerName = "Tu carrera",
  facultadName,
  maxCiclos,
  submitError,
}: CompletionStepProps) {
  const cursos = data.cursosInscritos?.length || 0
  const creditos = data.creditosInscritos || 0

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 mx-auto rounded-full gradient-brand-br p-0.5 shadow-lg shadow-accent/30">
          <div className="w-full h-full bg-background rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-accent" />
          </div>
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          ¡Todo listo!
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Así quedó tu perfil académico. Revísalo antes de guardar.
        </p>
      </div>

      {/* Resumen armado con lo que elegiste en los pasos anteriores. Todavía no
          está guardado, así que no hay avance que consultarle al backend. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
        <div className="p-4 rounded-2xl bg-card border border-border text-center space-y-1">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Carrera
          </span>
          <p className="font-heading text-sm font-bold text-foreground">{careerName}</p>
          {facultadName && (
            <p className="text-xs text-muted-foreground leading-snug">{facultadName}</p>
          )}
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border text-center space-y-1">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Ciclo actual
          </span>
          <p className="font-heading text-sm font-bold text-foreground">
            {aRomano(data.semester)} de {aRomano(maxCiclos)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border text-center space-y-1">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Cursos este ciclo
          </span>
          <p className="font-heading text-sm font-bold text-foreground">{cursos}</p>
          {creditos > 0 && (
            <p className="text-xs text-muted-foreground">{creditos} créditos</p>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-card border border-border space-y-4 mb-8">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Lo que sigue
        </h3>
        <ul className="space-y-3 text-xs text-foreground">
          {PROXIMOS_PASOS.map((paso, i) => (
            <li key={paso} className="flex items-center gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-accent/15 border border-accent/40 text-accent font-bold flex items-center justify-center text-[11px]">
                {i + 1}
              </span>
              <span>{paso}</span>
            </li>
          ))}
        </ul>
      </div>

      {submitError && (
        <div className="max-w-3xl mx-auto flex items-start gap-2.5 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive leading-relaxed">{submitError}</p>
        </div>
      )}

      <div className="flex justify-between items-center pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted hover:border-accent/40 disabled:opacity-40 transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Atrás
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={isSubmitting}
          className="px-8 py-3 rounded-xl font-semibold text-sm text-primary-foreground gradient-login-btn disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-accent/20 active:scale-[0.99] flex items-center gap-2"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
          ) : (
            <>Comenzar mi ruta <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  )
}
