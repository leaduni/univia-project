"use client"

// Columna derecha del foro (Fase 5): perfil XP, top semanal y accesos
// rápidos. En móvil se muestra debajo del feed.

import { AccesosRapidos } from "./accesos-rapidos"
import { PerfilXpCard } from "./perfil-xp-card"
import { TopContribuidores } from "./top-contribuidores"

export function ForoSidebarRight() {
  return (
    <div className="space-y-5">
      <PerfilXpCard />
      <TopContribuidores />
      <section className="rounded-2xl border border-white/10 bg-card/80 backdrop-blur-md p-3">
        <AccesosRapidos />
      </section>
    </div>
  )
}
