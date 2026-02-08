"use client"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import type { Course } from "@/types/course"
import { CheckCircle2, AlertCircle, Lock, BookMarked } from "lucide-react"
import Link from "next/link"

interface CourseDetailsSheetProps {
  course: Course | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function CourseDetailsSheet({ course, isOpen, onOpenChange }: CourseDetailsSheetProps) {
  if (!course) return null

  const statusConfig = {
    completed: {
      icon: CheckCircle2,
      label: "Completado",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200",
    },
    in_progress: {
      icon: AlertCircle,
      label: "En Progreso",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
    },
    available: {
      icon: null,
      label: "Pendiente",
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200",
    },
    locked: {
      icon: Lock,
      label: "Bloqueado",
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
    },
  }

  const config = statusConfig[course.status]
  const Icon = config.icon

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-2xl">{course.name}</SheetTitle>
          <SheetDescription>{course.code}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${config.color}`} />}
            <Badge className={config.bgColor}>{config.label}</Badge>
          </div>

          {/* Course Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Créditos</h3>
              <p className="text-2xl font-bold text-accent">{course.credits}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Descripción</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
            </div>

            {course.status !== "locked" && (
              <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                <div className="flex items-start gap-2">
                  <BookMarked className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Ruta de Aprendizaje</p>
                    <p className="text-sm text-foreground">
                      Accede a recursos de apoyo, ejercicios prácticos y evaluaciones
                    </p>
                  </div>
                </div>
              </div>
            )}

            {course.status === "locked" && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-900">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Completa los requisitos previos para desbloquear este curso.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-border">
            {course.status !== "locked" && (
              <>
                <Link href={`/curso/${course.id}`} className="w-full">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white">
                    Ver Ruta de Aprendizaje
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full border-border bg-transparent"
                  onClick={() => onOpenChange(false)}
                >
                  Cerrar
                </Button>
              </>
            )}
            {course.status === "locked" && (
              <Button variant="outline" className="w-full border-border bg-transparent" disabled>
                Bloqueado
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
