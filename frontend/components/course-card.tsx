"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, BookMarked } from "lucide-react"
import Link from "next/link"

interface CourseCardProps {
  id: string
  title: string
  professor: string
  status: "En progreso" | "Casi completo" | "No iniciado"
  progress: number
  currentTopic: string
  nextClass: string
}

export function CourseCard({ id, title, professor, status, progress, currentTopic, nextClass }: CourseCardProps) {
  const statusStyles = {
    "En progreso": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    "Casi completo": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    "No iniciado": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  }

  return (
    <Card className="bg-card border-border hover:shadow-md transition-all duration-200 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <CardTitle className="text-lg text-foreground mb-1">{title}</CardTitle>
            <CardDescription className="text-sm">{professor}</CardDescription>
          </div>
          <Badge className={statusStyles[status]}>{status}</Badge>
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
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <BookMarked className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Tema Actual</p>
              <p className="text-sm text-foreground">{currentTopic}</p>
            </div>
          </div>
        </div>

        {/* Next Class Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Próxima clase: {nextClass}</span>
        </div>

        {/* Actions */}
        <Link href={`/curso/${id}`} className="block">
          <Button
            variant="default"
            size="sm"
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
          >
            Ver Ruta
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
