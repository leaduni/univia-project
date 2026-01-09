"use client"
import { CourseCard } from "./course-card"

export function CurrentCoursesSection() {
  const courses = [
    {
      id: "1",
      title: "Programación I",
      professor: "Dr. Carlos López",
      status: "En progreso" as const,
      progress: 65,
      currentTopic: "Estructuras de Control - Bucles y Condiciones",
      nextClass: "Mañana, 10:00 AM",
    },
    {
      id: "2",
      title: "Cálculo II",
      professor: "Dra. María García",
      status: "Casi completo" as const,
      progress: 92,
      currentTopic: "Integrales Múltiples y Aplicaciones",
      nextClass: "Jueves, 2:30 PM",
    },
    {
      id: "3",
      title: "Fundamentos de Base de Datos",
      professor: "Prof. Juan Martínez",
      status: "En progreso" as const,
      progress: 48,
      currentTopic: "Modelado de Entidad-Relación",
      nextClass: "Miércoles, 4:00 PM",
    },
  ]

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Cursos Actuales</h2>
        <p className="text-sm text-muted-foreground mt-1">Tu progreso académico en tiempo real</p>
      </div>

      <div className="space-y-4">
        {courses.map((course) => (
          <CourseCard key={course.id} {...course} />
        ))}
      </div>
    </div>
  )
}
