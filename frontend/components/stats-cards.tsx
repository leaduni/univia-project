// Cuatro métricas rápidas del dashboard — versión compacta o con ícono
"use client"
import { BookOpen, CheckCircle2, ClipboardCheck, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DashboardMetricas {
  cursosCompletados: number
  cursosEnProgreso: number
  totalCursos: number
  porcentajeProgreso: number
  creditosAprobados?: number
  creditosTotales?: number
  evaluacionesRendidas?: number
  evaluacionesAprobadas?: number
}

interface StatsCardsProps {
  stats: DashboardMetricas | null
  isLoading: boolean
  compact?: boolean
}

/**
 * Las cuatro métricas del mockup. `nota` explica la cifra: un número sin
 * contexto ("12") no dice si es mucho o poco.
 */
function construirMetricas(s: DashboardMetricas | null) {
  return [
    {
      icono: CheckCircle2,
      label: "Cursos completados",
      valor: `${s?.cursosCompletados ?? 0}`,
      nota: s?.totalCursos ? `de ${s.totalCursos} en tu plan` : "de tu carrera",
      color: "text-accent",
    },
    {
      icono: TrendingUp,
      label: "Avance de carrera",
      valor: `${s?.porcentajeProgreso ?? 0}%`,
      // El avance se mide en créditos (RF-07), no en cantidad de cursos.
      nota:
        s?.creditosTotales != null
          ? `${s.creditosAprobados ?? 0} de ${s.creditosTotales} créditos`
          : "sobre los créditos del plan",
      color: "text-primary",
    },
    {
      icono: BookOpen,
      label: "Cursos activos",
      valor: `${s?.cursosEnProgreso ?? 0}`,
      nota: "este ciclo",
      color: "text-accent",
    },
    {
      icono: ClipboardCheck,
      label: "Evaluaciones rendidas",
      valor: `${s?.evaluacionesRendidas ?? 0}`,
      nota:
        s?.evaluacionesRendidas
          ? `${s.evaluacionesAprobadas ?? 0} aprobadas`
          : "aún no rindes ninguna",
      color: "text-primary",
    },
  ]
}

export function StatsCards({ stats, isLoading, compact }: StatsCardsProps) {
  const metricas = construirMetricas(stats)

  if (compact) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metricas.map((m) => {
          const Icono = m.icono
          return (
            <div
              key={m.label}
              className="bg-card border border-border p-3 rounded-2xl flex flex-col justify-between h-20"
            >
              {isLoading ? (
                <>
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-5 w-10 bg-muted animate-pulse rounded" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Icono className={cn("w-3.5 h-3.5 shrink-0", m.color)} />
                    <span className="truncate">{m.label}</span>
                  </div>
                  <span className="font-heading text-xl font-bold text-foreground">{m.valor}</span>
                </>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricas.map((m) => {
        const Icono = m.icono
        return (
          <div
            key={m.label}
            className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 transition-colors hover:border-accent/40"
          >
            <div className="shrink-0 w-12 h-12 rounded-xl gradient-brand-br flex items-center justify-center">
              <Icono className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
              ) : (
                <div className="font-heading text-2xl font-bold text-foreground">{m.valor}</div>
              )}
              <div className="text-sm text-muted-foreground">{m.label}</div>
              <div className="text-xs text-muted-foreground/70 mt-0.5">{m.nota}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
