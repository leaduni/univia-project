"use client"

import { useState } from "react"
import { CicloSection } from "./ciclo-section"
import { CourseLegend } from "./course-legend"
import { CourseDetailsSheet } from "./course-details-sheet"
import type { Course } from "@/types/course"

const CURRICULUM_DATA = [
  {
    ciclo: "Ciclo I",
    credits: 18,
    courses: [
      {
        id: "c101",
        code: "CS101",
        name: "Programación Fundamental",
        credits: 4,
        status: "completed",
        description: "Introducción a los conceptos básicos de programación using Python",
      },
      {
        id: "c102",
        code: "MAT101",
        name: "Cálculo I",
        credits: 4,
        status: "completed",
        description: "Fundamentos de límites, derivadas e integrales",
      },
      {
        id: "c103",
        code: "FIS101",
        name: "Física I",
        credits: 4,
        status: "completed",
        description: "Mecánica clásica y termodinámica básica",
      },
      {
        id: "c104",
        code: "COM101",
        name: "Comunicación",
        credits: 3,
        status: "completed",
        description: "Habilidades de comunicación académica y profesional",
      },
      {
        id: "c105",
        code: "HUM101",
        name: "Humanidades",
        credits: 3,
        status: "completed",
        description: "Introducción a la filosofía y ética",
      },
    ],
  },
  {
    ciclo: "Ciclo II",
    credits: 19,
    courses: [
      {
        id: "c201",
        code: "CS201",
        name: "Estructuras de Datos",
        credits: 4,
        status: "in_progress",
        description: "Listas, pilas, colas, árboles y grafos",
      },
      {
        id: "c202",
        code: "MAT201",
        name: "Cálculo II",
        credits: 4,
        status: "in_progress",
        description: "Integrales múltiples y ecuaciones diferenciales",
      },
      {
        id: "c203",
        code: "FIS201",
        name: "Física II",
        credits: 4,
        status: "in_progress",
        description: "Electricidad y magnetismo",
      },
      {
        id: "c204",
        code: "ALG101",
        name: "Álgebra Lineal",
        credits: 4,
        status: "in_progress",
        description: "Matrices, vectores y transformaciones lineales",
      },
      {
        id: "c205",
        code: "ENG101",
        name: "Inglés Técnico",
        credits: 3,
        status: "in_progress",
        description: "Inglés para programación y documentación técnica",
      },
    ],
  },
  {
    ciclo: "Ciclo III",
    credits: 20,
    courses: [
      {
        id: "c301",
        code: "CS301",
        name: "Algoritmos",
        credits: 4,
        status: "available",
        description: "Análisis y diseño de algoritmos eficientes",
      },
      {
        id: "c302",
        code: "DB301",
        name: "Bases de Datos",
        credits: 4,
        status: "available",
        description: "Modelado relacional, SQL y diseño de esquemas",
      },
      {
        id: "c303",
        code: "SYS301",
        name: "Sistemas Operativos",
        credits: 4,
        status: "available",
        description: "Procesos, memoria, entrada/salida y gestión de recursos",
      },
      {
        id: "c304",
        code: "STA301",
        name: "Estadística",
        credits: 4,
        status: "available",
        description: "Probabilidad, distribuciones e inferencia estadística",
      },
      {
        id: "c305",
        code: "PRJ301",
        name: "Proyecto I",
        credits: 4,
        status: "available",
        description: "Proyecto práctico integrando conocimientos del ciclo",
      },
    ],
  },
  {
    ciclo: "Ciclo IV",
    credits: 20,
    courses: [
      {
        id: "c401",
        code: "WEB401",
        name: "Desarrollo Web",
        credits: 4,
        status: "locked",
        description: "Frontend y backend con frameworks modernos",
      },
      {
        id: "c402",
        code: "MOB401",
        name: "Desarrollo Móvil",
        credits: 4,
        status: "locked",
        description: "Aplicaciones para iOS y Android",
      },
      {
        id: "c403",
        code: "ML401",
        name: "Machine Learning",
        credits: 4,
        status: "locked",
        description: "Algoritmos de aprendizaje automático y deep learning",
      },
      {
        id: "c404",
        code: "SEC401",
        name: "Seguridad Informática",
        credits: 4,
        status: "locked",
        description: "Criptografía, auditoría y seguridad en redes",
      },
      {
        id: "c405",
        code: "PRJ401",
        name: "Proyecto II",
        credits: 4,
        status: "locked",
        description: "Proyecto capstone integrando especializaciones",
      },
    ],
  },
]

export function MallaView() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

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
        {CURRICULUM_DATA.map((cicloData) => (
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
