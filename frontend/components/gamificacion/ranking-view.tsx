// Vista de ranking (global o semanal): podio Top 3, tabla paginada por cursor
// keyset y tarjeta destacada de la posición del usuario autenticado.
"use client"

import { useCallback, useEffect, useState } from "react"
import { Trophy, Loader2, ChevronDown, Flame, Zap, Users, Crown } from "lucide-react"
import { gamificacionService } from "@/lib/gamificacion-service"
import { formatearXp, podioDePuesto } from "@/lib/gamificacion-utils"
import type { EntradaRanking, MiPosicionRanking, PeriodoRanking, RespuestaRanking } from "@/types/gamificacion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const LIMITE_PAGINA = 20

const PERIODOS: { valor: PeriodoRanking; etiqueta: string }[] = [
  { valor: "global", etiqueta: "Global" },
  { valor: "semanal", etiqueta: "Semanal" },
]

/** Iniciales del alias para el avatar cuando no hay imagen. */
function iniciales(alias?: string | null): string {
  if (!alias) return "U"
  const partes = alias.trim().split(/[\s_]+/).filter(Boolean)
  return (partes[0]?.[0] ?? "U").toUpperCase()
}

interface FilaPodioProps {
  entrada: EntradaRanking
  destacado?: boolean
  className?: string
}

function FilaPodio({ entrada, destacado, className }: FilaPodioProps) {
  const podio = podioDePuesto(entrada.puesto ?? -1)
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border bg-white/[0.04] px-4 py-5 text-center",
        podio && `bg-gradient-to-b ${podio.gradiente} bg-opacity-10`,
        destacado && "ring-2 ring-[#7957f1]/60 shadow-[0_0_20px_rgba(121,87,241,0.25)]",
        className,
      )}
    >
      <span className="text-3xl" aria-hidden="true">{podio?.medalla ?? entrada.puesto}</span>
      <Avatar className="size-14 ring-2 ring-white/[0.12]">
        <AvatarImage src={entrada.avatar_url ?? undefined} alt={entrada.alias_publico} />
        <AvatarFallback className="gradient-brand-br text-primary-foreground font-semibold">
          {iniciales(entrada.alias_publico)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground text-sm" title={entrada.alias_publico}>
          {entrada.alias_publico}
        </p>
        <p className="text-xs text-muted-foreground">Nivel {entrada.nivel}</p>
      </div>
      <p className="flex items-center gap-1 text-sm font-bold tabular-nums text-foreground">
        <Zap className="w-3.5 h-3.5 text-[#7957f1]" aria-hidden="true" />
        {formatearXp(entrada.xp_total)} XP
      </p>
    </div>
  )
}

function EsqueletoFila() {
  return (
    <div className="flex items-center gap-4 py-3 animate-pulse" aria-hidden="true">
      <div className="h-5 w-8 rounded bg-white/[0.08]" />
      <div className="h-8 w-8 rounded-full bg-white/[0.08]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-white/[0.08]" />
        <div className="h-3 w-1/4 rounded bg-white/[0.08]" />
      </div>
      <div className="h-4 w-16 rounded bg-white/[0.08]" />
    </div>
  )
}

