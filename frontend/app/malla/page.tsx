// Malla curricular del estudiante (RF-04 a RF-07)
"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { AlertCircle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard-layout"
import { apiService, mensajeAmigableError } from "@/lib/api-service"
import { picoCache } from "@/lib/api-cache"
import type { AvanceCarrera, CicloDetail } from "@/types/malla"

// Los estilos de React Flow son globales: solo se cargan en esta ruta.
import "@xyflow/react/dist/style.css"

const MallaGraph = dynamic(
  () => import("@/components/malla-graph/MallaGraph").then((m) => m.MallaGraph),
  {
    ssr: false,
    loading: () => <MallaSkeleton />,
  },
)

export default function MallaPage() {
  // Seed desde caché SWR: si ya hay datos (prefetch por hover), se pintan en
  // el primer frame sin skeleton ni parpadeo.
  const [malla, setMalla] = useState<any[]>(() => picoCache<any[]>("malla") ?? [])
  const [avance, setAvance] = useState<any>(() => picoCache<any>("avance") ?? null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Cambiarlo reejecuta el efecto de carga: reintentar sin recargar el navegador.
  const [intento, setIntento] = useState(0)

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
        setError(mensajeAmigableError(err))
      } finally {
        if (activo) setCargando(false)
      }
    }

    cargar()
    return () => {
      activo = false
    }
  }, [intento])

  const handleMarkCompleted = (courseId: string) => {
    setMalla(prev => {
      const nuevo = JSON.parse(JSON.stringify(prev))
      let found = false
      for (const ciclo of nuevo) {
        if (found) break
        for (const curso of ciclo.courses) {
          if (curso.id === courseId) {
            curso.status = 'completed'
            // Mock: Assign a passing grade and date
            curso.nota = 15.0
            curso.fecha_completado = new Date().toISOString()
            found = true
            break
          }
        }
      }
      return nuevo
    })
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 flex flex-col h-[calc(100vh-80px)]">
        <div className="space-y-1 mb-4 flex-none">
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Mi malla curricular
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu plan de estudios completo, con el estado de cada curso.
          </p>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center text-center gap-4 py-16 flex-1">
            <div className="p-4 rounded-full bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="font-heading text-lg font-bold text-foreground">
                No pudimos cargar tu malla
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIntento((n) => n + 1)}
            >
              <RotateCcw className="w-4 h-4" />
              Reintentar
            </Button>
          </div>
        ) : cargando && malla.length === 0 ? (
          <MallaSkeleton />
        ) : (
          <div className="flex-1 rounded-2xl bg-card border border-border overflow-hidden min-h-0">
            <MallaGraph 
              malla={malla as CicloDetail[]} 
              avance={avance as AvanceCarrera | null}
              onMarkCompleted={handleMarkCompleted}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

/** Shell de carga granular: tarjetas de ciclo esqueleto en vez de un spinner. */
function MallaSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-5 space-y-3"
        >
          <div className="h-4 w-28 rounded-md bg-muted animate-pulse" />
          <div className="h-3 w-3/4 rounded-md bg-muted/70 animate-pulse" />
          <div className="space-y-2 pt-2">
            <div className="h-10 rounded-xl bg-muted/60 animate-pulse" />
            <div className="h-10 rounded-xl bg-muted/60 animate-pulse" />
            <div className="h-10 rounded-xl bg-muted/60 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
