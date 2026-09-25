"use client"

// Cabecera sticky del feed: buscador con debounce (lo aplica useForoFeed),
// selector de ordenamiento y CTA "+ Nuevo hilo".

import { Search, X } from "lucide-react"
import type { OrdenFeed } from "@/types/foro"
import { cn } from "@/lib/utils"

interface FeedHeaderProps {
  busqueda: string
  onBusqueda: (valor: string) => void
  orden: OrdenFeed
  onOrden: (orden: OrdenFeed) => void
  onNuevoHilo: () => void
}

const ORDENES: { valor: OrdenFeed; etiqueta: string; icono?: React.ReactNode }[] = [
  {
    valor: "recientes",
    etiqueta: "Recientes",
    icono: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="12" r="8" />
        <path strokeLinecap="round" d="M12 8v4l2.5 2" />
      </svg>
    ),
  },
  {
    valor: "comentados",
    etiqueta: "Comentados",
    icono: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 6h14M5 12h9M5 18h6" />
      </svg>
    ),
  },
  {
    valor: "tendencia",
    etiqueta: "Tendencia",
    icono: <span className="text-amber-400/70">♨</span>,
  },
]

export function FeedHeader({ busqueda, onBusqueda, orden, onOrden, onNuevoHilo }: FeedHeaderProps) {
  return (
    // Sticky: se ancla bajo el header del dashboard al hacer scroll. El fondo
    // debe ser casi opaco para que los posts al pasar por debajo no se vean
    // por transparencia; mb-6 deja aire claro antes de la primera tarjeta.
    <div className="sticky top-24 z-20 mb-6">
      <div className="rounded-2xl border border-white/[0.08] bg-[#090a12]/90 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <div className="flex gap-2">
          {/* Search */}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => onBusqueda(e.target.value)}
              placeholder="Buscar en el foro..."
              aria-label="Buscar en el foro"
              className="
                h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.03]
                pl-10 pr-8 text-sm text-white placeholder:text-white/25 outline-none
                transition focus:border-violet-400/25 focus:bg-white/[0.045]
                focus:ring-4 focus:ring-violet-500/[0.07]
              "
            />
            {busqueda && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => onBusqueda("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/30 transition-colors hover:text-white/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* New thread */}
          <button
            type="button"
            onClick={onNuevoHilo}
            className="
              inline-flex h-10 shrink-0 items-center gap-2 rounded-xl
              border border-fuchsia-300/20 bg-gradient-to-r from-fuchsia-500 to-violet-500
              px-4 text-sm font-semibold text-white
              shadow-[0_8px_25px_rgba(217,70,239,0.20)]
              transition-all duration-200
              hover:-translate-y-0.5 hover:border-fuchsia-200/30
              hover:shadow-[0_12px_35px_rgba(217,70,239,0.30)]
              active:translate-y-0
            "
          >
            <span className="text-lg leading-none">+</span>
            <span className="hidden sm:inline">Nuevo hilo</span>
          </button>
        </div>

        {/* Feed filters */}
        <div className="mt-2 flex items-center gap-1 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Ordenar feed">
          {ORDENES.map(({ valor, etiqueta, icono }) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={orden === valor}
              onClick={() => onOrden(valor)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] transition",
                orden === valor
                  ? "border border-violet-400/20 bg-violet-500/[0.10] font-medium text-violet-300"
                  : "border border-transparent text-white/40 hover:bg-white/[0.04] hover:text-white/70",
              )}
            >
              {icono}
              {etiqueta}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