export function RankingView() {
  const [periodo, setPeriodo] = useState<PeriodoRanking>("global")
  const [items, setItems] = useState<EntradaRanking[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [tieneMas, setTieneMas] = useState(false)
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [miPosicion, setMiPosicion] = useState<MiPosicionRanking | null>(null)

  const cargarPrimeraPagina = useCallback((p: PeriodoRanking) => {
    setCargandoInicial(true)
    setError(null)
    setItems([])
    setMiPosicion(null)
    Promise.all([
      gamificacionService.getRanking(p, LIMITE_PAGINA),
      gamificacionService.getMiPosicion(p).catch(() => null),
    ])
      .then(([resp, posicion]) => {
        setItems(resp.items)
        setNextCursor(resp.next_cursor)
        setTieneMas(resp.tiene_mas)
        setMiPosicion(posicion)
      })
      .catch((err: Error) => setError(err.message || "No se pudo cargar el ranking."))
      .finally(() => setCargandoInicial(false))
  }, [])

  useEffect(() => {
    cargarPrimeraPagina(periodo)
  }, [periodo, cargarPrimeraPagina])

  const cargarMas = async () => {
    if (!nextCursor || cargandoMas) return
    setCargandoMas(true)
    try {
      const resp: RespuestaRanking = await gamificacionService.getRanking(periodo, LIMITE_PAGINA, nextCursor)
      setItems((prev) => [...prev, ...resp.items])
      setNextCursor(resp.next_cursor)
      setTieneMas(resp.tiene_mas)
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar más resultados.")
    } finally {
      setCargandoMas(false)
    }
  }

  const podio = items.slice(0, 3)
  const resto = items.slice(3)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-foreground">
            <Trophy className="w-6 h-6 text-amber-400" aria-hidden="true" />
            Ranking UniVia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compite por XP acumulando rachas, check-ins y evaluaciones.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.05] p-1" role="tablist" aria-label="Periodo del ranking">
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              role="tab"
              aria-selected={periodo === p.valor}
              onClick={() => setPeriodo(p.valor)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200",
                periodo === p.valor
                  ? "bg-gradient-to-r from-[#7957f1] to-[#a6249d] text-white shadow-[0_0_14px_rgba(121,87,241,0.35)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
      </header>

      {/* Tarjeta destacada: mi posición */}
      <Card className="overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#7957f1]/10 via-transparent to-[#d93340]/10 pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="w-5 h-5 text-amber-400" aria-hidden="true" />
            Tu posición
          </CardTitle>
          <CardDescription>En el ranking {periodo === "global" ? "global" : "semanal"}.</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {cargandoInicial ? (
            <div className="h-10 animate-pulse rounded-xl bg-white/[0.06]" aria-hidden="true" />
          ) : miPosicion ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-10 ring-2 ring-[#7957f1]/40">
                  <AvatarImage src={miPosicion.avatar_url ?? undefined} alt={miPosicion.alias_publico ?? undefined} />
                  <AvatarFallback className="gradient-brand-br text-primary-foreground font-semibold">
                    {iniciales(miPosicion.alias_publico)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{miPosicion.alias_publico ?? "Tú"}</p>
                  <p className="text-xs text-muted-foreground">Nivel {miPosicion.nivel}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 tabular-nums">
                <Zap className="w-4 h-4 text-[#7957f1]" aria-hidden="true" />
                <span className="font-bold text-foreground">{formatearXp(miPosicion.xp_total)}</span>
                <span className="text-xs text-muted-foreground">XP</span>
              </div>
              <div className="ml-auto rounded-xl border border-[#5b8bf7]/30 bg-white/[0.05] px-4 py-2 text-center">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Puesto</span>
                <span className="font-heading text-xl font-bold tabular-nums text-foreground">
                  {miPosicion.puesto != null ? `#${miPosicion.puesto}` : "—"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no apareces en el ranking. Gana XP para posicionarte.</p>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Podio Top 3 */}
      <section aria-label="Los tres primeros puestos">
        {cargandoInicial ? (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-white/[0.06]" aria-hidden="true" />
            ))}
          </div>
        ) : podio.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Users className="w-5 h-5" aria-hidden="true" />
              <p className="text-sm">Todavía no hay participantes con XP en este periodo.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end">
            {/* 2º a la izquierda, algo más bajo */}
            <FilaPodio entrada={podio[1]} className="order-1 sm:-translate-y-1" />
            {/* 1º en el centro, destacado y más alto */}
            <FilaPodio entrada={podio[0]} destacado className="order-2 sm:-translate-y-3" />
            {/* 3º a la derecha */}
            <FilaPodio entrada={podio[2]} className="order-3 sm:-translate-y-1" />
          </div>
        )}
      </section>

      {/* Tabla del resto (puesto 4 en adelante) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Clasificación completa</CardTitle>
          <CardDescription>
            {periodo === "global" ? "Todos los tiempos" : "Solo el avance de esta semana"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {cargandoInicial ? (
            <div className="divide-y divide-white/[0.07] px-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <EsqueletoFila key={i} />
              ))}
            </div>
          ) : resto.length === 0 && podio.length > 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              El resto de participantes aparecen aquí a medida que ganan XP.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.07]">
              {resto.map((entrada) => (
                <li key={`${entrada.puesto}-${entrada.alias_publico}`} className="flex items-center gap-4 py-3">
                  <span className="w-8 text-center font-heading font-bold tabular-nums text-muted-foreground">
                    {entrada.puesto}
                  </span>
                  <Avatar className="size-8 ring-1 ring-white/[0.1]">
                    <AvatarImage src={entrada.avatar_url ?? undefined} alt={entrada.alias_publico} />
                    <AvatarFallback className="bg-white/[0.08] text-foreground text-xs font-semibold">
                      {iniciales(entrada.alias_publico)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground" title={entrada.alias_publico}>
                      {entrada.alias_publico}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Flame className="w-3 h-3 text-amber-400" aria-hidden="true" />
                      Nivel {entrada.nivel}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 font-semibold tabular-nums text-foreground">
                    <Zap className="w-3.5 h-3.5 text-[#7957f1]" aria-hidden="true" />
                    {formatearXp(entrada.xp_total)} XP
                  </span>
                </li>
              ))}
            </ul>
          )}

          {tieneMas && !cargandoInicial && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={cargarMas}
                disabled={cargandoMas}
                aria-busy={cargandoMas}
              >
                {cargandoMas ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Cargando…
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    Ver más
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}