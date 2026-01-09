"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"
import { CURRICULUM_DATA } from "@/data/curriculum"

interface CurrentEnrollmentStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  onBack: () => void
}

export function CurrentEnrollmentStep({ data, onNext, onBack }: CurrentEnrollmentStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(data.currentEnrollment || []))

  const availableCourses = useMemo(() => {
    const completed = new Set(data.completedCourses)
    const available: (typeof CURRICULUM_DATA)[0]["courses"] = []

    CURRICULUM_DATA.forEach((cicloData) => {
      cicloData.courses.forEach((course) => {
        if (!completed.has(course.id)) {
          available.push(course)
        }
      })
    })

    return available
  }, [data.completedCourses])

  const handleToggleCourse = (courseId: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId)
    } else {
      // Limit to 7 enrollments
      if (newSelected.size < 7) {
        newSelected.add(courseId)
      }
    }
    setSelected(newSelected)
  }

  const handleContinue = () => {
    if (selected.size >= 5) {
      onNext({ currentEnrollment: Array.from(selected) })
    }
  }

  const isValidEnrollment = selected.size >= 5 && selected.size <= 7

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Inscripción Actual</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Selecciona los 5-7 cursos que cursarás este semestre. Estos aparecerán en tu Dashboard.
        </p>
      </div>

      {/* Course Grid */}
      <div className="max-w-3xl mx-auto max-h-[500px] overflow-y-auto pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableCourses.map((course) => {
            const isSelected = selected.has(course.id)
            const canSelect = isSelected || selected.size < 7

            return (
              <button
                key={course.id}
                onClick={() => canSelect && handleToggleCourse(course.id)}
                disabled={!canSelect}
                className={`p-4 rounded-xl border-2 transition-all text-left group relative overflow-hidden backdrop-blur-sm ${
                  isSelected
                    ? "border-accent bg-gradient-to-br from-accent/15 to-accent/5 shadow-lg shadow-accent/20"
                    : canSelect
                      ? "border-border bg-card/60 hover:border-accent/50 hover:shadow-md"
                      : "border-border/30 bg-card/40 cursor-not-allowed opacity-60"
                }`}
              >
                {/* Glassmorphism Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                <div className="relative space-y-2 flex items-start gap-3">
                  <div className="flex-shrink-0 pt-1">
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-border group-hover:border-accent/50 transition-colors" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-medium">{course.code}</p>
                    <p
                      className={`font-semibold transition-colors text-sm ${
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

      {/* Enrollment Info */}
      <Card
        className={`max-w-3xl mx-auto p-4 transition-colors ${
          isValidEnrollment ? "bg-accent/10 border-accent/20" : "bg-yellow-500/10 border-yellow-500/20"
        }`}
      >
        <p className="text-sm text-foreground font-medium">
          Cursos seleccionados: <span className="text-accent font-bold">{selected.size}</span> de 5-7
          {!isValidEnrollment && (
            <span className="text-yellow-600 block mt-1">Debes seleccionar entre 5 y 7 cursos para continuar</span>
          )}
        </p>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4 max-w-3xl mx-auto w-full">
        <Button onClick={onBack} variant="outline" size="lg" className="gap-2 bg-transparent">
          <ChevronLeft className="w-4 h-4" /> Atrás
        </Button>
        <Button onClick={handleContinue} disabled={!isValidEnrollment} size="lg" className="gap-2 px-8">
          Continuar <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
