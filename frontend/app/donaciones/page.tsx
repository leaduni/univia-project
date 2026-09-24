// Donaciones — aporte voluntario por Yape, transparencia y cuadro de honor.
import { DashboardLayout } from "@/components/dashboard-layout"
import { DonacionesView } from "@/components/donaciones/donaciones-view"

export default function DonacionesPage() {
  return (
    <DashboardLayout>
      <DonacionesView />
    </DashboardLayout>
  )
}
