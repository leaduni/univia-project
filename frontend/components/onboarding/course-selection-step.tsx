// Onboarding step - select completed courses
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"
import { CURRICULUM_DATA } from "@/data/curriculum"

interface CourseSelectionStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  onBack: () => void
}

export function CourseSelectionStep({ data, onNext, onBack }: CourseSelectionStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(data.completedCourses))

  const handleToggleCourse = (courseId: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId)
    } else {
      newSelected.add(courseId)
    }
    setSelected(newSelected)
  }

  const handleContinue = () => {
    onNext({ completedCourses: Array.from(selected) })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Cursos ya aprobados</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Selecciona los cursos que ya has completado para calcular tu progreso
        </p>
      </div>

      <div className="space-y-6 max-w-3xl mx-auto max-h-[500px] overflow-y-auto pr-4">
        {CURRICULUM_DATA.map((cicloData) => (
          <div key={cicloData.ciclo} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg text-foreground">{cicloData.ciclo}</h3>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                {cicloData.credits} créditos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {cicloData.courses.map((course) => {
                const isSelected = selected.has(course.id)
                return (
                  <button
                    key={course.id}
                    onClick={() => handleToggleCourse(course.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left group ${
                      isSelected
                        ? "border-accent bg-accent/5 shadow-md shadow-accent/20"
                        : "border-border bg-card hover:border-accent/50 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected ? "border-accent bg-accent" : "border-border group-hover:border-accent/50"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-accent-foreground" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium">{course.code}</p>
                        <p
                          className={`font-semibold transition-colors ${
                            isSelected ? "text-accent" : "text-foreground group-hover:text-accent"
                          }`}
                        >
                          {course.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{course.credits} créditos</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Count */}
      <Card className="bg-accent/10 border-accent/20 max-w-3xl mx-auto p-4">
        <p className="text-sm text-foreground font-medium">
          Cursos seleccionados: <span className="text-accent font-bold">{selected.size}</span>
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
