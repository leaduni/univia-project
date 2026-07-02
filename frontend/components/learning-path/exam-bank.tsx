// Exam bank browser with filters and download actions
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Download, BarChart3, BookOpen } from "lucide-react"
import { apiService } from "@/lib/api-service"

interface Exam {
  id: string
  title: string
  type: "midterm" | "final" | "quiz" | "practice"
  year: number
  difficulty: "easy" | "medium" | "hard"
  questions: number
  duration: number
  downloads: number
  hasAnswers: boolean
  plancha_file?: string
}

// Todas las planchas de Geometría Analítica del repositorio
const GEOMETRIA_PLANCHAS: { nombre: string; archivo: string }[] = [
  { nombre: "Vectores", archivo: "VECTORES.pdf" },
  { nombre: "Componente y Producto Escalar", archivo: "COMPONENTE Y PROD. ESCALAR.pdf" },
  { nombre: "Proyección Ortogonal", archivo: "PROYECCION ORTOGONAL.pdf" },
  { nombre: "Razón de División", archivo: "RAZON DE DIVISION.pdf" },
  { nombre: "La Recta", archivo: "RECTA.pdf" },
  { nombre: "Complemento - La Recta", archivo: "RECTA-COMPLEMENTO.pdf" },
  { nombre: "Rotación y Traslación de Coordenadas", archivo: "ROTACION Y TRASLACION DE COORDS.pdf" },
  { nombre: "La Circunferencia", archivo: "CIRCUNFERENCIA.pdf" },
  { nombre: "La Parábola", archivo: "PARABOLA.pdf" },
  { nombre: "La Elipse", archivo: "ELIPSE.pdf" },
  { nombre: "Elipse e Hipérbola", archivo: "ELIPSE E HIPÉRBOLA.pdf" },
  { nombre: "La Hipérbola", archivo: "HIPÉRBOLA.pdf" },
  { nombre: "Ecuación de Segundo Grado", archivo: "ECUACION DE SEGUNDO GRADO.pdf" },
]

const COURSE_IDS_GA = ["11", "31", "54"]

export function ExamBank({ courseId, exams }: { courseId: string; exams: Exam[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string | null>(null)

  const isGA = COURSE_IDS_GA.includes(courseId)

  const allExams = useMemo(() => {
    const examList = Array.isArray(exams) ? [...exams] : []
    if (isGA) {
      GEOMETRIA_PLANCHAS.forEach((p, idx) => {
        examList.push({
          id: `plancha-${idx}`,
          title: `Práctica Dirigida: ${p.nombre}`,
          type: "practice" as const,
          year: new Date().getFullYear(),
          difficulty: "medium" as const,
          questions: 0,
          duration: 0,
          downloads: 0,
          hasAnswers: false,
          plancha_file: p.archivo,
        })
      })
    }
    return examList
  }, [exams, isGA])

  const filteredExams = allExams.filter((exam) => {
    if (!exam?.title) return false
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !filterType || exam.type === filterType
    return matchesSearch && matchesType
  })

  const typeConfig: Record<string, { label: string; bg: string }> = {
    midterm: { label: "Parcial", bg: "bg-primary/15 text-primary border-primary/30" },
    final: { label: "Final", bg: "bg-destructive/15 text-destructive border-destructive/30" },
    quiz: { label: "Quiz", bg: "bg-secondary/15 text-secondary border-secondary/30" },
    practice: { label: "Práctica", bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  }

  const difficultyConfig: Record<string, { label: string; color: string }> = {
    easy: { label: "Fácil", color: "text-emerald-400" },
    medium: { label: "Medio", color: "text-amber-400" },
    hard: { label: "Difícil", color: "text-destructive" },
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Banco de Exámenes</h3>
        <p className="text-sm text-muted-foreground">
          {isGA
            ? "Repositorio completo de exámenes, prácticas dirigidas y material de estudio de Geometría Analítica"
            : "Accede a exámenes anteriores y materiales de práctica"}
        </p>
      </div>

      {isGA && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <BookOpen className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">13 prácticas dirigidas</span> disponibles en el repositorio.
            Revisa el material por tema para prepararte antes de tus evaluaciones.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <Input
          placeholder="Buscar por título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-secondary/50"
        />
        <div className="flex gap-2 flex-wrap">
          {Object.entries(typeConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setFilterType(filterType === key ? null : key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === key ? config.bg : "bg-secondary/50 text-foreground hover:bg-secondary"
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredExams.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No se encontraron exámenes</p>
            </CardContent>
          </Card>
        ) : (
          filteredExams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className={`w-4 h-4 flex-shrink-0 ${
                        exam.type === "practice" && exam.plancha_file ? "text-emerald-500" : "text-blue-500"
                      }`} />
                      <h4 className="font-semibold text-foreground truncate">{exam.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {exam.plancha_file ? "Geometría Analítica" : exam.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={typeConfig[exam.type]?.bg || ""}>
                      {typeConfig[exam.type]?.label || exam.type}
                    </Badge>
                    {exam.difficulty && difficultyConfig[exam.difficulty] && (
                      <Badge variant="outline" className={difficultyConfig[exam.difficulty].color}>
                        {difficultyConfig[exam.difficulty].label}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {!exam.plancha_file && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Preguntas</p>
                      <p className="font-semibold text-foreground">{exam.questions}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Duración</p>
                      <p className="font-semibold text-foreground">{exam.duration} min</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Descargas</p>
                      <p className="font-semibold text-foreground">{exam.downloads}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  {exam.plancha_file ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => exam.plancha_file && apiService.downloadPlancha(courseId, exam.plancha_file)}
                    >
                      <Download className="w-4 h-4" />
                      Descargar PDF
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
                        <FileText className="w-4 h-4" />
                        Ver Examen
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
                        <Download className="w-4 h-4" />
                        Descargar
                      </Button>
                      {exam.hasAnswers && (
                        <Button variant="default" size="sm" className="flex-1 gap-2 gradient-ai-neon-hover text-white border-0">
                          <BarChart3 className="w-4 h-4" />
                          Soluciones
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
