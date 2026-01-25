"use client"

import { useState, useEffect } from "react"
import { CicloSection } from "./ciclo-section"
import { CourseLegend } from "./course-legend"
import { CourseDetailsSheet } from "./course-details-sheet"
import type { Course } from "@/types/course"
import { apiService } from "@/lib/api-service"

export function MallaView() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [mallaData, setMallaData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMalla = async () => {
      try {
        setIsLoading(true)
        const data = await apiService.getMalla()
        setMallaData(data)
      } catch (err) {
        setError("No se pudo cargar la malla curricular. Por favor, asegúrate de que el backend esté corriendo.");
        console.error(err);
      } finally {
        setIsLoading(false)
      }
    }

    fetchMalla()
  }, [])

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course)
    setIsSheetOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">Cargando tu malla curricular...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
          <p className="font-semibold">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mi Malla Curricular</h1>
        <p className="text-muted-foreground">Visualiza tu plan de estudios y progreso académico</p>
      </div>

      {/* Ciclos Grid */}
      <div className="space-y-8 mb-8">
        {mallaData.map((cicloData) => (
          <CicloSection
            key={cicloData.ciclo}
            ciclo={cicloData.ciclo}
            credits={cicloData.credits}
            courses={cicloData.courses}
            onCourseClick={handleCourseClick}
          />
        ))}
      </div>

      {/* Legend */}
      <CourseLegend />

      {/* Course Details Sheet */}
      {selectedCourse && (
        <CourseDetailsSheet course={selectedCourse} isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} />
      )}
    </div>
  )
}
