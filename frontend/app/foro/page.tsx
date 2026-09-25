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
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-5 px-4 py-6 lg:grid-cols-12 lg:px-6">
        {/* Columna izquierda: navegación, categorías y tendencias */}
        <aside className="order-2 lg:order-1 lg:col-span-3 lg:sticky lg:top-20 lg:self-start">
          <Suspense fallback={null}>
            <ForoSidebarLeft />
          </Suspense>
        </aside>

        {/* Columna central: feed global */}
        <main className="order-1 lg:order-2 lg:col-span-6 min-w-0">
          <Suspense fallback={<FeedSkeleton />}>
            <ForoFeed />
          </Suspense>
        </main>

        {/* Columna derecha: gamificación y accesos */}
        <aside className="order-3 lg:col-span-3 lg:sticky lg:top-20 lg:self-start">
          <Suspense fallback={null}>
            <ForoSidebarRight />
          </Suspense>
        </aside>
      </div>
    </DashboardLayout>
  )
}
