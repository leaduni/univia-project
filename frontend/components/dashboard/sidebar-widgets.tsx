// Panel lateral del dashboard: avance, logros y accesos rápidos
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

const RADIO = 50
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

const ICONOS_LOGRO = [Flag, Flame, Zap, Trophy]

function AvanceDonut({ stats, isLoading }: { stats: DashboardMetricas | null; isLoading: boolean }) {
  const pct = stats?.porcentajeProgreso ?? 0
  const offset = CIRCUNFERENCIA - (Math.min(pct, 100) / 100) * CIRCUNFERENCIA

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="font-heading text-sm font-semibold text-foreground mb-4">Avance de carrera</h3>
      {isLoading ? (
        <div className="flex items-center gap-4">
          <div className="w-[120px] h-[120px] rounded-full bg-muted animate-pulse shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            className="shrink-0"
            role="img"
            aria-label={`${pct}% de avance de carrera`}
          >
            <circle
              cx="60"
              cy="60"
              r={RADIO}
              fill="none"
              className="stroke-muted"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r={RADIO}
              fill="none"
              stroke="url(#donutMarca)"
              strokeWidth="10"
              strokeDasharray={CIRCUNFERENCIA}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
            <defs>
              {/* Las paradas leen los tokens de marca, no hexadecimales
                  sueltos: si cambia la paleta, el donut la sigue. */}
              <linearGradient id="donutMarca" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--brand-magenta)" />
                <stop offset="100%" stopColor="var(--brand-violet)" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <div className="font-heading text-2xl font-bold text-foreground">{pct}%</div>
            {/* Créditos, no cursos: el texto anterior decía "créditos" pero
                mostraba el conteo de cursos, dos cifras distintas. */}
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.creditosTotales
                ? `${stats.creditosAprobados ?? 0} de ${stats.creditosTotales} créditos aprobados`
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
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-heading font-semibold text-foreground text-base">Tus logros</h3>
        <span className="text-xs text-muted-foreground font-medium">
          {isLoading ? "..." : `${desbloqueados} de ${logros.length}`}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                <div className="h-2 w-32 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : logros.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Todavía no hay logros disponibles.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {logros.slice(0, 4).map((logro, i) => {
            const Icono = ICONOS_LOGRO[i % ICONOS_LOGRO.length]
            return (
              <div
                key={logro.id}
                className={cn("flex items-center gap-3", !logro.unlocked && "opacity-40")}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    logro.unlocked ? "gradient-brand-br" : "bg-muted border border-border",
                  )}
                >
                  <Icono
                    className={cn(
                      "w-5 h-5",
                      logro.unlocked ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-foreground leading-tight truncate">
                    {logro.nombre}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">{logro.descripcion}</p>
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
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Acceso rápido</h3>
      <div className="space-y-2">
        <Link
          href="/recursos?tipo=Examen"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
        >
          <Search className="w-4 h-4 text-accent shrink-0" />
          <span className="text-sm text-foreground">Buscar exámenes pasados</span>
        </Link>
        <Link
          href="/malla"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
        >
          <BookOpen className="w-4 h-4 text-accent shrink-0" />
          <span className="text-sm text-foreground">Revisar mi malla</span>
        </Link>
        {/* Sin destino hasta la Fase 4: se muestra apagada en vez de ser un
            botón que no responde. */}
        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/20 cursor-default">
          <Sparkles className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          <span className="text-sm text-muted-foreground/50">Generar evaluación con IA</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/70">
            pronto
          </span>
        </div>
      </div>
    </div>
  )
}

export function SidebarWidgets({ stats, logros, isLoading }: SidebarWidgetsProps) {
  return (
    <div className="space-y-6">
      <AvanceDonut stats={stats} isLoading={isLoading} />
      <Logros logros={logros} isLoading={isLoading} />
      <AccesosRapidos />
    </div>
  )
}
