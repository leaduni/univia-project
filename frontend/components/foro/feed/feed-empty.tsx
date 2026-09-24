"use client"

// Estado vacío del feed (Fase 5): mensaje contextual según filtros activos y
// CTA para crear el primer hilo.

import { MessageSquareOff } from "lucide-react"
import { Plus } from "lucide-react"

interface FeedEmptyProps {
  hayFiltros: boolean
  onNuevoHilo: () => void
  onLimpiarFiltros: () => void
}

export function FeedEmpty({ hayFiltros, onNuevoHilo, onLimpiarFiltros }: FeedEmptyProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/80 backdrop-blur-md p-10 text-center anim-up">
      <MessageSquareOff className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="font-poppins font-semibold text-foreground">
        {hayFiltros ? "Sin resultados para estos filtros" : "Aún no hay hilos aquí"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hayFiltros
          ? "Prueba ajustando la búsqueda o quitando algunos filtros."
          : "Sé la primera persona en iniciar una conversación con la comunidad."}
      </p>
      <div className="mt-5 flex items-center justify-center gap-2">
        {hayFiltros && (
          <button
            type="button"
            onClick={onLimpiarFiltros}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-foreground hover:bg-white/10 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
        <button
          type="button"
          onClick={onNuevoHilo}
          className="gradient-btn-pink-violet inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Nuevo hilo
        </button>
      </div>
    </div>
  )
}
