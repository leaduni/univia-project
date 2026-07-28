// Prototype-aligned dashboard with metrics, courses, resources sidebar
"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, FileText } from "lucide-react"
import { StatsCards } from "./stats-cards"
import { CurrentCoursesSection } from "./current-courses-section"
import { RightSidebar } from "./right-sidebar"
import { AIRecommendation } from "./ai-recommendation"
import { useAuth } from "./providers/auth-context"
import { apiService } from "@/lib/api-service"
import { RECURSOS_DATA } from "@/lib/mockData"

interface DashboardStats {
  cursosCompletados: number
  cursosEnProgreso: number
  totalCursos: number
  porcentajeProgreso: number
  promedioPonderado: number
  horasEstudio: number
}

interface Logro {
  id: string | number
  nombre: string
  descripcion: string
  icon: string
  unlocked: boolean
  unlocked_at: string | null
}

interface Curso {
  id: string
  code: string
  name: string
  credits: number
  status: "available" | "in_progress" | "completed" | "locked"
  description?: string
  progreso: number
}

const RESOURCE_GRADIENTS = [
  "linear-gradient(135deg, #d93340, #a6249d)",
  "linear-gradient(135deg, #a6249d, #7957f1)",
  "linear-gradient(135deg, #f97316, #d93340)",
  "linear-gradient(135deg, #a0218b, #ff86ff)",
  "linear-gradient(135deg, #d93340, #7957f1)",
  "linear-gradient(135deg, #a6249d, #d93340)",
]

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [logros, setLogros] = useState<Logro[]>([])
  const [currentCourses, setCurrentCourses] = useState<(Curso & { progreso: number })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    loadDashboardData()
    return () => {
      isMounted.current = false
    }
  }, [])

  async function loadDashboardData() {
    setIsLoading(true)
    setError(null)

    try {
      const [summaryResult, mallaResult] = await Promise.allSettled([
        apiService.getDashboardSummary(),
        apiService.getMalla(),
      ])

      if (!isMounted.current) return

      let errorCount = 0

      if (summaryResult.status === "fulfilled") {
        const { stats, logros } = summaryResult.value as { stats: DashboardStats; logros: Logro[] }
        setStats(stats)
        setLogros(logros)
      } else {
        console.error("Error en Resumen Académico:", summaryResult.reason)
        errorCount++
      }

      if (mallaResult.status === "fulfilled") {
        const malla: any[] = (mallaResult.value as any[]) ?? []
        const activos = malla.flatMap((ciclo: any) => {
          const listaCursos = ciclo.courses || ciclo.cursos || []
          return listaCursos
            .filter((curso: any) => curso.status === "in_progress")
            .map((curso: any) => ({ ...curso, progreso: curso.progreso ?? 0 }))
        })
        setCurrentCourses(activos)
      } else {
        console.error("Error en Malla Curricular:", mallaResult.reason)
        errorCount++
      }

      if (errorCount > 0) {
        setError(
          errorCount === 2
            ? "Error de conexión: No se pudo sincronizar el expediente académico."
            : "Sincronización parcial: Algunos datos académicos no están actualizados.",
        )
      }
    } catch (err) {
      setError("Error crítico en la carga de datos del portal.")
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  const displayName = user?.nombre_completo || "Estudiante"

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0b0c16" }}>
      <div className="max-w-[1400px] mx-auto p-6 md:p-10">
        {/* Hero + Metrics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-8">
          <div className="lg:col-span-5 space-y-1">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white flex items-center gap-2">
              Hola, {displayName} <span className="animate-bounce">👋</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Llevas <span className="font-bold text-white">0 días</span> de racha estudiando. Sigue así, la constancia gana ciclos.
            </p>
          </div>
          <div className="lg:col-span-7">
            <StatsCards stats={stats} isLoading={isLoading} compact />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div role="alert" className="flex items-start gap-3 p-4 mb-6 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold">Aviso del Sistema</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <button onClick={loadDashboardData} className="text-xs font-bold uppercase hover:underline underline-offset-4">
              Reintentar
            </button>
          </div>
        )}

        {/* Main Grid: content + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-6">
            <AIRecommendation />
            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Continúa donde te quedaste</h2>
              <CurrentCoursesSection courses={currentCourses} isLoading={isLoading} />
            </section>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4">
            <RightSidebar stats={stats} achievements={logros} isLoading={isLoading} />
          </div>
        </div>

        {/* Resources Section */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white mb-4">Recursos nuevos en tus cursos</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {RECURSOS_DATA.slice(0, 6).map((r, i) => (
              <div
                key={r.id}
                className="flex-shrink-0 w-64 bg-[#151428] border border-[#262444] rounded-xl overflow-hidden hover:border-white/20 transition-colors"
              >
                <div className="relative h-16 overflow-hidden" style={{ background: RESOURCE_GRADIENTS[i % RESOURCE_GRADIENTS.length] }}>
                  <div className="absolute -right-1 -bottom-1 opacity-10 text-white pointer-events-none">
                    <FileText className="w-14 h-14 stroke-[1.5]" />
                  </div>
                </div>
                <div className="p-4">
                  <span className="text-xs text-white/40 font-mono">{r.code}</span>
                  <h4 className="text-sm font-medium text-white mt-1 truncate">{r.title}</h4>
                  <p className="text-xs text-white/40 mt-1 line-clamp-2">
                    {r.type} · {r.semester} · {r.downloads.toLocaleString()} descargas
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#1d1b38] pt-6 mt-16 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/40">UniVia · Un proyecto de LEAD UNI para la comunidad UNI</p>
          <p className="text-xs text-white/30 uppercase tracking-widest">LEARN. EXPLORE. ASPIRE. DISCOVER.</p>
        </footer>
      </div>
    </div>
  )
}
