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
import { Sparkles, BookOpen, Zap, CheckCircle2 } from "lucide-react"

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
        const result = await apiService.getOnboardingData()

        if (result) {
          const metaData = {
            careers: result.carreras || result.careers || [],
            malla: result.malla || []
          }
          setOnboardingMeta(metaData)

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
      const payload = {
        carrera_id: parseInt(data.career),
        ciclo_actual: data.semester,
        cursos_completados: data.completedCourses.map(id => parseInt(id)),
        matricula_actual: (data.currentEnrollment || []).map(id => parseInt(id))
      }

      await apiService.completeOnboarding(payload)
      await refreshProfile()
      router.push("/")
    } catch (error: any) {
      console.error("Error completing onboarding:", error)
      alert("Hubo un error al guardar tu progreso: " + (error.message || "Error desconocido"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdfdff] via-slate-50 to-indigo-50/30 flex flex-col relative overflow-hidden">
      
      {/* Elementos de Fondo Decorativos (Premium) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#7957f1] rounded-full blur-[160px] opacity-10 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#a6249d] rounded-full blur-[160px] opacity-10 animate-pulse [animation-delay:2s]" />
      </div>

      {/* Header Premium */}
      <div className="relative z-10 bg-white/40 backdrop-blur-xl border-b border-white/20 sticky top-0">
        <div className="max-w-5xl mx-auto px-6 py-8 md:py-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#d93340] to-[#a6249d] text-white shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-heading font-black text-slate-900">
                Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d93340] via-[#a6249d] to-[#7957f1]">UniVia</span>
              </h1>
              <p className="text-slate-500 font-bold mt-1">Configura tu perfil académico en 4 pasos sencillos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de Progreso Premium */}
      <div className="relative z-10 bg-white/20 backdrop-blur-md border-b border-white/20">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between gap-4">
            {STEPS.map((stepName, idx) => (
              <div key={idx} className="flex-1 flex items-center gap-3">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-2xl font-black text-lg flex items-center justify-center transition-all duration-300 ${
                    idx < step
                      ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg"
                      : idx === step
                      ? "bg-gradient-to-br from-[#7957f1] to-[#a6249d] text-white shadow-lg scale-110"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {idx < step ? <CheckCircle2 className="w-6 h-6" /> : idx + 1}
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-sm transition-colors ${
                    idx <= step ? "text-slate-900" : "text-slate-400"
                  }`}>
                    {stepName}
                  </p>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    idx < step ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-slate-200"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-4xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-6 py-16">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 bg-gradient-to-r from-[#7957f1] to-[#a6249d] rounded-full animate-spin" />
                <div className="absolute inset-2 bg-white rounded-full" />
              </div>
              <div className="text-center">
                <p className="text-slate-600 font-bold text-lg animate-pulse">Cargando tu malla académica...</p>
                <p className="text-slate-400 text-sm mt-2">Esto solo toma unos segundos</p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              {step === 0 && <CareerStep data={data} onNext={handleNext} careers={onboardingMeta.careers} />}
              {step === 1 && <SemesterStep data={data} onNext={handleNext} onBack={handleBack} />}
              {step === 2 && <CurrentEnrollmentStep data={data} onNext={handleNext} onBack={handleBack} curriculum={onboardingMeta.malla} />}
              {step === 3 && <CompletionStep data={data} onBack={handleBack} onComplete={handleComplete} isSubmitting={isSubmitting} />}
            </div>
          )}
        </div>
      </div>

      {/* Footer Académico */}
      <div className="relative z-10 bg-white/20 backdrop-blur-md border-t border-white/20 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: BookOpen, title: "Expediente Completo", desc: "Acceso a tu malla curricular" },
              { icon: Zap, title: "Configuración Rápida", desc: "Solo 4 pasos para comenzar" },
              { icon: Sparkles, title: "Experiencia Premium", desc: "Diseñado por LEAD UNI" },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/30 border border-white/20">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#a6249d] to-[#7957f1] text-white">
                  <feature.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">{feature.title}</p>
                  <p className="text-xs text-slate-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}