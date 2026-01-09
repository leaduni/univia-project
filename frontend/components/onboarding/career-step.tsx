"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"

const CAREERS = [
  { id: "cs", name: "Ingeniería en Computación", icon: "💻", description: "Desarrollo de software y sistemas" },
  { id: "ie", name: "Ingeniería Electrónica", icon: "⚡", description: "Electrónica y telecomunicaciones" },
  { id: "im", name: "Ingeniería Mecánica", icon: "🔧", description: "Mecánica y automatización" },
  { id: "is", name: "Ingeniería de Sistemas", icon: "🖥️", description: "Sistemas e infraestructura" },
]

interface CareerStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
}

export function CareerStep({ data, onNext }: CareerStepProps) {
  const [selected, setSelected] = useState(data.career)

  const handleSelect = (careerId: string) => {
    setSelected(careerId)
  }

  const handleContinue = () => {
    if (selected) {
      onNext({ career: selected })
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">¿Cuál es tu carrera?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Selecciona tu programa académico para personalizar tu malla curricular
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {CAREERS.map((career) => (
          <button
            key={career.id}
            onClick={() => handleSelect(career.id)}
            className={`relative p-6 rounded-xl border-2 transition-all duration-200 group overflow-hidden ${
              selected === career.id
                ? "border-accent bg-accent/5 shadow-lg shadow-accent/20"
                : "border-border bg-card hover:border-accent/50 hover:shadow-md"
            }`}
          >
            {/* Animated background for selected state */}
            {selected === career.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            )}

            <div className="relative space-y-3">
              <div className="text-4xl">{career.icon}</div>
              <div className="text-left">
                <p className="font-semibold text-foreground group-hover:text-accent transition-colors">{career.name}</p>
                {selected === career.id && <p className="text-sm text-muted-foreground">{career.description}</p>}
              </div>
              {selected === career.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-accent-foreground rounded-full" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Continue Button */}
      <div className="flex justify-center pt-4">
        <Button onClick={handleContinue} disabled={!selected} size="lg" className="gap-2 px-8">
          Continuar <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
