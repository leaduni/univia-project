// Detalle de un hilo del foro: publicación + comentarios
import { DashboardLayout } from "@/components/dashboard-layout"
import { HiloPublicacion } from "@/components/foro/hilo-publicacion"

export default async function PublicacionPage({
  params,
}: {
  params: Promise<{ seccionId: string; publicacionId: string }>
}) {
  const { publicacionId } = await params
  return (
    <DashboardLayout>
      <div className="p-6">
        <HiloPublicacion publicacionId={Number(publicacionId)} />
      </div>
    </DashboardLayout>
  )
}