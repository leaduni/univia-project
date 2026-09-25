"use client"

// Columna izquierda del foro (Fase 5): accesos rápidos, categorías/facultades
// y tendencias. En móvil se muestra debajo del feed.

import { CategoryFilter } from "./category-filter"
import { QuickNav } from "./quick-nav"
import { TrendingWidget } from "./trending-widget"

const CARD =
  "relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.02] shadow-2xl shadow-black/20 backdrop-blur-xl"

export function ForoSidebarLeft() {
  return (
    <div className="space-y-4">
      {/* Navegación principal */}
      <section className={`${CARD} p-2.5`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
        <QuickNav />
      </section>

      {/* Comunidades / categorías */}
      <section className={`${CARD} max-h-[45vh] overflow-y-auto p-4 custom-scrollbar`}>
        <CategoryFilter />
      </section>

      {/* Tendencias */}
      <section className={`${CARD} p-4`}>
        <TrendingWidget />
      </section>
    </div>
  )
}
