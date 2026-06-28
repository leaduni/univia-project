"use client"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import type { Course } from "@/types/course"
import { CheckCircle2, PlayCircle, Circle, Lock, BookMarked } from "lucide-react"
import Link from "next/link"
import { COURSE_STATUS_MAP } from "@/lib/course-status"

interface CourseDetailsSheetProps {
  course: Course | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function CourseDetailsSheet({ course, isOpen, onOpenChange }: CourseDetailsSheetProps) {
  if (!course) return null

  const config = COURSE_STATUS_MAP[course.status]

  const icons = {
    completed: CheckCircle2,
    in_progress: PlayCircle,
    available: Circle,
    locked: Lock,
  } as const

  const Icon = icons[course.status]

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-background border-border">
        <SheetHeader>
          <SheetTitle className="text-2xl text-foreground">{course.name}</SheetTitle>
          <SheetDescription>{course.code}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {Icon && <Icon className="text-foreground w-5 h-5" />}
            <Badge className={config.badge}>{config.label}</Badge>
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
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50 opacity-60">
                <p className="text-sm text-muted-foreground">
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
                  <Button className="w-full gradient-brand-hover text-white border-0">
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
