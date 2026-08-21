// Dashboard page — panel privado del estudiante (protegido en /dashboard)
import { DashboardLayout } from "@/components/dashboard-layout"
import { Dashboard } from "@/components/dashboard"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  )
}