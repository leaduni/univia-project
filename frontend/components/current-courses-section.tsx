// Dashboard section listing active semester courses
"use client"
import { BookOpen } from "lucide-react"
import { CourseCard } from "./course-card"

interface CurrentCoursesSectionProps {
  courses: any[]
  isLoading: boolean
}

export function CurrentCoursesSection({ courses, isLoading }: CurrentCoursesSectionProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Cursos Actuales</h2>
        <p className="text-sm text-muted-foreground mt-1">Tu progreso académico en tiempo real</p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          // Placeholder loading cards
          [1, 2, 3].map((i) => (
            <div key={i} className="h-32 w-full bg-card animate-pulse rounded-xl border border-border" />
          ))
        ) : courses && courses.length > 0 ? (
          courses.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id.toString()}
              title={course.name}
              professor="Asignado"
              status={course.status}
              progress={course.progreso}
              currentTopic="Contenido del curso"
              nextClass="Horario programado"
            />
          ))
        ) : (
          <div className="p-10 text-center bg-card rounded-xl border border-dashed border-primary/20">
            <div className="p-3 rounded-lg gradient-brand-br inline-flex mb-4">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <p className="text-muted-foreground font-medium">No tienes cursos activos en este momento.</p>
            <p className="text-xs text-muted-foreground/70 mt-2">Los cursos aparecerán aquí cuando te inscribas.</p>
          </div>
        )}
      </div>
    </div>
  )
}
