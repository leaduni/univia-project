// Header del grafo: stats de créditos, avance oficial (RF-07), barra de
// progreso con el gradiente del proyecto, leyenda filtrable por estado y
// resumen de cursos/créditos (sin categorías electiva/PPP: no existen en BD).
"use client"

import { CheckCircle2, Circle, Lock, PlayCircle } from "lucide-react"
import { GRAPH_STATUS, STATUS_LABEL } from "./constants"
import type { MallaStats } from "./transformMalla"
import type { AvanceCarrera, StatusCurso } from "@/types/malla"

interface MallaGraphHeaderProps {
  stats: MallaStats
  avance?: AvanceCarrera | null
  filter: StatusCurso | null
  onFilterChange: (estado: StatusCurso | null) => void
}

const FILTER_ICONS: Record<StatusCurso, typeof Circle> = {
  completed: CheckCircle2,
  in_progress: PlayCircle,
  available: Circle,
  locked: Lock,
}

const FILTER_ORDER: StatusCurso[] = ["completed", "in_progress", "available", "locked"]

export function MallaGraphHeader({ stats, avance, filter, onFilterChange }: MallaGraphHeaderProps) {
  // El porcentaje oficial es el de /malla/avance (RF-07); el calculado en el
  // cliente es coherente con la misma fórmula y sirve de respaldo.
  const porcentaje = avance?.porcentaje_avance ?? stats.porcentaje

  return (
    <header className="flex-shrink-0 space-y-3 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-6">
          <Stat valor={stats.aprobadosCR} etiqueta="aprobados CR" color="text-emerald-400" />
          <Stat valor={stats.enCursoCR} etiqueta="en curso CR" color="text-primary" />
          <Stat valor={stats.totalCR} etiqueta="total CR" color="text-muted-foreground" />
          <Stat valor={`${porcentaje}%`} etiqueta="avance" color="text-foreground" />
        </div>
        <div className="flex gap-5">
          <Resumen valor={stats.totalCursos} etiqueta="Cursos" />
          <Resumen valor={stats.totalCR} etiqueta="Créditos" />
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="progress-bar-modern-fill"
          style={{ width: `${Math.min(porcentaje, 100)}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTER_ORDER.map((estado) => {
          const Icon = FILTER_ICONS[estado]
          const activo = filter === estado
          return (
            <button
              key={estado}
              type="button"
              onClick={() => onFilterChange(activo ? null : estado)}
              aria-pressed={activo}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] transition-colors ${
                activo
                  ? "border-foreground/40 bg-muted text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-2.5 w-2.5" aria-hidden />
              {STATUS_LABEL[estado]}
              <span className="text-muted-foreground tabular-nums">{stats.conteoPorEstado[estado]}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => onFilterChange(null)}
          aria-pressed={filter === null}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <span className="h-2 w-2 rounded-full bg-muted-foreground/70" aria-hidden />
          Todos
        </button>
      </div>
    </header>
  )
}

function Stat({ valor, etiqueta, color }: { valor: number | string; etiqueta: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-sm font-bold tabular-nums ${color}`}>{valor}</span>
      <span className="text-[9px] tracking-wider text-muted-foreground uppercase">{etiqueta}</span>
    </div>
  )
}

function Resumen({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="text-center">
      <span className="block text-sm font-bold text-foreground tabular-nums">{valor}</span>
      <span className="block text-[9px] tracking-wider text-muted-foreground uppercase">{etiqueta}</span>
    </div>
  )
}