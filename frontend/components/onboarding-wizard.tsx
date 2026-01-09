"use client"

import { useState } from "react"
import { CareerStep } from "./onboarding/career-step"
import { SemesterStep } from "./onboarding/semester-step"
import { AcademicStatusStep } from "./onboarding/academic-status-step"
import { CurrentEnrollmentStep } from "./onboarding/current-enrollment-step"
import { CompletionStep } from "./onboarding/completion-step"
import { OnboardingProgress } from "./onboarding/onboarding-progress"
import type { OnboardingData } from "@/types/onboarding"

const STEPS = ["Carrera", "Semestre Actual", "Historial Académico", "Inscripciones", "Confirmación"]

export function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    career: "",
    semester: 1,
    completedCourses: [],
    currentEnrollment: [],
  })

  const handleNext = (stepData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...stepData }))
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0))
  }

  const handleComplete = () => {
    console.log("[v0] Onboarding completed with data:", data)
    window.location.href = "/"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10 flex flex-col">
      {/* Header with Logo */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
            Bienvenido a <span className="text-accent">UniVia</span>
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
          {step === 0 && <CareerStep data={data} onNext={handleNext} />}
          {step === 1 && <SemesterStep data={data} onNext={handleNext} onBack={handleBack} />}
          {step === 2 && <AcademicStatusStep data={data} onNext={handleNext} onBack={handleBack} />}
          {step === 3 && <CurrentEnrollmentStep data={data} onNext={handleNext} onBack={handleBack} />}
          {step === 4 && <CompletionStep data={data} onBack={handleBack} onComplete={handleComplete} />}
        </div>
      </div>
    </div>
  )
}
