// Riel calibrado: avance hacia la meta leído como un instrumento de medición.
"use client"

import { formatearSoles, formatearSolesCorto } from "./constantes"
import type { ResumenDonaciones } from "@/lib/donaciones-service"

interface RielMetaProps {
  resumen: ResumenDonaciones | null
  cargando: boolean
}

// Hitos del riel. Son cuartos de la meta: no es decoración, marca cuánto falta.
const HITOS = [0, 0.25, 0.5, 0.75, 1]

export function RielMeta({ resumen, cargando }: RielMetaProps) {
  if (cargando) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-card/60 p-6 sm:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-4 w-full animate-pulse rounded-full bg-muted" />
      </div>
    )
  }

  if (!resumen) return null

  const avance = Math.min(Math.max(resumen.porcentaje, 0), 100)
  const restante = Math.max(resumen.meta - resumen.recaudado, 0)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-6 sm:p-8">
      <div
        className="pointer-events-none absolute -top-24 left-1/3 h-56 w-56 rounded-full bg-[#7957f1]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Recaudado
          </p>
          <p className="font-heading text-4xl sm:text-5xl font-bold tabular-nums text-foreground">
            {formatearSoles(resumen.recaudado)}
          </p>
        </div>

        <dl className="flex items-end gap-6 sm:gap-8">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Meta
            </dt>
            <dd className="font-heading text-xl font-bold tabular-nums text-foreground">
              {formatearSolesCorto(resumen.meta)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Falta
            </dt>
            <dd className="font-heading text-xl font-bold tabular-nums text-[#c4b5fd]">
              {formatearSolesCorto(restante)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Donantes
            </dt>
            <dd className="font-heading text-xl font-bold tabular-nums text-foreground">
              {resumen.total_donantes}
            </dd>
          </div>
        </dl>
      </div>

      {/* El riel: pista con graduación grabada encima del relleno. */}
      <div className="relative mt-7">
        <div
          className="relative h-5 w-full overflow-hidden rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/[0.07]"
          role="progressbar"
          aria-valuenow={avance}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avance hacia la meta de recaudación"
        >
          <div
            className="h-full rounded-full gradient-brand transition-[width] duration-1000 ease-out motion-reduce:transition-none"
            style={{ width: `${avance}%` }}
          />
          {/* Graduación cada 5%: convierte la barra en una regla legible. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 5%)",
            }}
            aria-hidden="true"
          />
        </div>

        {/* Marca de posición actual. */}
        <div
          className="pointer-events-none absolute -top-1.5 h-8 w-0.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)] transition-[left] duration-1000 ease-out motion-reduce:transition-none"
          style={{ left: `calc(${avance}% - 1px)` }}
          aria-hidden="true"
        />

        <div className="mt-3 flex justify-between">
          {HITOS.map((hito) => (
            <span
              key={hito}
              className="text-[10px] font-semibold tabular-nums text-muted-foreground/70"
            >
              {formatearSolesCorto(resumen.meta * hito)}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        <span className="font-bold text-foreground tabular-nums">{avance}%</span> de la meta ·{" "}
        {resumen.total_donaciones}{" "}
        {resumen.total_donaciones === 1 ? "aporte" : "aportes"} registrados
      </p>
    </div>
  )
}
