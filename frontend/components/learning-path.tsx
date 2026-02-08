"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LearningTimeline } from "./learning-path/timeline"
import { AIAnalysisBox } from "./learning-path/ai-analysis-box"
import { ExamBank } from "./learning-path/exam-bank"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiService } from "@/lib/api-service"
import Link from "next/link"

interface LearningPathProps {
  courseId: string
}

export function LearningPath({ courseId }: LearningPathProps) {
  const [activeTab, setActiveTab] = useState("path")
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLearningPath = async () => {
      try {
        setIsLoading(true)
        // Limpiar el ID si viene con el prefijo 'c' (ej: 'c101' -> '101')
        const cleanId = courseId.toString().startsWith('c')
          ? courseId.toString().substring(1)
          : courseId

        const result = await apiService.getLearningPath(cleanId)
        setData(result)
      } catch (err) {
        setError("Error al cargar la ruta de aprendizaje.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchLearningPath()
  }, [courseId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">Cargando ruta de aprendizaje...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 font-semibold">
          {error || "No se encontraron datos para este curso."}
        </div>
        <Link href="/mi-malla">
          <Button variant="outline">Volver a Mi Malla</Button>
        </Link>
      </div>
    )
  }

  const { curso, timeline, ai_insights, exam_bank } = data

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link href="/mi-malla">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
            Volver a Mi Malla
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-accent mb-1">{curso.code}</p>
            <h1 className="text-3xl font-bold text-foreground mb-2">{curso.name}</h1>
            <p className="text-muted-foreground">{curso.professor}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{curso.progress}%</div>
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
          <LearningTimeline courseId={courseId} timeline={timeline} />
        </TabsContent>

        {/* AI Analysis */}
        <TabsContent value="analysis" className="space-y-6">
          <AIAnalysisBox courseId={courseId} insights={ai_insights} />
        </TabsContent>

        {/* Exam Bank */}
        <TabsContent value="exams" className="space-y-6">
          <ExamBank courseId={courseId} exams={exam_bank} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
