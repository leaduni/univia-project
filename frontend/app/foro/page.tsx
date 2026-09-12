// Foro de la comunidad: secciones globales y por facultad
import { DashboardLayout } from "@/components/dashboard-layout"
import { ForoSecciones } from "@/components/foro/foro-secciones"

export default function ForoPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <header className="mb-6">
          <h1 className="font-poppins font-semibold text-2xl text-foreground">Foro de la comunidad</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discute, pregunta y comparte con otros estudiantes de la UNI.
          </p>
        </header>
        <ForoSecciones />
      </div>
    </DashboardLayout>
  )
}