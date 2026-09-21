// Hilos de una sección del foro
import { DashboardLayout } from "@/components/dashboard-layout"
import { SeccionView } from "@/components/foro/seccion-view"

export default async function SeccionPage({ params }: { params: Promise<{ seccionId: string }> }) {
  const { seccionId } = await params
  return (
    <DashboardLayout>
      <div className="p-6">
        <SeccionView seccionId={Number(seccionId)} />
      </div>
    </DashboardLayout>
  )
}