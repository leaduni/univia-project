// Dashboard 4-metric cards — compact (inline) or standard (gradient icons)
"use client"
import { CheckCircle, CheckCircle2, TrendingUp, Award, BookOpen } from "lucide-react"

interface StatsCardsProps {
  stats: any
  isLoading: boolean
  compact?: boolean
}

const COMPACT_CONFIG = [
  { icon: CheckCircle2, color: "text-emerald-400", label: "Cursos completados", getValue: (s: any) => `${s?.cursosCompletados ?? 0}` },
  { icon: TrendingUp, color: "text-indigo-400", label: "Avance de carrera", getValue: (s: any) => `${s?.porcentajeProgreso ?? 0}%` },
  { icon: BookOpen, color: "text-sky-400", label: "Cursos activos", getValue: (s: any) => `${s?.cursosEnProgreso ?? 0}` },
  { icon: Award, color: "text-amber-400", label: "Promedio actual", getValue: (s: any) => `${s?.promedioPonderado ?? "—"}` },
]

function MetricCard({ icon: Icon, value, label, footnote, gradient, isLoading }: any) {
  return (
    <div className="bg-[#151428] border border-[#262444] rounded-xl p-5 flex items-start gap-4 transition-all duration-200 hover:border-white/20">
      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${gradient}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="h-8 w-16 bg-white/10 animate-pulse rounded mb-1" />
        ) : (
          <div className="text-2xl font-bold text-white">{value}</div>
        )}
        <div className="text-sm text-white/70">{label}</div>
        <div className="text-xs text-white/40 mt-0.5">{footnote}</div>
      </div>
    </div>
  )
}

export function StatsCards({ stats, isLoading, compact }: StatsCardsProps) {
  if (compact) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {COMPACT_CONFIG.map((m, i) => {
          const Icon = m.icon
          return (
            <div
              key={i}
              className="bg-[#14132a]/80 border border-[#27244a] p-3 rounded-2xl flex flex-col justify-between h-20 shadow-md"
            >
              {isLoading ? (
                <>
                  <div className="h-3 w-16 bg-white/10 animate-pulse rounded" />
                  <div className="h-5 w-10 bg-white/10 animate-pulse rounded" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                    <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                    <span className="truncate">{m.label}</span>
                  </div>
                  <span className="text-xl font-black text-white">{m.getValue(stats)}</span>
                </>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const metrics = [
    {
      value: `${stats?.cursosCompletados ?? 0}`,
      label: "Cursos completados",
      footnote: "De tu carrera",
      icon: CheckCircle,
      gradient: "gradient-course-1",
    },
    {
      value: `${stats?.porcentajeProgreso ?? 0}%`,
      label: "Avance de carrera",
      footnote: `${stats?.cursosCompletados ?? 0} de ${stats?.totalCursos ?? "—"} créditos`,
      icon: TrendingUp,
      gradient: "gradient-course-2",
    },
    {
      value: `${stats?.cursosEnProgreso ?? 0}`,
      label: "Cursos activos",
      footnote: "Este semestre",
      icon: BookOpen,
      gradient: "gradient-course-4",
    },
    {
      value: `${stats?.promedioPonderado ?? "—"}`,
      label: "Promedio actual",
      footnote: "Basado en tus notas",
      icon: Award,
      gradient: "gradient-course-3",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, i) => (
        <MetricCard key={i} {...m} isLoading={isLoading} />
      ))}
    </div>
  )
}
