"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CareerStep } from "./onboarding/career-step"
import { SemesterStep } from "./onboarding/semester-step"
import { AcademicStatusStep } from "./onboarding/academic-status-step"
import { CurrentEnrollmentStep } from "./onboarding/current-enrollment-step"
import { CompletionStep } from "./onboarding/completion-step"
import { OnboardingProgress } from "./onboarding/onboarding-progress"
import type { OnboardingData } from "@/types/onboarding"
import { useAuth } from "./providers/auth-context"
import { apiService } from "@/lib/api-service"

const STEPS = ["Carrera", "Semestre Actual", "Inscripciones", "Confirmación"]


export function OnboardingWizard() {
  const router = useRouter()
  const { refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [onboardingMeta, setOnboardingMeta] = useState<{ careers: any[], malla: any[] }>({ careers: [], malla: [] })

  const [data, setData] = useState<OnboardingData>({
    career: "",
    semester: 1,
    completedCourses: [],
    currentEnrollment: [],
  })

  // Cargar datos iniciales de la base de datos
  useEffect(() => {
    const fetchOnboardingMeta = async () => {
      try {
        setLoading(true)
        console.log("Fetching onboarding data from API...");
        const result = await apiService.getOnboardingData()
        console.log("Onboarding Meta Result:", result)

        if (result) {
          // Backend returns 'carreras', frontend expects 'careers'
          const metaData = {
            careers: result.carreras || result.careers || [],
            malla: result.malla || []
          }
          setOnboardingMeta(metaData)

          // Si hay carreras, preseleccionar la primera (Sistemas) si existe
          if (metaData.careers && Array.isArray(metaData.careers)) {
            const sistemas = metaData.careers.find((c: any) => c.codigo === 'IS' || c.codigo === 'CS')
            if (sistemas) {
              setData(prev => ({ ...prev, career: sistemas.id.toString() }))
            }
          }
        }
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
    try {
      // 1. Mapear datos para el backend
      // Los IDs ahora ya vienen como números de la DB
      const payload = {
        carrera_id: parseInt(data.career),
        ciclo_actual: data.semester,
        cursos_completados: data.completedCourses.map(id => parseInt(id)),
        matricula_actual: (data.currentEnrollment || []).map(id => parseInt(id))
      }

      console.log("Submitting onboarding data:", payload);

      // 2. Llamar a la API
      await apiService.completeOnboarding(payload);

      // 3. Refrescar el perfil en el contexto global
      await refreshProfile();

      // 4. Redirigir al dashboard
      router.push("/");
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      alert("Hubo un error al guardar tu progreso: " + (error.message || "Error desconocido"));
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-[#d7cef7]/10 flex flex-col">
      {/* Header with Logo */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground text-balance font-poppins">
            Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d93340] via-[#a6249d] to-[#7957f1]">UniVia</span>
          </h1>
          <p className="text-muted-foreground mt-2">Configura tu perfil académico para comenzar</p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-card/30 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <OnboardingProgress currentStep={step} steps={STEPS} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-4xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground animate-pulse">Cargando malla académica...</p>
            </div>
          ) : (
            <>
              {step === 0 && <CareerStep data={data} onNext={handleNext} careers={onboardingMeta.careers} />}
              {step === 1 && <SemesterStep data={data} onNext={handleNext} onBack={handleBack} />}
              {step === 2 && <CurrentEnrollmentStep data={data} onNext={handleNext} onBack={handleBack} curriculum={onboardingMeta.malla} />}
              {step === 3 && <CompletionStep data={data} onBack={handleBack} onComplete={handleComplete} isSubmitting={isSubmitting} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
