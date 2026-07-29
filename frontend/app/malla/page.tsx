// Malla curricular del estudiante (RF-04 a RF-07)
"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { MallaCurricular } from "@/components/malla-curricular"
import { apiService } from "@/lib/api-service"

export default function MallaPage() {
  const [malla, setMalla] = useState<any[]>([])
  const [avance, setAvance] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true

    const cargar = async () => {
      setCargando(true)
      setError(null)
      try {
        // La malla y el avance son dos llamadas independientes: se piden en
        // paralelo para no encadenar dos esperas.
        const [ciclos, resumenAvance] = await Promise.all([
          apiService.getMalla(),
          apiService.getAvanceCarrera(),
        ])
        if (!activo) return
        setMalla(Array.isArray(ciclos) ? ciclos : [])
        setAvance(resumenAvance)
      } catch (err: any) {
        if (!activo) return
        setError(err.message || "No pudimos cargar tu malla curricular.")
      } finally {
        if (activo) setCargando(false)
      }
    }

    cargar()
    return () => {
      activo = false
    }
  }, [])

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Mi malla curricular
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu plan de estudios completo, con el estado de cada curso.
          </p>
        </div>

        {avance && avance.creditos_totales > 0 && (
          <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm font-medium text-foreground">Avance de carrera</p>
              <p className="font-heading text-2xl font-bold gradient-brand-text">
                {avance.porcentaje_avance}%
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="progress-bar-modern-fill"
                style={{ width: `${Math.min(avance.porcentaje_avance, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {avance.creditos_aprobados} de {avance.creditos_totales} créditos aprobados
              {avance.creditos_restantes > 0 && ` · te faltan ${avance.creditos_restantes}`}
            </p>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center text-center gap-4 py-16">
            <div className="p-4 rounded-full bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="font-heading text-lg font-bold text-foreground">
                No pudimos cargar tu malla
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
            </div>
          </div>
        ) : cargando ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Cargando tu malla...</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <MallaCurricular malla={malla} isLoading={false} />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
