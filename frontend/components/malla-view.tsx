"use client"

import { useState } from "react"
import { CicloSection } from "./ciclo-section"
import { CourseLegend } from "./course-legend"
import { CourseDetailsSheet } from "./course-details-sheet"
import type { Course } from "@/types/course"
import { CURRICULUM_DATA } from "@/lib/mockData"

export function MallaView() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [mallaData] = useState<any[]>(CURRICULUM_DATA)

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course)
    setIsSheetOpen(true)
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
        <CourseDetailsSheet
          course={selectedCourse}
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
        />
      )}
    </div>
  )
}
