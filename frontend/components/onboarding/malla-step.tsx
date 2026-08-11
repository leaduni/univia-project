"use client"

import { useState, useEffect } from "react"
import { ArrowRight, ArrowLeft, Layers, Check, Loader2, AlertCircle, Sparkles } from "lucide-react"
import type { MallaItem, OnboardingData } from "@/types/onboarding"
import { apiService } from "@/lib/api-service"

interface MallaStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  onBack: () => void
  carrera_id: number
  careerName?: string
}

export function MallaStep({ data, onNext, onBack, carrera_id, careerName }: MallaStepProps) {
  const [mallas, setMallas] = useState<MallaItem[]>([])
  const [selected, setSelected] = useState<number | undefined>(data.malla_id)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    if (!carrera_id) return

    const fetchMallas = async () => {
      setLoading(true)
      setError(null)
      try {
        const result: MallaItem[] = await apiService.getMallasPorCarrera(carrera_id)
        if (!activo) return

        setMallas(result || [])

        if (result && result.length === 1) {
          // Auto-selección determinista si solo existe 1 malla (legacy seguro)
          const autoMallaId = result[0].id
          setSelected(autoMallaId)
          onNext({ malla_id: autoMallaId })
        } else if (result && result.length > 1) {
          const activas = result.filter((m) => m.es_vigente)
          // Varias mallas pero SOLO UNA activa → preselección automática de esa malla
          if (activas.length === 1) {
            setSelected((prev) => prev || activas[0].id)
          }
          // 2+ mallas activas (o ninguna): NO se preselecciona de forma
          // arbitraria; el estudiante elige su plan explícitamente (el botón
          // Continuar exige tener una selección).
        }
      } catch (err: any) {
        if (!activo) return
        console.error("Error fetching mallas:", err)
        setError(err.message || "No se pudieron cargar los planes de estudio.")
      } finally {
        if (activo) setLoading(false)
      }
    }

    fetchMallas()
    return () => {
      activo = false
    }
  }, [carrera_id])

  const handleContinue = () => {
    if (selected) {
      onNext({ malla_id: selected })
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-5 py-16">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
        <div className="text-center space-y-1">
          <p className="font-heading text-lg font-bold text-foreground">
            Consultando planes de estudio...
          </p>
          <p className="text-sm text-muted-foreground">Buscando las mallas curriculares disponibles</p>
        </div>
      </div>
    )
  }

  if (error || !mallas.length) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-12">
        <div className="p-4 rounded-full bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold text-foreground">
            {error || "No encontramos mallas disponibles para esta carrera"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Puedes regresar al paso anterior y seleccionar otra carrera o reintentar.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-card border border-border hover:bg-muted transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          ¿Cuál es tu Plan de Estudios?
        </h1>
        <p className="text-sm text-muted-foreground">
          Selecciona la malla curricular correspondiente a tu ingreso para {careerName || "tu carrera"}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mallas.map((malla) => {
          const isSelected = selected === malla.id
          return (
            <button
              key={malla.id}
              type="button"
              onClick={() => setSelected(malla.id)}
              aria-pressed={isSelected}
              className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-200 ${
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
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-1 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading text-base font-bold text-foreground leading-snug">
                    {malla.nombre}
                  </h3>
                  {malla.es_vigente && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent border border-accent/30 shrink-0">
                      <Sparkles className="w-3 h-3" />
                      Vigente
                    </span>
                  )}
                </div>
                {malla.codigo_plan && (
                  <p className="text-xs text-muted-foreground">
                    Código de Plan: <span className="font-semibold text-foreground">{malla.codigo_plan}</span>
                  </p>
                )}
              </div>
              {isSelected && (
                <div className="p-1 rounded-full bg-accent text-accent-foreground shrink-0 self-center">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl font-semibold text-sm text-foreground bg-card border border-border hover:bg-muted transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Atrás</span>
        </button>

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
