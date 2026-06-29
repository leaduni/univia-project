// Course card with status badge, progress bar, and CTA
"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, BookMarked } from "lucide-react"
import Link from "next/link"
import { COURSE_STATUS_MAP } from "@/lib/course-status"

interface CourseCardProps {
  id: string
  title: string
  professor?: string
  status: "En progreso" | "Completado" | "Disponible" | "Bloqueado" | "available" | "in_progress" | "completed" | "locked" | "Casi completo"
  progress: number
  currentTopic?: string
  nextClass?: string
}

const STATUS_KEY_MAP: Record<string, "completed" | "in_progress" | "available" | "locked"> = {
  "En progreso": "in_progress",
  "in_progress": "in_progress",
  "Casi completo": "in_progress",
  "Completado": "completed",
  "completed": "completed",
  "No iniciado": "available",
  "Disponible": "available",
  "available": "available",
  "Bloqueado": "locked",
  "locked": "locked",
}

export function CourseCard({ id, title, professor, status, progress, currentTopic, nextClass }: CourseCardProps) {
  const mappedStatus = STATUS_KEY_MAP[status] || "available"
  const statusConfig = COURSE_STATUS_MAP[mappedStatus]

  return (
    <Card className="bg-card border-border hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <CardTitle className="text-lg text-foreground mb-1">{title}</CardTitle>
            <CardDescription className="text-sm">{professor}</CardDescription>
          </div>
          <Badge className={statusConfig.badge}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">Progreso</span>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
          <div className="progress-bar-modern">
            <div className="progress-bar-modern-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Current Topic */}
        {currentTopic && (
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <BookMarked className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Tema Actual</p>
                <p className="text-sm text-foreground">{currentTopic}</p>
              </div>
            </div>
          </div>
        )}

        {/* Next Class Info */}
        {nextClass && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Próxima clase: {nextClass}</span>
          </div>
        )}

        {/* Actions */}
        {mappedStatus === 'locked' ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full opacity-50 cursor-not-allowed"
            disabled
          >
            Bloqueado
          </Button>
        ) : (
          <Link href={`/curso/${id}`} className="block">
            <Button
              variant="default"
              size="sm"
              className="w-full gradient-brand-hover text-white border-0"
            >
              Ver Ruta
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
