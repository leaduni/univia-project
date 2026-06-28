// AI analysis insights - strengths, weaknesses, recommendations
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, TrendingUp, AlertCircle, Lightbulb, Zap } from "lucide-react"

interface AIInsight {
  type: "strength" | "weakness" | "recommendation" | "opportunity"
  title: string
  description: string
  impact?: string
  action?: string
}

export function AIAnalysisBox({ courseId, insights }: { courseId: string; insights: AIInsight[] }) {

  const typeConfig = {
    strength: {
      icon: TrendingUp,
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      label: "Fortaleza",
    },
    weakness: {
      icon: AlertCircle,
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      label: "Área de Mejora",
    },
    recommendation: {
      icon: Lightbulb,
      bg: "bg-primary/10",
      border: "border-primary/30",
      badge: "bg-primary/15 text-primary border-primary/30",
      label: "Recomendación",
    },
    opportunity: {
      icon: Zap,
      bg: "bg-secondary/10",
      border: "border-secondary/30",
      badge: "bg-secondary/15 text-secondary border-secondary/30",
      label: "Oportunidad",
    },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg gradient-ai-neon">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Análisis Inteligente de IA</h3>
          <p className="text-sm text-muted-foreground">Insights personalizados basados en tu progreso</p>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid gap-4">
        {insights.map((insight, idx) => {
          const config = typeConfig[insight.type]
          const Icon = config.icon

          return (
            <Card key={idx} className={`border-2 ${config.border} ${config.bg}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className="w-5 h-5 mt-1 flex-shrink-0" />
                    <div>
                      <CardTitle className="text-base text-foreground">{insight.title}</CardTitle>
                      <CardDescription className="mt-1 text-sm">{insight.description}</CardDescription>
                    </div>
                  </div>
                  <Badge className={config.badge}>{config.label}</Badge>
                </div>
              </CardHeader>

              {insight.impact && (
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Impacto estimado:</span>
                    <span className="text-sm font-semibold text-foreground">{insight.impact}</span>
                  </div>
                </CardContent>
              )}

              {insight.action && (
                <CardContent className="pt-0">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    {insight.action} →
                  </Button>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Summary Stats */}
      <Card className="ai-card-neon">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Tu Perfil de Aprendizaje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">85%</div>
              <p className="text-xs text-muted-foreground mt-1">Comprensión Conceptual</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">72%</div>
              <p className="text-xs text-muted-foreground mt-1">Aplicación Práctica</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">8/10</div>
              <p className="text-xs text-muted-foreground mt-1">Velocidad Aprendizaje</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
