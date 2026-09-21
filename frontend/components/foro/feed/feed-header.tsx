"use client"

// Cabecera sticky del feed: buscador con debounce (lo aplica useForoFeed),
// selector de ordenamiento y CTA "+ Nuevo hilo" con gradiente del design system.

import { Clock, Flame, MessageSquareText, Plus, Search, X } from "lucide-react"
import type { OrdenFeed } from "@/types/foro"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface FeedHeaderProps {
  busqueda: string
  onBusqueda: (valor: string) => void
  orden: OrdenFeed
  onOrden: (orden: OrdenFeed) => void
  onNuevoHilo: () => void
}

const ORDENES: { valor: OrdenFeed; etiqueta: string; icono: typeof Clock }[] = [
  { valor: "recientes", etiqueta: "Recientes", icono: Clock },
  { valor: "comentados", etiqueta: "Comentados", icono: MessageSquareText },
  { valor: "tendencia", etiqueta: "Tendencia", icono: Flame },
]

export function FeedHeader({ busqueda, onBusqueda, orden, onOrden, onNuevoHilo }: FeedHeaderProps) {
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 sm:-mx-5 sm:px-5 py-3 bg-slate-950/60 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center gap-2.5">
        {/* Buscador */}
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            placeholder="Buscar en el foro…"
            aria-label="Buscar en el foro"
            className="h-9 rounded-xl border-white/10 bg-white/5 pl-9 pr-8 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-[#7957f1]"
          />
          {busqueda && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => onBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* CTA nuevo hilo */}
        <button
          type="button"
          onClick={onNuevoHilo}
          className="gradient-btn-pink-violet inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo hilo</span>
        </button>
      </div>

      {/* Selector de ordenamiento */}
      <div className="mt-2.5 flex items-center gap-1" role="tablist" aria-label="Ordenar feed">
        {ORDENES.map(({ valor, etiqueta, icono: Icono }) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={orden === valor}
            onClick={() => onOrden(valor)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              orden === valor
                ? "bg-[#7957f1]/15 text-[#a78bfa] border border-[#7957f1]/30"
                : "text-muted-foreground hover:bg-white/5 border border-transparent",
            )}
          >
            <Icono className="h-3.5 w-3.5" />
            {etiqueta}
          </button>
        ))}
      </div>
    </div>
  )
}
