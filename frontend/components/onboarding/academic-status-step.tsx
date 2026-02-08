"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronRight, ChevronLeft, CheckCircle2, Lock } from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"

interface AcademicStatusStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  onBack: () => void
  curriculum: any[]
}

const PREREQUISITES: Record<string, string[]> = {}

export function AcademicStatusStep({ data, onNext, onBack, curriculum }: AcademicStatusStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(data.completedCourses))

  const unlockedCourses = useMemo(() => {
    const unlocked = new Set<string>()

    curriculum.forEach((cicloData) => {
      cicloData.courses.forEach((course: any) => {
        const courseIdStr = course.id.toString()
        const prereqs = PREREQUISITES[courseIdStr] || []
        const allPrereqsMet = prereqs.length === 0 || prereqs.every((prereq) => selected.has(prereq))
        if (allPrereqsMet) {
          unlocked.add(courseIdStr)
        }
      })
    })

    return unlocked
  }, [selected, curriculum])

  const handleToggleCourse = (courseId: string) => {
    if (!unlockedCourses.has(courseId) && !selected.has(courseId)) {
      return // Cannot select locked courses
    }

    const courseIdStr = courseId.toString()
    const newSelected = new Set(selected)
    if (newSelected.has(courseIdStr)) {
      newSelected.delete(courseIdStr)
    } else {
      newSelected.add(courseIdStr)
    }
    setSelected(newSelected)
  }

  const handleContinue = () => {
    onNext({ completedCourses: Array.from(selected) })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Historial Académico</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Marca los cursos que ya has aprobado. Los cursos se desbloquean automáticamente al cumplir requisitos previos.
        </p>
      </div>

      {/* Courses Grid */}
      <div className="space-y-6 max-w-3xl mx-auto max-h-[500px] overflow-y-auto pr-4">
        {curriculum.map((cicloData) => (
          <div key={cicloData.ciclo} className="space-y-3">
            <div className="flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
              <h3 className="font-semibold text-lg text-foreground">{cicloData.ciclo}</h3>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                {cicloData.credits} créditos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cicloData.courses.map((course: any) => {
                const courseIdStr = course.id.toString()
                const isSelected = selected.has(courseIdStr)
                const isUnlocked = unlockedCourses.has(courseIdStr) || isSelected
                const isLocked = !isUnlocked

                return (
                  <button
                    key={course.id}
                    onClick={() => handleToggleCourse(course.id)}
                    disabled={isLocked}
                    className={`p-4 rounded-xl border-2 transition-all text-left group relative overflow-hidden backdrop-blur-sm ${isSelected
                      ? "border-accent bg-gradient-to-br from-accent/15 to-accent/5 shadow-lg shadow-accent/20"
                      : isLocked
                        ? "border-border/30 bg-card/40 cursor-not-allowed opacity-60"
                        : "border-border bg-card/60 hover:border-accent/50 hover:shadow-md hover:from-accent/10 hover:to-transparent"
                      }`}
                  >
                    {/* Glassmorphism Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                    <div className="relative space-y-2 flex items-start gap-3">
                      {/* Status Icon */}
                      <div className="flex-shrink-0 pt-1">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-accent" />
                        ) : isLocked ? (
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-border group-hover:border-accent/50 transition-colors" />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium">{course.code}</p>
                        <p
                          className={`font-semibold transition-colors text-sm ${isSelected
                            ? "text-accent"
                            : isLocked
                              ? "text-muted-foreground"
                              : "text-foreground group-hover:text-accent"
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

      {/* Progress Info */}
      <Card className="bg-accent/10 border-accent/20 max-w-3xl mx-auto p-4">
        <p className="text-sm text-foreground font-medium">
          Cursos seleccionados: <span className="text-accent font-bold">{selected.size}</span>
        </p>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4 max-w-3xl mx-auto w-full">
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
