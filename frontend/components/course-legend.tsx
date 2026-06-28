"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2, AlertCircle, Lock, Circle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { COURSE_STATUS_MAP } from "@/lib/course-status"

const legendIcons: Record<string, React.ComponentType<{ className?: string }> | null> = {
  completed: CheckCircle2,
  in_progress: AlertCircle,
  available: Circle,
  locked: Lock,
}

const legendIconColors: Record<string, string> = {
  completed: "text-emerald-400",
  in_progress: "text-primary",
  available: "text-muted-foreground",
  locked: "text-muted-foreground",
}

export function CourseLegend() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Leyenda de Estados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(COURSE_STATUS_MAP) as Array<keyof typeof COURSE_STATUS_MAP>).map((key) => {
            const config = COURSE_STATUS_MAP[key]
            const Icon = legendIcons[key]
            return (
              <div
                key={key}
                className={cn("p-4 rounded-lg border border-border flex items-start gap-3", config.card)}
              >
                {Icon ? (
                  <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", legendIconColors[key] || "text-foreground")} />
                ) : (
                  <div className="w-5 h-5 rounded border-2 border-border flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{config.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {key === "completed" && "Curso finalizado satisfactoriamente"}
                    {key === "in_progress" && "Curso actualmente en desarrollo"}
                    {key === "available" && "Disponible para inscribirse"}
                    {key === "locked" && "Requisitos previos no completados"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
