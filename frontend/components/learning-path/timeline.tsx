// Learning path timeline with step cards and progress
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Lock, BookOpen, Code, FileText, Download, ArrowRight, ArrowLeft, Loader2 } from "lucide-react"
import { apiService } from "@/lib/api-service"

interface Plancha {
  nombre: string
  archivo: string
  url: string
}

interface TimelineStep {
  id: string | number
  title: string
  description: string
  duration: string
  status: "completed" | "current" | "upcoming" | "locked"
  topics: string[]
  icon?: string
  completado?: boolean
  planchas?: Plancha[]
  resources?: {
    type: "video" | "document" | "code"
    title: string
    duration?: string
  }[]
}

export function LearningTimeline({
  courseId,
  timeline,
  onStartEvaluation
}: {
  courseId: string
  timeline: TimelineStep[]
  onStartEvaluation?: (moduleTitle: string, topics: string[]) => void
}) {
  const [selectedStep, setSelectedStep] = useState<TimelineStep | null>(null)
  const [completingStep, setCompletingStep] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const steps = timeline

  const getStepIcon = (iconName?: string) => {
    switch (iconName) {
      case 'move': return <BookOpen className="w-6 h-6" />
      case 'code': return <Code className="w-6 h-6" />
      case 'book': return <BookOpen className="w-6 h-6" />
      default: return <BookOpen className="w-6 h-6" />
    }
  }

  const handleContinue = (step: TimelineStep) => {
    setSelectedStep(step)
  }

  const handleComplete = async () => {
    if (!selectedStep) return
    setCompletingStep(Number(selectedStep.id))
    setError(null)
    try {
      await apiService.completeStep(courseId, selectedStep.id)
      setCompletingStep(null)
      setSelectedStep(null)
      if (onStartEvaluation) {
        onStartEvaluation(selectedStep.title, selectedStep.topics)
      }
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
      setCompletingStep(null)
    }
  }

  // Vista detallada de unidad seleccionada
  if (selectedStep) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => { setSelectedStep(null); setError(null); }}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la ruta de aprendizaje
        </Button>

        {/* Unit Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 ${
              selectedStep.status === "completed"
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                : "border-primary bg-primary/10 text-primary ring-4 ring-primary/30"
            }`}>
              {selectedStep.status === "completed"
                ? <CheckCircle2 className="w-5 h-5" />
                : getStepIcon(selectedStep.icon)
              }
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{selectedStep.title}</h2>
              <p className="text-sm text-muted-foreground">{selectedStep.description}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-13">Duración estimada: {selectedStep.duration}</p>
        </div>

        {/* Topics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Temas a Cubrir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedStep.topics.map((topic) => (
                <Badge key={topic} variant="secondary" className="text-sm px-3 py-1.5">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resources - Planchas PDF */}
        {selectedStep.planchas && selectedStep.planchas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-destructive" />
                Material de Estudio
              </CardTitle>
              <CardDescription>
                Revisa estos materiales antes de continuar. Descarga y estudia cada recurso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedStep.planchas.map((plancha, idx) => (
                  <button
                    key={idx}
                    onClick={() => apiService.downloadPlancha(courseId, plancha.archivo)}
                    className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                        Práctica Dirigida: {plancha.nombre}
                      </p>
                      <p className="text-xs text-muted-foreground">PDF - Haz clic para descargar</p>
                    </div>
                    <Download className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No resources message */}
        {(!selectedStep.planchas || selectedStep.planchas.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay material adicional disponible para esta unidad.</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={handleComplete}
            disabled={completingStep !== null || selectedStep.status === "completed"}
            className="w-full gap-2 gradient-brand-hover text-white border-0"
            size="lg"
          >
            {completingStep !== null ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {completingStep !== null
              ? "Completando..."
              : selectedStep.status === "completed"
                ? "Unidad Completada"
                : "Marcar como Completado"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Al marcar como completado, serás redirigido a la evaluación con IA de esta unidad.
          </p>
        </div>
      </div>
    )
  }

  // Vista de lista (timeline)
  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute left-6 top-12 bottom-0 w-0.5 gradient-timeline" />

        <div className="space-y-6">
          {steps.map((step) => (
            <div key={step.id} className="relative pl-20">
              <div className="absolute left-0 top-2 w-12 h-12 flex items-center justify-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-4 bg-background transition-all ${
                    step.status === "completed"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : step.status === "current"
                        ? "border-primary bg-primary/10 text-primary ring-4 ring-primary/30"
                        : step.status === "upcoming"
                          ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                          : "border-muted-foreground/20 bg-muted/50 text-muted-foreground/60"
                  }`}
                >
                  {step.status === "completed" ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : step.status === "locked" ? (
                    <Lock className="w-6 h-6" />
                  ) : (
                    getStepIcon(step.icon)
                  )}
                </div>
              </div>

              <Card
                className={`bg-card transition-all ${
                  step.status === "current"
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                    : step.status === "locked"
                      ? "opacity-60 cursor-not-allowed"
                      : "border-border"
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </div>
                    <Badge
                      variant={
                        step.status === "completed" ? "default" : step.status === "current" ? "secondary" : "outline"
                      }
                      className={`whitespace-nowrap ${
                        step.status === "completed" &&
                        "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      }
                      ${
                        step.status === "current" &&
                        "bg-primary/15 text-primary border-primary/30 ring-1 ring-primary/30"
                      }`}
                    >
                      {step.status === "completed"
                        ? "Completado"
                        : step.status === "current"
                          ? "En progreso"
                          : step.status === "upcoming"
                            ? "Próximo"
                            : "Bloqueado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-2">Duración estimada: {step.duration}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {step.topics && step.topics.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Temas a Cubrir</h4>
                      <div className="flex flex-wrap gap-2">
                        {step.topics.map((topic) => (
                          <Badge key={topic} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex gap-2">
                    {step.status !== "locked" && step.status !== "completed" && (
                      <Button
                        variant="default"
                        size="sm"
                        className="gradient-brand-hover text-white border-0 gap-2"
                        onClick={() => handleContinue(step)}
                      >
                        {step.status === "current" ? "Continuar" : "Comenzar"}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                    {step.status === "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          if (onStartEvaluation) {
                            onStartEvaluation(step.title, step.topics)
                          }
                        }}
                      >
                        Evaluación de Unidad
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
