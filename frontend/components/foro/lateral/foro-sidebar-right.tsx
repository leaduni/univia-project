"use client"

// Columna derecha del foro (Fase 5): perfil XP, top semanal y accesos
// rápidos. En móvil se muestra debajo del feed.

import { AccesosRapidos } from "./accesos-rapidos"
import { PerfilXpCard } from "./perfil-xp-card"
import { TopContribuidores } from "./top-contribuidores"

const CARD =
  "relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.02] shadow-2xl shadow-black/25 backdrop-blur-xl"

export function ForoSidebarRight() {
  return (
    <div className="space-y-4">
      {/* Perfil XP */}
      <section className={`${CARD} p-0`}>
        <PerfilXpCard />
      </section>

      {/* Top contribuidores */}
      <section className={`${CARD} p-4`}>
        <TopContribuidores />
      </section>

      {/* Accesos rápidos */}
      <section className={`${CARD} p-2.5`}>
        <AccesosRapidos />
      </section>
    </div>
  )
}
