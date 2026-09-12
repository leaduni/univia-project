// Bandeja de mensajería directa entre estudiantes
import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { BandejaMensajes } from "@/components/mensajes/bandeja-mensajes"

export default function MensajesPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <header className="mb-6">
          <h1 className="font-poppins font-semibold text-2xl text-foreground">Mensajes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conversa en privado con otros estudiantes.
          </p>
        </header>
        {/* BandejaMensajes lee ?dm= con useSearchParams, que en el App Router
            exige un límite de Suspense. */}
        <Suspense
          fallback={
            <div className="p-6">
              <div className="h-24 w-full rounded-xl bg-muted animate-pulse" />
            </div>
          }
        >
          <BandejaMensajes />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}