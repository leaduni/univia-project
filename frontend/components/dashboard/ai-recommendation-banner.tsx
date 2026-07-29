// Bloque "Recomendación de tu asistente IA" del dashboard (RF-20)
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AiInsightCard } from "@/components/ui/ai-insight-card"
import { apiService } from "@/lib/api-service"

interface CursoSugerido {
  id: number | string
  code: string
  name: string
  ciclo?: number
  desbloquea?: number
}

interface Diagnostico {
  nivel: string
  promedio_ponderado: number
  recomendacion: {
    mensaje: string
    curso_destacado: CursoSugerido | null
    cursos_sugeridos: CursoSugerido[]
  }
}

const ETIQUETA_NIVEL: Record<string, string> = {
  inicial: "Nivel inicial",
  intermedio: "Nivel intermedio",
  avanzado: "Nivel avanzado",
}

export function AIRecommendationBanner() {
  const router = useRouter()
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    apiService
      .getTestNivel()
      .then((data) => {
        if (activo) setDiagnostico(data)
      })
      .catch(() => {
        // El diagnóstico es un extra del dashboard: si falla, el bloque
        // simplemente no aparece. No tiene sentido mostrar un error por una
        // recomendación.
        if (activo) setDiagnostico(null)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

  if (cargando) {
    return (
      <div className="rounded-xl border border-accent/40 bg-card/90 p-5 space-y-3">
        <div className="h-4 w-40 bg-muted animate-pulse rounded" />
        <div className="h-3 w-full bg-muted animate-pulse rounded" />
        <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!diagnostico?.recomendacion?.mensaje) return null

  const { mensaje, curso_destacado } = diagnostico.recomendacion

  return (
    <AiInsightCard
      variant="glow"
      badgeText={ETIQUETA_NIVEL[diagnostico.nivel] ?? "Tu avance"}
      title="Recomendación de tu asistente IA"
      description={mensaje}
      // El botón solo aparece si hay a dónde ir. El curso lo elige el backend
      // junto con el mensaje, para que el texto y el destino no se
      // contradigan.
      actionLabel={curso_destacado ? "Practicar ahora" : undefined}
      onAction={
        curso_destacado ? () => router.push(`/curso/${curso_destacado.id}`) : undefined
      }
    />
  )
}
