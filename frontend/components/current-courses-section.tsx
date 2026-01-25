"use client"
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
              status={course.progress >= 90 ? "Casi completo" : "En progreso"}
              progress={course.progress}
              currentTopic="Contenido del curso"
              nextClass="Horario programado"
            />
          ))
        ) : (
          <div className="p-8 text-center bg-card rounded-xl border border-border">
            <p className="text-muted-foreground">No tienes cursos activos en este momento.</p>
          </div>
        )}
      </div>
    </div>
  )
}
