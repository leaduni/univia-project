// Foro de la comunidad (Fase 5): feed global de 3 columnas.
// Izquierda: navegación y filtros · Centro: feed · Derecha: gamificación.
// En móvil (<lg) las columnas laterales se apilan debajo del feed.

import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ForoFeed } from "@/components/foro/feed/foro-feed"
import { FeedSkeleton } from "@/components/foro/feed/feed-skeleton"
import { ForoSidebarLeft } from "@/components/foro/lateral/foro-sidebar-left"
import { ForoSidebarRight } from "@/components/foro/lateral/foro-sidebar-right"

export default function ForoPage() {
  return (
    <DashboardLayout>
      {/* El buscador se desplaza con el feed. Solo las columnas laterales
          se anclan bajo el header; este wrapper no crea otro scrollport. */}
      <div className="relative min-h-screen bg-[#090a12] text-white">
        {/* Atmósfera global */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {/* Fuchsia */}
          <div className="absolute -left-[220px] top-[12%] h-[520px] w-[520px] rounded-full bg-fuchsia-500/[0.045] blur-[120px]" />
          {/* Violet */}
          <div className="absolute left-[38%] top-[-220px] h-[520px] w-[520px] rounded-full bg-violet-500/[0.04] blur-[130px]" />
          {/* Cyan */}
          <div className="absolute right-[-180px] top-[35%] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.035] blur-[120px]" />
          {/* Bottom ambient light */}
          <div className="absolute bottom-[-300px] left-[35%] h-[600px] w-[600px] rounded-full bg-purple-600/[0.025] blur-[150px]" />
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,#090a12_95%)]" />
        </div>

        <div className="relative grid w-full grid-cols-1 gap-4 pt-4 pb-6 lg:grid-cols-12">
          {/* Columna izquierda: navegación, categorías y tendencias */}
          <aside className="order-2 lg:order-1 lg:col-span-3 lg:border-0 lg:sticky lg:top-4 lg:self-start">
            <Suspense fallback={null}>
              <ForoSidebarLeft />
            </Suspense>
          </aside>

          {/* Columna central: feed global */}
          <main className="order-1 min-w-0 lg:order-2 lg:col-span-6">
            <Suspense fallback={<FeedSkeleton />}>
              <ForoFeed />
            </Suspense>
          </main>

          {/* Columna derecha: gamificación y accesos */}
          <aside className="order-3 lg:col-span-3 lg:sticky lg:top-4 lg:self-start">
            <Suspense fallback={null}>
              <ForoSidebarRight />
            </Suspense>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  )
}
