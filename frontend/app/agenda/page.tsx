// Agenda Inteligente - Página principal de la sección
import { DashboardLayout } from "@/components/dashboard-layout"
import { AgendaInteligente } from "@/components/agenda/agenda-inteligente"

export const metadata = {
  title: "Agenda Inteligente | UniVia",
  description: "Organiza tu semana universitaria con inteligencia artificial. Bloques de estudio, clases, evaluaciones y deporte en un solo lugar.",
}

export default function AgendaPage() {
  return (
    <DashboardLayout>
      <AgendaInteligente />
    </DashboardLayout>
  )
}
