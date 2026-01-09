"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronRight, ChevronLeft } from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"

interface SemesterStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  onBack: () => void
}

export function SemesterStep({ data, onNext, onBack }: SemesterStepProps) {
  const [selected, setSelected] = useState(data.semester)

  const handleSelect = (semester: number) => {
    setSelected(semester)
  }

  const handleContinue = () => {
    onNext({ semester: selected })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">¿En qué semestre estás?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Selecciona el semestre actual para ver tu progreso académico
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
        {Array.from({ length: 8 }, (_, i) => i + 1).map((semester) => (
          <button
            key={semester}
            onClick={() => handleSelect(semester)}
            className={`p-4 rounded-lg border-2 font-semibold transition-all duration-200 ${
              selected === semester
                ? "border-accent bg-accent text-accent-foreground shadow-lg shadow-accent/20"
                : "border-border bg-card text-foreground hover:border-accent/50 hover:shadow-md"
            }`}
          >
            <div className="text-sm">Semestre</div>
            <div className="text-2xl font-bold">{semester}</div>
          </button>
        ))}
      </div>

      {/* Description */}
      <Card className="bg-secondary/30 border-border max-w-2xl mx-auto p-4">
        <p className="text-sm text-muted-foreground">
          Esto nos ayudará a personalizar tu malla curricular y recomendaciones de aprendizaje
        </p>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Button onClick={onBack} variant="outline" size="lg" className="gap-2 bg-transparent">
          <ChevronLeft className="w-4 h-4" /> Atrás
        </Button>
        <Button onClick={handleContinue} size="lg" className="gap-2 px-8">
          Continuar <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
