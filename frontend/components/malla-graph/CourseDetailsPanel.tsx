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
}

export function CourseDetailsPanel({ course, post, onClose }: CourseDetailsPanelProps) {
  const fecha = course.fecha_completado ? new Date(course.fecha_completado) : null
  const fechaValida = fecha && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleDateString("es-PE") : null

  return (
    <div className="absolute right-0 top-0 bottom-0 z-10 flex w-60 flex-col gap-2 overflow-y-auto border-l border-border bg-card/95 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm leading-snug font-bold text-foreground">{course.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {course.code} · {course.credits} CR · Ciclo {course.ciclo}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
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

      <button
        type="button"
        onClick={onClose}
        className="mt-auto rounded-md border border-border px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
      >
        Cerrar
      </button>
    </div>
  )
}