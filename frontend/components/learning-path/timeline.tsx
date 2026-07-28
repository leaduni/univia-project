// Learning path timeline with step cards and progress
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, PlayCircle, Lock, BookOpen, Code, FileText, Download, ArrowRight, ArrowLeft, Loader2 } from "lucide-react"
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
  onStartEvaluation?: (moduleTitle: string) => void
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
        onStartEvaluation(selectedStep.title)
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
              {selectedStep.topics?.map((topic) => (
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
    <div className="relative pl-10 space-y-8">
      <div className="absolute left-[19px] top-2 bottom-0 w-[2px] bg-[#232045]" />

      {steps.map((step, idx) => {
        const isCompleted = step.status === "completed"
        const isCurrent = step.status === "current" || step.status === "upcoming"
        const isLockedStep = step.status === "locked"
        const StatusIcon = isCompleted ? CheckCircle2 : isCurrent && !isLockedStep ? PlayCircle : Lock

        return (
          <div key={step.id} className="relative">
            {/* Icon bubble */}
            <div
              className={`absolute -left-[26px] w-[38px] h-[38px] rounded-full flex items-center justify-center border-2 transition-all ${
                isCompleted
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                  : !isLockedStep
                    ? "bg-[#ec4899]/20 border-[#ec4899] text-[#ec4899] ring-1 ring-[#ec4899]/30"
                    : "bg-[#121124]/60 border-[#232045] text-slate-600"
              }`}
            >
              <StatusIcon className="w-[18px] h-[18px]" />
            </div>

            {/* Content card */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                isCompleted
                  ? "bg-[#121124]/60 border-[#232045]"
                  : !isLockedStep
                    ? "bg-[#14132a]/90 border-[#ec4899]/30 shadow-lg shadow-pink-500/5"
                    : "bg-[#121124]/60 border-[#232045] opacity-50"
              }`}
            >
              {/* Status label */}
              <span
                className={`text-[11px] font-bold tracking-wider ${
                  isCompleted
                    ? "text-emerald-400"
                    : !isLockedStep
                      ? "text-[#ec4899]"
                      : "text-slate-500"
                }`}
              >
                SEMANA {idx + 1} &middot;{" "}
                {isCompleted ? "COMPLETADA" : !isLockedStep ? "EN CURSO" : "PENDIENTE"}
              </span>

              {/* Title */}
              <h3
                className={`text-base font-bold mt-1 ${
                  isLockedStep ? "text-slate-500" : "text-white"
                }`}
              >
                {step.title}
              </h3>

              {/* Topics pills */}
              {step.topics && step.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {step.topics.map((topic) => (
                    <span
                      key={topic}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-[#1e1b3a] text-slate-400"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions row */}
              <div className="flex gap-2 mt-3">
                {!isLockedStep && !isCompleted && (
                  <button
                    onClick={() => handleContinue(step)}
                    className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#ec4899] to-[#a855f7] hover:opacity-90 transition-all shadow-md shadow-pink-500/20"
                  >
                    Practicar este m&oacute;dulo
                  </button>
                )}
                {isCompleted && onStartEvaluation && (
                  <button
                    onClick={() => onStartEvaluation(step.title)}
                    className="px-4 py-2 rounded-xl font-semibold text-xs text-slate-300 bg-[#1d1a3b] border border-[#3b3475] hover:bg-[#282452] transition-all"
                  >
                    Evaluaci&oacute;n de Unidad
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
