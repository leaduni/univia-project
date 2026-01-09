"use client"

import { Badge } from "@/components/ui/badge"
import { MallaCourseCard } from "./malla-course-card"
import type { Course } from "@/types/course"

interface CicloSectionProps {
  ciclo: string
  credits: number
  courses: Course[]
  onCourseClick: (course: Course) => void
}

export function CicloSection({ ciclo, credits, courses, onCourseClick }: CicloSectionProps) {
  return (
    <div>
      {/* Ciclo Header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-foreground">{ciclo}</h2>
        <Badge variant="outline" className="bg-secondary text-foreground border-border">
          {credits} créditos
        </Badge>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {courses.map((course) => (
          <MallaCourseCard key={course.id} course={course} onClick={() => onCourseClick(course)} />
        ))}
      </div>
    </div>
  )
}
