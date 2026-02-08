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
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 via-cyan-400 to-gray-300" />

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="relative pl-20">
              {/* Timeline Circle */}
              <div className="absolute left-0 top-2 w-12 h-12 flex items-center justify-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-4 bg-background transition-all ${step.status === "completed"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600"
                    : step.status === "current"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 ring-4 ring-blue-200 dark:ring-blue-800"
                      : step.status === "upcoming"
                        ? "border-gray-300 bg-gray-50 dark:bg-gray-950/30 text-gray-400"
                        : "border-gray-300 bg-gray-100 dark:bg-gray-900 text-gray-400"
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
                className={`transition-all ${step.status === "current"
                  ? "border-blue-400 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20 ring-1 ring-blue-200 dark:ring-blue-800"
                  : step.status === "locked"
                    ? "opacity-60 cursor-not-allowed"
                    : ""
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
                        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                        }
                      ${step.status === "current" &&
                        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-pulse"
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
                            {resource.type === "video" && <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                            {resource.type === "code" && <Code className="w-4 h-4 text-cyan-500 flex-shrink-0" />}
                            {resource.type === "document" && (
                              <BookOpen className="w-4 h-4 text-purple-500 flex-shrink-0" />
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
                      <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
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
