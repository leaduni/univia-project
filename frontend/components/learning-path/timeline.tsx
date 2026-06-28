"use client"

import { TIMELINE_DATA } from "@/lib/mockData"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Lock, BookOpen, Code, FileText } from "lucide-react"

interface TimelineStep {
  id: string | number
  title: string
  description: string
  duration: string
  status: "completed" | "current" | "upcoming" | "locked"
  topics: string[]
  icon?: string
  resources?: {
    type: "video" | "document" | "code"
    title: string
    duration?: string
  }[]
}

export function LearningTimeline({ courseId, timeline }: { courseId: string; timeline: TimelineStep[] }) {
  const steps = timeline

  const getStepIcon = (iconName?: string) => {
    switch (iconName) {
      case 'monitor': return <BookOpen className="w-6 h-6" />;
      case 'code': return <Code className="w-6 h-6" />;
      case 'book': return <BookOpen className="w-6 h-6" />;
      case 'award': return <FileText className="w-6 h-6" />;
      default: return <BookOpen className="w-6 h-6" />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Timeline Container */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-12 bottom-0 w-0.5 gradient-timeline" />

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="relative pl-20">
              {/* Timeline Circle */}
              <div className="absolute left-0 top-2 w-12 h-12 flex items-center justify-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-4 bg-background transition-all ${step.status === "completed"
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

              {/* Card */}
              <Card
                className={`bg-card transition-all ${step.status === "current"
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
                      className={`whitespace-nowrap ${step.status === "completed" &&
                        "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        }
                      ${step.status === "current" &&
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
                  {/* Topics */}
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

                  {/* Resources */}
                  {step.resources && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Recursos</h4>
                      <div className="space-y-2">
                        {step.resources.map((resource, idx) => (
                          <button
                            key={idx}
                            disabled={step.status === "locked"}
                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left group"
                          >
                            {resource.type === "video" && <FileText className="w-4 h-4 text-primary flex-shrink-0" />}
                            {resource.type === "code" && <Code className="w-4 h-4 text-secondary flex-shrink-0" />}
                            {resource.type === "document" && (
                              <BookOpen className="w-4 h-4 text-destructive flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                                {resource.title}
                              </p>
                              {resource.duration && (
                                <p className="text-xs text-muted-foreground">{resource.duration}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex gap-2">
                    {step.status !== "locked" && (
                      <Button variant="default" size="sm" className="gradient-brand-hover text-white border-0">
                        {step.status === "completed" ? "Revisar" : step.status === "current" ? "Continuar" : "Comenzar"}
                      </Button>
                    )}
                    {step.status === "current" && (
                      <Button variant="outline" size="sm">
                        Marcar como Completo
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
