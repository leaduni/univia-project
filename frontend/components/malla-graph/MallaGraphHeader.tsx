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
          const bgActive: Record<StatusCurso, string> = {
            completed: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
            in_progress: "bg-indigo-500/20 border-indigo-500/50 text-indigo-400",
            available: "bg-blue-500/20 border-blue-500/50 text-blue-400",
            locked: "bg-slate-500/20 border-slate-500/50 text-slate-300"
          }
          return (
            <button
              key={estado}
              type="button"
              onClick={() => onFilterChange(activo ? null : estado)}
              aria-pressed={activo}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                activo
                  ? bgActive[estado]
                  : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/20"
              }`}
            >
              <Icon className="h-3 w-3" aria-hidden />
              {STATUS_LABEL[estado]}
              <span className={`tabular-nums opacity-80 ${activo ? 'text-inherit' : 'text-muted-foreground'}`}>{stats.conteoPorEstado[estado]}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => onFilterChange(null)}
          aria-pressed={filter === null}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
            filter === null
              ? "border-white/30 bg-white/10 text-foreground"
              : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current opacity-70" aria-hidden />
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