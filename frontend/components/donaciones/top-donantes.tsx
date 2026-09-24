// Cuadro de honor a ancho completo: podio de tres y tabla de posiciones.
"use client"

import { formatearSoles } from "./constantes"
import type { DonanteTop } from "@/lib/donaciones-service"

interface TopDonantesProps {
  donantes: DonanteTop[]
  cargando: boolean
}

// Metales del podio. Se usan solo aquí: son el único sitio de la app donde el
// puesto, y no la marca, define el color.
const METALES = {
  1: {
    medalla: "🥇",
    anillo: "ring-[#f5c451]/60",
    fondo: "from-[#f5c451]/20 to-[#f5c451]/[0.04]",
    texto: "text-[#f5c451]",
  },
  2: {
    medalla: "🥈",
    anillo: "ring-[#cbd5e1]/50",
    fondo: "from-[#cbd5e1]/16 to-[#cbd5e1]/[0.03]",
    texto: "text-[#cbd5e1]",
  },
  3: {
    medalla: "🥉",
    anillo: "ring-[#d08c52]/50",
    fondo: "from-[#d08c52]/18 to-[#d08c52]/[0.03]",
    texto: "text-[#d08c52]",
  },
} as const

export function TopDonantes({ donantes, cargando }: TopDonantesProps) {
  if (cargando) {
    return (
      <section className="rounded-3xl border border-white/[0.08] bg-card/60 p-6 sm:p-8">
        <div className="h-6 w-44 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </section>
    )
  }

  const podio = donantes.slice(0, 3)
  const resto = donantes.slice(3)

  // El podio se ordena 2º-1º-3º en escritorio, como en un podio real. En móvil
  // se deja 1-2-3 porque en columna el orden de lectura manda sobre la metáfora.
  const ordenPodio = [podio[1], podio[0], podio[2]]

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-6 sm:p-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold text-foreground">Cuadro de honor</h2>
        <p className="text-xs text-muted-foreground">
          Quienes sostienen UniVia, por aporte acumulado
        </p>
      </header>

      {donantes.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-white/[0.12] p-8 text-center text-sm text-muted-foreground">
          Todavía no hay aportes. El primero que done abre el cuadro de honor.
        </p>
      ) : (
        <>
          {/* Podio */}
          <ol className="mt-6 grid gap-3 sm:grid-cols-3 sm:items-end">
            {ordenPodio.map((donante, indice) =>
              donante ? (
                <li
                  key={`podio-${donante.puesto}`}
                  className={
                    indice === 0
                      ? "order-2 sm:order-1"
                      : indice === 1
                        ? "order-1 sm:order-2"
                        : "order-3 sm:order-3"
                  }
                >
                  <TarjetaPodio donante={donante} />
                </li>
              ) : null,
            )}
          </ol>

          {/* Posiciones restantes */}
          {resto.length > 0 && (
            <ol className="mt-3 space-y-2">
              {resto.map((donante) => (
                <li
                  key={`fila-${donante.puesto}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition-colors hover:bg-white/[0.04] sm:gap-4 sm:px-5"
                >
                  <span className="w-8 shrink-0 font-heading text-lg font-bold tabular-nums text-muted-foreground/80">
                    {donante.puesto}
                  </span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gradient-brand-br font-heading text-base font-bold text-white">
                    {donante.nombre.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-base font-semibold text-foreground">
                      {donante.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {donante.facultad ? `${donante.facultad} · ` : ""}
                      {donante.aportes} {donante.aportes === 1 ? "aporte" : "aportes"}
                    </p>
                  </div>
                  <span className="shrink-0 font-heading text-lg font-bold tabular-nums text-foreground sm:text-xl">
                    {formatearSoles(donante.total)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}

function TarjetaPodio({ donante }: { donante: DonanteTop }) {
  const metal = METALES[donante.puesto as 1 | 2 | 3] ?? METALES[3]
  const esPrimero = donante.puesto === 1

  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border border-white/[0.08] bg-gradient-to-b ${metal.fondo} px-4 text-center ${
        esPrimero ? "py-7 sm:py-9" : "py-6 sm:py-7"
      }`}
    >
      <span className={`text-3xl ${esPrimero ? "sm:text-4xl" : ""}`} aria-hidden="true">
        {metal.medalla}
      </span>
      <span className="sr-only">Puesto {donante.puesto}</span>

      <span
        className={`mt-3 flex items-center justify-center rounded-2xl gradient-brand-br font-heading font-bold text-white ring-2 ${metal.anillo} ${
          esPrimero ? "h-16 w-16 text-2xl" : "h-14 w-14 text-xl"
        }`}
      >
        {donante.nombre.charAt(0).toUpperCase()}
      </span>

      <p
        className={`mt-3 line-clamp-2 font-heading font-bold text-foreground ${
          esPrimero ? "text-lg" : "text-base"
        }`}
      >
        {donante.nombre}
      </p>

      {donante.facultad && (
        <span className="mt-1 rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {donante.facultad}
        </span>
      )}

      <p
        className={`mt-2.5 font-heading font-bold tabular-nums ${metal.texto} ${
          esPrimero ? "text-3xl" : "text-2xl"
        }`}
      >
        {formatearSoles(donante.total)}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {donante.aportes} {donante.aportes === 1 ? "aporte" : "aportes"}
      </p>
    </div>
  )
}
