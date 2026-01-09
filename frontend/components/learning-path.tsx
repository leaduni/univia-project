"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LearningTimeline } from "./learning-path/timeline"
import { AIAnalysisBox } from "./learning-path/ai-analysis-box"
import { ExamBank } from "./learning-path/exam-bank"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LearningPathProps {
  courseId: string
}

// Mock course data
const COURSE_DATA: Record<string, any> = {
  c201: {
    code: "CS201",
    name: "Estructuras de Datos",
    professor: "Dr. Carlos Mendez",
    description: "Fundamentos de estructuras de datos: listas, pilas, colas, árboles y grafos",
    credits: 4,
    progress: 45,
    startDate: "2024-01-15",
    endDate: "2024-05-30",
  },
  c101: {
    code: "CS101",
    name: "Programación I",
    professor: "Mg. Ana García",
    description: "Introducción a los conceptos básicos de programación",
    credits: 4,
    progress: 100,
    startDate: "2023-08-01",
    endDate: "2023-12-20",
  },
  c202: {
    code: "MAT201",
    name: "Cálculo II",
    professor: "Dr. Roberto Fernández",
    description: "Integrales múltiples y ecuaciones diferenciales",
    credits: 4,
    progress: 65,
    startDate: "2024-01-15",
    endDate: "2024-05-30",
  },
}

export function LearningPath({ courseId }: LearningPathProps) {
  const [activeTab, setActiveTab] = useState("path")
  const course = COURSE_DATA[courseId] || COURSE_DATA["c201"]

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Back Navigation */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
          Volver a Mi Malla
        </Button>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-accent mb-1">{course.code}</p>
            <h1 className="text-3xl font-bold text-foreground mb-2">{course.name}</h1>
            <p className="text-muted-foreground">{course.professor}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{course.progress}%</div>
            <p className="text-sm text-muted-foreground">Progreso del curso</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="path">Ruta de Aprendizaje</TabsTrigger>
          <TabsTrigger value="analysis">Análisis de IA</TabsTrigger>
          <TabsTrigger value="exams">Banco de Exámenes</TabsTrigger>
        </TabsList>

        {/* Learning Path Timeline */}
        <TabsContent value="path" className="space-y-6">
          <LearningTimeline courseId={courseId} />
        </TabsContent>

        {/* AI Analysis */}
        <TabsContent value="analysis" className="space-y-6">
          <AIAnalysisBox courseId={courseId} />
        </TabsContent>

        {/* Exam Bank */}
        <TabsContent value="exams" className="space-y-6">
          <ExamBank courseId={courseId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
