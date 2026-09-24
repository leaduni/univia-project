// Transparencia leída como un estado de cuenta, no como tarjetas de métrica.
"use client"

import { formatearSoles } from "./constantes"
import type { ResumenDonaciones } from "@/lib/donaciones-service"

interface LibroCajaProps {
  resumen: ResumenDonaciones | null
  cargando: boolean
}

export function LibroCaja({ resumen, cargando }: LibroCajaProps) {
  if (cargando) {
    return (
      <section className="rounded-3xl border border-white/[0.08] bg-card/60 p-6 space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-24 w-full animate-pulse rounded bg-muted" />
      </section>
    )
  }

  if (!resumen) return null

  const fecha = new Date(resumen.actualizado_en).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-6">
      <header className="flex items-baseline justify-between gap-3 border-b border-white/[0.08] pb-3">
        <h2 className="font-heading text-base font-bold text-foreground">Libro de caja</h2>
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          al {fecha}
        </span>
      </header>

      <dl className="mt-1 divide-y divide-white/[0.06]">
        <Renglon etiqueta="Ingresos" valor={resumen.recaudado} signo="+" tono="text-emerald-300" />
        <Renglon etiqueta="Egresos" valor={resumen.gastado} signo="−" tono="text-rose-300" />
      </dl>

      <div className="mt-1 flex items-baseline justify-between border-t-2 border-white/[0.12] pt-3">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">
          Saldo
        </span>
        <span className="font-heading text-2xl font-bold tabular-nums gradient-brand-text">
          {formatearSoles(resumen.caja_neto)}
        </span>
      </div>

      {resumen.destino_aporte && (
        <p className="mt-4 border-l-2 border-[#7957f1]/40 pl-3 text-xs leading-relaxed text-muted-foreground">
          {resumen.destino_aporte}
        </p>
      )}
    </section>
  )
}

function Renglon({
  etiqueta,
  valor,
  signo,
  tono,
}: {
  etiqueta: string
  valor: number
  signo: string
  tono: string
}) {
  return (
    <div className="flex items-baseline justify-between py-2.5">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className={`font-heading text-sm font-bold tabular-nums ${tono}`}>
        {signo} {formatearSoles(valor)}
      </dd>
    </div>
  )
}
