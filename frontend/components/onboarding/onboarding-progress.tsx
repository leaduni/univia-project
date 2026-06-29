// Onboarding progress indicator with step labels
"use client"

interface OnboardingProgressProps {
  currentStep: number
  steps: string[]
}

export function OnboardingProgress({ currentStep, steps }: OnboardingProgressProps) {
  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="flex gap-2">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`flex-1 h-2 rounded-full transition-all duration-300 ${
              index <= currentStep ? "bg-accent" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Step Labels */}
      <div className="grid grid-cols-4 gap-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`text-xs font-medium transition-colors ${
              index <= currentStep ? "text-accent" : "text-muted-foreground"
            }`}
          >
            <div className="hidden md:block">{step}</div>
            <div className="md:hidden">Paso {index + 1}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
