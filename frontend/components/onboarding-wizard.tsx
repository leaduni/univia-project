"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CareerStep } from "./onboarding/career-step"
import { SemesterStep } from "./onboarding/semester-step"
import { CurrentEnrollmentStep } from "./onboarding/current-enrollment-step"
import { CompletionStep } from "./onboarding/completion-step"
import type { OnboardingData } from "@/types/onboarding"
import { useAuth } from "./providers/auth-context"
import { apiService } from "@/lib/api-service"
import { BookOpen, Zap, Sparkles } from "lucide-react"

const STEPS = ["Carrera", "Semestre", "Cursos", "Confirmación"]

export function OnboardingWizard() {
  const router = useRouter()
  const { refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [onboardingMeta, setOnboardingMeta] = useState<{ careers: any[] }>({ careers: [] })

  const [data, setData] = useState<OnboardingData>({
    career: 0,
    semester: 1,
    cursosInscritos: [],
  })

  const selectedCareerName = onboardingMeta.careers.find((c: any) => c.id === data.career)?.name || "Tu carrera"

  useEffect(() => {
    const fetchOnboardingMeta = async () => {
      try {
        setLoading(true)
        const result = await apiService.getOnboardingData()
        if (result) {
          setOnboardingMeta({ careers: result.carreras || result.careers || [] })
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
        carrera_id: data.career,
        ciclo_actual: data.semester,
        cursos_inscritos: data.cursosInscritos,
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
    <div className="min-h-screen bg-[#0b0a16] flex flex-col relative overflow-hidden">
      {/* Dark mesh atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at 20% 20%, rgba(236,72,153,0.06) 0%, rgba(139,92,246,0.04) 45%, rgba(11,10,22,1) 70%)" }}
      />

      {/* Header + Stepper Combined */}
      <div className="relative z-10 max-w-4xl mx-auto w-full pt-8 pb-6 px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <img src="/Logo_LEAD_UNI.png" alt="LEAD UNI" className="w-7 h-7 object-contain" />
            <span className="text-xl font-extrabold bg-gradient-to-r from-[#f43f5e] via-[#ec4899] to-[#a855f7] bg-clip-text text-transparent">
              UniVia
            </span>
          </div>
          <button className="text-xs text-slate-400 hover:text-white transition-colors font-medium">
            Omitir por ahora
          </button>
        </div>

        {/* Combined Stepper */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            {STEPS.map((stepName, idx) => (
              <span
                key={idx}
                className={idx === step ? "text-[#ec4899] font-bold" : ""}
              >
                {idx === 0 ? `1. ${stepName}` : `${idx + 1}. ${stepName}`}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx <= step
                    ? "bg-gradient-to-r from-[#ec4899] to-[#a855f7] shadow-sm shadow-pink-500/30"
                    : "bg-[#1e1b3a]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-4xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-6 py-16">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 bg-gradient-to-r from-[#ec4899] to-[#a855f7] rounded-full animate-spin" />
                <div className="absolute inset-2 bg-[#0b0a16] rounded-full" />
              </div>
              <div className="text-center">
                <p className="text-slate-300 font-bold text-lg animate-pulse">Cargando tu malla académica...</p>
                <p className="text-slate-500 text-sm mt-2">Esto solo toma unos segundos</p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              {step === 0 && <CareerStep data={data} onNext={handleNext} careers={onboardingMeta.careers} />}
              {step === 1 && <SemesterStep data={data} onNext={handleNext} onBack={handleBack} />}
              {step === 2 && (
                <CurrentEnrollmentStep
                  data={data}
                  onNext={handleNext}
                  onBack={handleBack}
                  carrera_id={data.career}
                />
              )}
              {step === 3 && <CompletionStep data={data} onBack={handleBack} onComplete={handleComplete} isSubmitting={isSubmitting} careerName={selectedCareerName} />}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-[#1e1b3a] mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#121124]/60 border border-[#232045] backdrop-blur-md">
              <div className="p-2 rounded-lg bg-[#211d45] text-purple-300">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Expediente Completo</p>
                <p className="text-[11px] text-slate-400">Acceso a tu malla curricular</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#121124]/60 border border-[#232045] backdrop-blur-md">
              <div className="p-2 rounded-lg bg-[#331c2b] text-pink-300">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Configuraci&oacute;n R&aacute;pida</p>
                <p className="text-[11px] text-slate-400">Solo 4 pasos para comenzar</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#121124]/60 border border-[#232045] backdrop-blur-md">
              <div className="p-2 rounded-lg bg-[#1a233d] text-sky-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Experiencia Premium</p>
                <p className="text-[11px] text-slate-400">Dise&ntilde;ado por LEAD UNI</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}