"use client"

import { cn } from "@/lib/utils"

import { CheckCircle2, AlertCircle, Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function CourseLegend() {
  const legendItems = [
    {
      icon: CheckCircle2,
      label: "Completado",
      description: "Curso finalizado satisfactoriamente",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      icon: AlertCircle,
      label: "En Progreso",
      description: "Curso actualmente en desarrollo",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      icon: null,
      label: "Pendiente",
      description: "Disponible para inscribirse",
      color: "text-foreground",
      bgColor: "bg-card dark:bg-card",
    },
    {
      icon: Lock,
      label: "Bloqueado",
      description: "Requisitos previos no completados",
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-50 dark:bg-gray-950/30 grayscale",
    },
  ]

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Leyenda de Estados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {legendItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className={cn("p-4 rounded-lg border border-border flex items-start gap-3", item.bgColor)}
              >
                {Icon ? (
                  <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", item.color)} />
                ) : (
                  <div className="w-5 h-5 rounded border-2 border-border flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
