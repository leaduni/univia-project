"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, TrendingUp, AlertCircle, Lightbulb, Zap } from "lucide-react"
import { AI_INSIGHTS_DATA } from "@/lib/mockData"

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
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
      badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
      label: "Fortaleza",
    },
    weakness: {
      icon: AlertCircle,
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      label: "Área de Mejora",
    },
    recommendation: {
      icon: Lightbulb,
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      label: "Recomendación",
    },
    opportunity: {
      icon: Zap,
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "border-purple-200 dark:border-purple-800",
      badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      label: "Oportunidad",
    },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
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
                      <CardTitle className="text-base">{insight.title}</CardTitle>
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
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base">Tu Perfil de Aprendizaje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">85%</div>
              <p className="text-xs text-muted-foreground mt-1">Comprensión Conceptual</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600">72%</div>
              <p className="text-xs text-muted-foreground mt-1">Aplicación Práctica</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">8/10</div>
              <p className="text-xs text-muted-foreground mt-1">Velocidad Aprendizaje</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
