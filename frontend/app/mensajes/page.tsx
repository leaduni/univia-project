// Bandeja de mensajería directa entre estudiantes
import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { BandejaMensajes } from "@/components/mensajes/bandeja-mensajes"

export default function MensajesPage() {
  return (
    <DashboardLayout>
      {/* BandejaMensajes lee ?dm= con useSearchParams, que en el App Router
          exige un límite de Suspense. El encabezado vive dentro del
          componente (rediseño glass). */}
      <Suspense
        fallback={
          <div className="p-6">
            <div className="h-24 w-full rounded-xl bg-muted animate-pulse" />
          </div>
        }
      >
        <BandejaMensajes />
      </Suspense>
    </DashboardLayout>
  )
}
