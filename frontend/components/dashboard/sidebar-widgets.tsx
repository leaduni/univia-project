// Panel lateral del dashboard: avance de carrera, logros y accesos rápidos
"use client"

import Link from "next/link"
import { BookOpen, Flag, Flame, Search, Sparkles, Trophy, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DashboardMetricas } from "../stats-cards"

interface Logro {
  id: string | number
  nombre: string
  descripcion: string
  icon: string
  unlocked: boolean
  unlocked_at: string | null
}

interface SidebarWidgetsProps {
  stats: DashboardMetricas | null
  logros: Logro[]
  isLoading: boolean
}

const RADIO = 36
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

const ICONOS_LOGRO = [Flag, Flame, Zap, Trophy]

function AvanceDonut({ stats, isLoading }: { stats: DashboardMetricas | null; isLoading: boolean }) {
  const pct = stats?.porcentajeProgreso ?? 0
  const offset = CIRCUNFERENCIA - (Math.min(pct, 100) / 100) * CIRCUNFERENCIA

  return (
    <div className="p-5 rounded-xl bg-[#232532] border border-[#3f424d] mb-4">
      <h3 className="font-poppins text-[14.5px] font-semibold text-[#e9e9ed] mb-4">Avance de carrera</h3>
      {isLoading ? (
        <div className="flex items-center gap-4">
          <div className="w-[88px] h-[88px] rounded-full bg-muted animate-pulse shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-16 bg-muted animate-pulse rounded" />
            <div className="h-3 w-28 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 w-[88px] h-[88px] flex items-center justify-center">
            <svg
              width="88"
              height="88"
              viewBox="0 0 88 88"
              className="shrink-0"
              role="img"
              aria-label={`${pct}% de avance de carrera`}
            >
              <circle
                cx="44"
                cy="44"
                r={RADIO}
                fill="none"
                stroke="#2e3142"
                strokeWidth="7"
              />
              <circle
                cx="44"
                cy="44"
                r={RADIO}
                fill="none"
                stroke="url(#uvGrad)"
                strokeWidth="7"
                strokeDasharray={CIRCUNFERENCIA}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 44 44)"
              />
              <defs>
                <linearGradient id="uvGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a6249d" />
                  <stop offset="100%" stopColor="#7957f1" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute font-poppins font-bold text-[19px] text-[#e9e9ed]">
              {pct}%
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#e9e9ed]/65 leading-relaxed">
              {stats?.creditosTotales
                ? `${stats.creditosAprobados ?? 0} de ${stats.creditosTotales} créditos aprobados en tu plan`
                : `${stats?.cursosCompletados ?? 0} de ${stats?.totalCursos ?? 0} cursos aprobados`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function Logros({ logros, isLoading }: { logros: Logro[]; isLoading: boolean }) {
  const desbloqueados = logros.filter((l) => l.unlocked).length

  return (
    <div className="p-5 rounded-xl bg-[#232532] border border-[#3f424d] mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-poppins text-[14.5px] font-semibold text-[#e9e9ed]">Tus logros</h3>
        <span className="text-xs text-[#e9e9ed]/50 font-medium">
          {isLoading ? "..." : `${desbloqueados} de ${logros.length}`}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-[36px] h-[36px] rounded-lg bg-muted animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                <div className="h-2 w-32 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : logros.length === 0 ? (
        <p className="text-xs text-[#e9e9ed]/50">
          Todavía no hay logros disponibles.
        </p>
      ) : (
        <div className="space-y-3">
          {logros.slice(0, 4).map((logro, i) => {
            const Icono = ICONOS_LOGRO[i % ICONOS_LOGRO.length]
            return (
              <div
                key={logro.id}
                className={cn("flex items-center gap-3", !logro.unlocked && "opacity-45")}
              >
                <div
                  className={cn(
                    "w-[36px] h-[36px] rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                    logro.unlocked
                      ? "bg-gradient-to-br from-[#a6249d] to-[#7957f1] text-white opacity-100"
                      : "bg-[#e9e9ed]/7 text-[#e9e9ed]/50 border border-[#3f424d]/40",
                  )}
                >
                  <Icono className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-medium text-[#e9e9ed] leading-tight truncate">
                    {logro.nombre}
                  </h4>
                  <p className="text-[11.5px] text-[#e9e9ed]/50 line-clamp-1">{logro.descripcion}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AccesosRapidos() {
  return (
    <div className="p-5 rounded-xl bg-[#232532] border border-[#3f424d]">
      <h3 className="font-poppins text-[14.5px] font-semibold text-[#e9e9ed] mb-3">Accesos rápidos</h3>
      <div className="space-y-1">
        <Link
          href="/recursos?tipo=Examen"
          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#7957f1]/12 transition-colors text-left group"
        >
          <Search className="w-4 h-4 text-[#7957f1] shrink-0 group-hover:scale-110 transition-transform" />
          <span className="text-xs text-[#e9e9ed] font-medium">Buscar exámenes pasados</span>
        </Link>
        <Link
          href="/malla"
          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#7957f1]/12 transition-colors text-left group"
        >
          <BookOpen className="w-4 h-4 text-[#7957f1] shrink-0 group-hover:scale-110 transition-transform" />
          <span className="text-xs text-[#e9e9ed] font-medium">Revisar mi malla</span>
        </Link>
        <div className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#e9e9ed]/5 cursor-default">
          <Sparkles className="w-4 h-4 text-[#e9e9ed]/40 shrink-0" />
          <span className="text-xs text-[#e9e9ed]/40 font-medium">Generar evaluación con IA</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-[#3f424d]/60 text-[#e9e9ed]/50">
            pronto
          </span>
        </div>
      </div>
    </div>
  )
}

export function SidebarWidgets({ stats, logros, isLoading }: SidebarWidgetsProps) {
  return (
    <div>
      <AvanceDonut stats={stats} isLoading={isLoading} />
      <Logros logros={logros} isLoading={isLoading} />
      <AccesosRapidos />
    </div>
  )
}
