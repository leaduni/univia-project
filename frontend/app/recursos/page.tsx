// Banco de exámenes y recursos complementarios
import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { RecursosBiblioteca } from "@/components/recursos-biblioteca"

export default function RecursosPage() {
  return (
    <DashboardLayout>
      {/* RecursosBiblioteca lee ?tipo= con useSearchParams, que en el App
          Router exige un límite de Suspense. */}
      <Suspense
        fallback={
          <div className="p-6">
            <div className="h-24 w-full rounded-xl bg-muted animate-pulse" />
          </div>
        }
      >
        <RecursosBiblioteca />
      </Suspense>
    </DashboardLayout>
  )
}
