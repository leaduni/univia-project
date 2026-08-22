// Cuatro métricas rápidas del dashboard — versión compacta o con ícono
"use client"
import { BookOpen, CheckCircle, FileText, TrendingUp } from "lucide-react"
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
      icono: CheckCircle,
      label: "Cursos completados",
      valor: `${s?.cursosCompletados ?? 0}`,
      nota: s?.totalCursos ? `de ${s.totalCursos} en plan` : "carrera",
      color: "#67c765",
    },
    {
      icono: TrendingUp,
      label: "Avance de carrera",
      valor: `${s?.porcentajeProgreso ?? 0}%`,
      nota:
        s?.creditosTotales != null
          ? `${s.creditosAprobados ?? 0}/${s.creditosTotales} crs`
          : "créditos",
      color: "#b5abfc",
    },
    {
      icono: BookOpen,
      label: "Cursos activos",
      valor: `${s?.cursosEnProgreso ?? 0}`,
      nota: "este ciclo",
      color: "#7cb8e4",
    },
    {
      icono: FileText,
      label: "Evaluaciones rendidas",
      valor: `${s?.evaluacionesRendidas ?? 0}`,
      nota:
        s?.evaluacionesRendidas
          ? `${s.evaluacionesAprobadas ?? 0} ok`
          : "0 rendidas",
      color: "#f0b269",
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
              className="bg-[var(--glass-base)] backdrop-blur-sm border border-[var(--glass-border)] shadow-[var(--glow-subtle)] rounded-2xl p-3.5 flex flex-col justify-between min-h-[86px] transition-all duration-300 ease-out hover:bg-[var(--glass-hover)] hover:border-[var(--glass-border-h)] hover:shadow-[var(--glow-violet-h)] hover:-translate-y-0.5 anim-up"
            >
              {isLoading ? (
                <>
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-6 w-10 bg-muted animate-pulse rounded mt-2" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#e9e9ed]/55">
                    <Icono className="w-3.5 h-3.5 shrink-0" style={{ color: m.color }} />
                    <span className="truncate">{m.label}</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-1">
                    <span className="font-poppins font-bold text-2xl text-[#e9e9ed]">{m.valor}</span>
                    <span className="text-[10px] text-[#e9e9ed]/45 truncate">{m.nota}</span>
                  </div>
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
            className="bg-[var(--glass-base)] backdrop-blur-sm border border-[var(--glass-border)] shadow-[var(--glow-subtle)] rounded-2xl p-4 flex items-start gap-3.5 transition-all duration-300 ease-out hover:bg-[var(--glass-hover)] hover:border-[var(--glass-border-h)] hover:shadow-[var(--glow-violet-h)] hover:-translate-y-0.5 anim-up"
          >
            <div
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-[#161826]"
              style={{ color: m.color }}
            >
              <Icono className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="h-7 w-16 bg-muted animate-pulse rounded mb-1" />
              ) : (
                <div className="font-poppins text-2xl font-bold text-[#e9e9ed]">{m.valor}</div>
              )}
              <div className="text-xs text-[#e9e9ed]/70 font-medium flex items-center gap-1.5">
                <Icono className="w-3.5 h-3.5 shrink-0" style={{ color: m.color }} />
                <span>{m.label}</span>
              </div>
              <div className="text-[11px] text-[#e9e9ed]/45 mt-0.5">{m.nota}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
