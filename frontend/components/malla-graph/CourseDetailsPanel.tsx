// Panel lateral de detalle del curso seleccionado. Solo lectura: muestra el
// estado real (de progreso_cursos) y las cadenas de prerrequisitos, sin
// botones para alterar el estado académico.
"use client"

import { X } from "lucide-react"
import { GRAPH_STATUS, STATUS_LABEL } from "./constants"
import type { CourseNodeData } from "./transformMalla"

interface CourseDetailsPanelProps {
  course: CourseNodeData
  post: CourseNodeData[]
  onClose: () => void
  onMarkCompleted?: (courseId: string) => void
}

export function CourseDetailsPanel({ course, post, onClose, onMarkCompleted }: CourseDetailsPanelProps) {
  const fecha = course.fecha_completado ? new Date(course.fecha_completado) : null
  const fechaValida = fecha && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleDateString("es-PE") : null

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex max-h-[60%] w-full flex-col gap-2 overflow-y-auto rounded-t-2xl border-t border-border bg-card/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur sm:inset-x-auto sm:right-0 sm:top-0 sm:max-h-none sm:w-60 sm:rounded-none sm:border-t-0 sm:border-l sm:pb-4 sm:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm leading-snug font-bold text-foreground break-words">{course.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {course.code} · {course.credits} CR · Ciclo {course.ciclo}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel"
          className="shrink-0 rounded-md p-2.5 -m-1.5 text-muted-foreground sm:m-0 sm:p-1 transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <span className={`inline-flex items-center gap-1 self-start rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${GRAPH_STATUS[course.status].badge}`}>
        {STATUS_LABEL[course.status]}
      </span>

      {(course.nota != null || fechaValida) && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {course.nota != null && (
            <p>
              Nota: <span className="font-semibold text-foreground">{course.nota.toFixed(1)}</span>
            </p>
          )}
          {fechaValida && (
            <p>
              Aprobado: <span className="font-semibold text-foreground">{fechaValida}</span>
            </p>
          )}
        </div>
      )}

      <div className="mt-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
        Prerrequisitos
      </div>
      <div className="flex flex-col gap-0.5">
        {course.prerequisitos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Ninguno</p>
        ) : (
          course.prerequisitos.map((p) => (
            <p key={p.id} className="text-xs text-muted-foreground">
              ↳ {p.name}
            </p>
          ))
        )}
      </div>

      <div className="mt-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
        Desbloquea
      </div>
      <div className="flex flex-col gap-0.5">
        {post.length === 0 ? (
          <p className="text-xs text-muted-foreground">Ninguno</p>
        ) : (
          post.map((c) => (
            <p key={c.id} className="text-xs text-muted-foreground">
              → {c.name}
            </p>
          ))
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2 sm:pt-0">
        {(course.status === "in_progress" || course.status === "available") && onMarkCompleted && (
          <button
            type="button"
            onClick={() => onMarkCompleted(course.id)}
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 min-h-10 px-2 py-1.5 text-[11px] font-semibold text-emerald-400 sm:min-h-0 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300"
          >
            Marcar como Aprobado
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="min-h-10 rounded-md border border-border px-2 py-1.5 text-[11px] text-muted-foreground sm:min-h-0 transition-colors hover:border-foreground/50 hover:text-foreground"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}