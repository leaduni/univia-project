"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CareerStep } from "./onboarding/career-step"
import { MallaStep } from "./onboarding/malla-step"
import { SemesterStep } from "./onboarding/semester-step"
import { CurrentEnrollmentStep } from "./onboarding/current-enrollment-step"
import { CompletionStep } from "./onboarding/completion-step"
import type { Carrera, OnboardingData, OnboardingDataResponse } from "@/types/onboarding"
import { useAuth } from "./providers/auth-context"
import { apiService } from "@/lib/api-service"
import { Loader2 } from "lucide-react"
import { BrandLogo } from "@/app/auth/brand-logo"
import { OnboardingProgress } from "./onboarding/onboarding-progress"

const STEPS = ["Carrera", "Plan", "Ciclo", "Cursos", "Confirmación"]

/** Usado solo si el backend no informa la duración del plan. */
const CICLOS_POR_DEFECTO = 10

export function OnboardingWizard() {
  const router = useRouter()
  const { refreshProfile, signOut, user } = useAuth()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboardingMeta, setOnboardingMeta] = useState<{ careers: Carrera[] }>({ careers: [] })

  const [data, setData] = useState<OnboardingData>({
    career: 0,
    semester: 1,
    // Los usuarios de Google SSO no traen código; si el registro manual ya lo
    // dejó, se pre-rellena aquí para no pedirlo de nuevo en el Paso 1.
    codigo_estudiante: user?.codigo_estudiante ?? "",
    cursosInscritos: [],
    cursosAprobados: [],
  })

  const selectedCareer = onboardingMeta.careers.find((c) => c.id === data.career)
  const selectedCareerName = selectedCareer?.name || "Tu carrera"

  // El tope de ciclos es el del plan de la carrera elegida. Antes la grilla
  // estaba fija en 8, así que quien iba en 9no o 10mo no podía declararlo.
  const maxCiclos = selectedCareer?.duracion_ciclos || CICLOS_POR_DEFECTO

  useEffect(() => {
    const fetchOnboardingMeta = async () => {
      try {
        setLoading(true)
        const result: OnboardingDataResponse = await apiService.getOnboardingData()
        setOnboardingMeta({ careers: result?.carreras ?? [] })
      } catch (error) {
        console.error("Error fetching onboarding meta:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchOnboardingMeta()
  }, [])

  const handleNext = (stepData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...stepData }))
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0))
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const payload = {
        carrera_id: data.career,
        malla_id: data.malla_id,
        ciclo_actual: data.semester,
        codigo_estudiante: data.codigo_estudiante || undefined,
        cursos_inscritos: data.cursosInscritos,
        cursos_aprobados: data.cursosAprobados ?? [],
      }
      await apiService.completeOnboarding(payload)
      await refreshProfile()
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error completing onboarding:", error)
      // Se muestra dentro del paso final: un alert() del navegador tapa la
      // pantalla y no deja leer qué dato hay que corregir.
      setSubmitError(
        error.message || "No pudimos guardar tu perfil. Inténtalo de nuevo en un momento."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * El dashboard rebota a quien no terminó el onboarding (ver
   * `dashboard-layout`), así que "omitir" no puede llevar a la app: sería un
   * ida y vuelta infinito. Lo único honesto es cerrar la sesión y dejar el
   * onboarding para el próximo ingreso.
   */
  const handleOmitir = async () => {
    // El dashboard rebota a quien no terminó el onboarding (ver `dashboard-layout`),
    // así que "omitir" no puede llevar a la app. Se cierra la sesión (signOut ya
    // reenvía a la portada pública /) y el onboarding queda para el próximo ingreso.
    await signOut()
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Halos de marca, muy tenues, para que el fondo no quede plano */}
      <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera + avance */}
      <div className="relative z-10 max-w-4xl mx-auto w-full pt-8 pb-6 px-4">
        <div className="flex items-center justify-between gap-4 mb-8">
          <BrandLogo className="py-0" />
          <button
            type="button"
            onClick={handleOmitir}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Omitir por ahora
          </button>
        </div>

        <OnboardingProgress currentStep={step} steps={STEPS} />
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-4xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-5 py-16">
              <Loader2 className="w-10 h-10 animate-spin text-accent" />
              <div className="text-center space-y-1">
                <p className="font-heading text-lg font-bold text-foreground">
                  Cargando tu malla académica...
                </p>
                <p className="text-sm text-muted-foreground">Esto solo toma unos segundos</p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              {step === 0 && <CareerStep data={data} onNext={handleNext} careers={onboardingMeta.careers} />}
              {step === 1 && (
                <MallaStep
                  data={data}
                  onNext={handleNext}
                  onBack={handleBack}
                  carrera_id={data.career}
                  careerName={selectedCareerName}
                />
              )}
              {step === 2 && (
                <SemesterStep
                  data={data}
                  onNext={handleNext}
                  onBack={handleBack}
                  maxCiclos={maxCiclos}
                />
              )}
              {step === 3 && (
                <CurrentEnrollmentStep
                  data={data}
                  onNext={handleNext}
                  onBack={handleBack}
                  carrera_id={data.career}
                  malla_id={data.malla_id}
                />
              )}
              {step === 4 && (
                <CompletionStep
                  data={data}
                  onBack={handleBack}
                  onComplete={handleComplete}
                  isSubmitting={isSubmitting}
                  careerName={selectedCareerName}
                  facultadName={selectedCareer?.facultad?.nombre}
                  maxCiclos={maxCiclos}
                  submitError={submitError}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pie discreto. Antes había tres tarjetas glassmorphism con promesas de
          producto ("Experiencia Premium") que competían con los botones del
          paso: en el onboarding lo único que importa es avanzar. */}
      <div className="relative z-10 border-t border-border mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
          <p className="text-xs text-muted-foreground">
            Puedes cambiar estos datos después desde tu perfil.
          </p>
          <span className="text-xs text-muted-foreground/50" aria-hidden="true">·</span>
          <p className="text-xs text-muted-foreground/70">
            Un proyecto de ayuda social de LEAD UNI.
          </p>
        </div>
      </div>
    </div>
  )
}