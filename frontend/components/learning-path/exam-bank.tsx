"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Download, Eye, BarChart3 } from "lucide-react"
import { EXAM_BANK_DATA } from "@/lib/mockData"

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
}

export function ExamBank({ courseId, exams }: { courseId: string; exams: Exam[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string | null>(null)

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) || exam.year.toString().includes(searchTerm)
    const matchesType = !filterType || exam.type === filterType

    return matchesSearch && matchesType
  })

  const typeConfig = {
    midterm: { label: "Parcial", bg: "bg-primary/15 text-primary border-primary/30" },
    final: { label: "Final", bg: "bg-destructive/15 text-destructive border-destructive/30" },
    quiz: { label: "Quiz", bg: "bg-secondary/15 text-secondary border-secondary/30" },
    practice: {
      label: "Práctica",
      bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
  }

  const difficultyConfig = {
    easy: { label: "Fácil", color: "text-emerald-400" },
    medium: { label: "Medio", color: "text-amber-400" },
    hard: { label: "Difícil", color: "text-destructive" },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Banco de Exámenes</h3>
        <p className="text-sm text-muted-foreground">Accede a exámenes anteriores y materiales de práctica</p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <Input
          placeholder="Buscar por año o título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-secondary/50"
        />

        <div className="flex gap-2 flex-wrap">
          {(["midterm", "final", "quiz", "practice"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === type
                  ? `${typeConfig[type].bg} ${typeConfig[type].text}`
                  : "bg-secondary/50 text-foreground hover:bg-secondary"
                }`}
            >
              {typeConfig[type].label}
            </button>
          ))}
        </div>
      </div>

      {/* Exams List */}
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
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <h4 className="font-semibold text-foreground truncate">{exam.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{exam.year}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`${typeConfig[exam.type].bg} ${typeConfig[exam.type].text}`}>
                      {typeConfig[exam.type].label}
                    </Badge>
                    <Badge variant="outline" className={difficultyConfig[exam.difficulty].color}>
                      {difficultyConfig[exam.difficulty].label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Exam Details */}
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

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
                    <Eye className="w-4 h-4" />
                    Ver Examen
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
                    <Download className="w-4 h-4" />
                    Descargar
                  </Button>
                  {exam.hasAnswers && (
                    <Button variant="default" size="sm" className="flex-1 gap-2 gradient-brand-hover text-white border-0">
                      <BarChart3 className="w-4 h-4" />
                      Soluciones
                    </Button>
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
