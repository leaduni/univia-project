"use client"

// Columna izquierda del foro (Fase 5): accesos rápidos, categorías/facultades
// y tendencias. En móvil se muestra debajo del feed.

import { CategoryFilter } from "./category-filter"
import { QuickNav } from "./quick-nav"
import { TrendingWidget } from "./trending-widget"

export function ForoSidebarLeft() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-card/80 backdrop-blur-md p-3">
        <QuickNav />
      </section>
      <section className="max-h-[45vh] overflow-y-auto custom-scrollbar rounded-2xl border border-white/10 bg-card/80 backdrop-blur-md p-3">
        <CategoryFilter />
      </section>
      <section className="rounded-2xl border border-white/10 bg-card/80 backdrop-blur-md p-3">
        <TrendingWidget />
      </section>
    </div>
  )
}
