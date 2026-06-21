"use client"

import { useEffect, useRef, useState } from "react"
import { 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  Clock, 
  AlertCircle, 
  RefreshCcw,
  ChevronRight,
  Trophy
} from "lucide-react"
import { StatsCards } from "./stats-cards"
import { CurrentCoursesSection } from "./current-courses-section"
import { MallaCurricular } from "./malla-curricular"
import { RightSidebar } from "./right-sidebar"
import { AIRecommendation } from "./ai-recommendation"
import { useAuth } from "./providers/auth-context"
import { apiService } from "@/lib/api-service"

/**
 * Mapeo exacto de la respuesta de dashboard.py (_calcular_stats)
 */
interface DashboardStats {
  cursosCompletados: number
  cursosEnProgreso: number
  totalCursos: number
  porcentajeProgreso: number
  promedioPonderado: number
  horasEstudio: number
}

/**
 * Mapeo exacto de la respuesta de dashboard.py (_obtener_logros)
 */
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

interface Ciclo {
  ciclo: string
  credits: number
  courses: Curso[]
}

function useAcademicHeader() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const hora = currentTime.getHours()
  let saludo = "Buen día"
  if (hora >= 6 && hora < 12) saludo = "Buenos días"
  else if (hora >= 12 && hora < 19) saludo = "Buenas tardes"
  else saludo = "Buenas noches"

  const fechaFormateada = currentTime.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return { saludo, fechaFormateada }
}

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [logros, setLogros] = useState<Logro[]>([])
  const [currentCourses, setCurrentCourses] = useState<(Curso & { progreso: number })[]>([])
  const [mallaData, setMallaData] = useState<Ciclo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  const { saludo, fechaFormateada } = useAcademicHeader()

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
        const { stats, logros } = summaryResult.value as { stats: DashboardStats, logros: Logro[] }
        setStats(stats)
        setLogros(logros)
      } else {
        console.error("Error en Resumen Académico:", summaryResult.reason)
        errorCount++
      }

      if (mallaResult.status === "fulfilled") {
        const malla: Ciclo[] = (mallaResult.value as Ciclo[]) ?? []
        setMallaData(malla)

        const activos = malla.flatMap(ciclo => 
          (ciclo.courses ?? [])
            .filter(curso => curso.status === "in_progress")
            .map(curso => ({ ...curso, progreso: curso.progreso ?? 0 }))
        )
        setCurrentCourses(activos)
      } else {
        console.error("Error en Malla Curricular:", mallaResult.reason)
        errorCount++
      }

      if (errorCount > 0) {
        setError(
          errorCount === 2 
            ? "Error de conexión: No se pudo sincronizar el expediente académico." 
            : "Sincronización parcial: Algunos datos académicos no están actualizados."
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100">
      <div className="max-w-[1400px] mx-auto p-6 md:p-10">
        <div className="flex flex-col lg:flex-row gap-10">
          
          <main className="flex-1 space-y-10 min-w-0">
            <header className="border-b border-slate-200 pb-8">
              <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">
                <span className="hover:text-indigo-600 cursor-pointer transition-colors">Portal</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-900">Dashboard Académico</span>
              </nav>
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
                    {saludo}, <span className="text-indigo-600">{displayName}</span>
                  </h1>
                  <div className="flex items-center gap-4 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium capitalize">{fechaFormateada}</span>
                    </div>
                    <div className="hidden md:block w-1 h-1 rounded-full bg-slate-300" />
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      <span className="text-sm font-medium">Expediente Universitario Activo</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={loadDashboardData}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
                >
                  <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Sincronizar Datos
                </button>
              </div>
            </header>

            {error && (
              <div role="alert" className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 shadow-sm">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold">Aviso del Sistema</p>
                  <p className="text-sm opacity-90">{error}</p>
                </div>
                <button onClick={loadDashboardData} className="text-xs font-bold uppercase tracking-tight hover:underline underline-offset-4">
                  Reintentar
                </button>
              </div>
            )}

            <section aria-label="Estadísticas de rendimiento">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Indicadores de Rendimiento</h2>
              </div>
              <StatsCards stats={stats} isLoading={isLoading} />
            </section>

            <section aria-label="Cursos actuales" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Clock className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Semestre en Curso</h2>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  Activo
                </span>
              </div>
              <CurrentCoursesSection courses={currentCourses} isLoading={isLoading} />
            </section>

            <section aria-label="Malla curricular" className="pt-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Plan de Estudios</h2>
                <p className="text-sm text-slate-500 mt-1">Seguimiento detallado de tu progreso curricular por ciclo.</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-1 shadow-sm overflow-hidden">
                <MallaCurricular malla={mallaData} isLoading={isLoading} />
              </div>
            </section>

            <section aria-label="Recomendaciones" className="bg-indigo-900 rounded-2xl p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <GraduationCap className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <AIRecommendation />
              </div>
            </section>
          </main>

          <aside className="lg:w-80 flex-shrink-0 space-y-8">
            <div className="sticky top-10">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-slate-800">
                    Logros Académicos
                  </h3>
                </div>
                <RightSidebar achievements={logros} isLoading={isLoading} />
              </div>
              
              <div className="mt-6 p-4 bg-slate-100 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Para consultas administrativas o soporte técnico, por favor contacte a la oficina de registros académicos.
                </p>
              </div>
            </div>
          </aside>
          
        </div>
      </div>
    </div>
  )
}