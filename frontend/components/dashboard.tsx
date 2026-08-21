// Dashboard principal: saludo, métricas, cursos activos y panel lateral
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { StatsCards } from "./stats-cards"
import { ContinueLearning, type CursoActivo } from "./dashboard/continue-learning"
import { SidebarWidgets } from "./dashboard/sidebar-widgets"
import { RecentResources } from "./dashboard/recent-resources"
import { AIRecommendationBanner } from "./dashboard/ai-recommendation-banner"
import { useAuth } from "./providers/auth-context"
import { apiService, type ApiError } from "@/lib/api-service"
import { calcularRacha, mensajeRacha } from "@/lib/racha"
import type { DashboardMetricas } from "./stats-cards"

interface Logro {
  id: string | number
  nombre: string
  descripcion: string
  icon: string
  unlocked: boolean
  unlocked_at: string | null
}

export function Dashboard() {
  const { user, session } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardMetricas | null>(null)
  const [logros, setLogros] = useState<Logro[]>([])
  const [cursosActivos, setCursosActivos] = useState<CursoActivo[]>([])
  const [racha, setRacha] = useState(0)
  // Estados de carga estructurados por sección: reemplazo el isLoading global.
  // Cada sección (resumen, avance/timeline) muestra su skeleton independientemente
  // mientras sus datos se poblan. Esto evita que un solo fetch bloquee todo el dashboard.
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [isLoadingAvance, setIsLoadingAvance] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)
  const hasLoadedOnce = useRef(false)
  const isFetchingRef = useRef(false)
  const redirigiendoRef = useRef(false)

  // Antes el efecto dependía del objeto `session` completo. Supabase emite
  // un evento (con un objeto `session` nuevo, aunque sea el mismo usuario)
  // cada vez que renueva el token — típicamente al volver a la pestaña — así
  // que cada cambio de foco disparaba una recarga completa del dashboard y
  // los datos parpadeaban/desaparecían mientras volvían a llegar. Ahora solo
  // se dispara cuando cambia el usuario autenticado (login/logout real).
  const userId = user?.id ?? null
  const hasSession = !!session

  const loadDashboardData = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    if (hasLoadedOnce.current) {
      setIsRefreshing(true)
    } else {
      setIsLoadingSummary(true)
      setIsLoadingAvance(true)
    }
    setError(null)

    try {
      // Fuentes independientes, en paralelo y con allSettled: si una falla,
      // el resto del dashboard igual se muestra.
      //
      // Ya no se pide la malla completa: solo servía para filtrar los cursos
      // en progreso, y traía todos los ciclos con sus prerrequisitos para
      // usar una fracción. `cursos-activos` devuelve justo eso, ya con el
      // avance real de cada curso.
      const [summaryResult, activosResult, avanceResult, actividadResult] =
        await Promise.allSettled([
          apiService.getDashboardSummary(),
          apiService.getCursosActivos(),
          apiService.getAvanceCarrera(),
          apiService.getActividad("90d"),
        ])

      if (!isMounted.current) return

      // Sin carrera elegida el dashboard no tiene nada que mostrar: sus
      // métricas se calculan sobre la malla de la carrera. En vez de pintar
      // ceros y dejar errores en consola, se manda al estudiante a terminar
      // el onboarding, que es lo único que puede hacer desde aquí.
      // Sin carrera elegida, getAvanceCarrera ahora resuelve a null (onboarding
      // pendiente) en lugar de rechazar: se detecta igual que el rechazo con
      // `requiereOnboarding` de los demás endpoints.
      const faltaOnboarding =
        (avanceResult.status === "fulfilled" && avanceResult.value === null) ||
        [summaryResult, activosResult, avanceResult, actividadResult].some(
          (r) => r.status === "rejected" && (r.reason as ApiError)?.requiereOnboarding,
        )
      if (faltaOnboarding) {
        // Se mantiene el skeleton hasta que la navegación ocurra: apagar la
        // carga aquí mostraría el dashboard vacío por un instante.
        redirigiendoRef.current = true
        router.replace("/onboarding")
        return
      }

      let errorCount = 0

      // El avance manda sobre el summary: es el cálculo oficial en créditos
      // (RF-07). La actividad aporta las evaluaciones rendidas.
      const avance = avanceResult.status === "fulfilled" ? avanceResult.value : null
      const actividad = actividadResult.status === "fulfilled" ? actividadResult.value : null

      if (actividadResult.status === "fulfilled") {
        setRacha(calcularRacha(actividad?.actividad_por_dia ?? []))
      }

      if (summaryResult.status === "fulfilled") {
        const { stats: resumen, logros } = summaryResult.value as {
          stats: any
          logros: Logro[]
        }
        setStats({
          cursosCompletados: avance?.cursos_aprobados ?? resumen?.cursosCompletados ?? 0,
          cursosEnProgreso: avance?.cursos_en_curso ?? resumen?.cursosEnProgreso ?? 0,
          totalCursos: avance?.cursos_totales ?? resumen?.totalCursos ?? 0,
          porcentajeProgreso: avance?.porcentaje_avance ?? resumen?.porcentajeProgreso ?? 0,
          creditosAprobados: avance?.creditos_aprobados,
          creditosTotales: avance?.creditos_totales,
          evaluacionesRendidas: actividad?.resumen?.evaluaciones_rendidas ?? 0,
          evaluacionesAprobadas: actividad?.resumen?.evaluaciones_aprobadas ?? 0,
        })
        setLogros(logros)
      } else {
        console.error("Error en Resumen Académico:", summaryResult.reason)
        errorCount++
      }

      if (activosResult.status === "fulfilled") {
        setCursosActivos((activosResult.value as any)?.cursos ?? [])
      } else {
        console.error("Error en Cursos Activos:", activosResult.reason)
        errorCount++
      }

      if (errorCount > 0) {
        setError(
          errorCount === 2
            ? "Error de conexión: No se pudo sincronizar el expediente académico."
            : "Sincronización parcial: Algunos datos académicos no están actualizados.",
        )
      }

      hasLoadedOnce.current = true
    } catch (err) {
      setError("Error crítico en la carga de datos del portal.")
    } finally {
      isFetchingRef.current = false
      if (isMounted.current && !redirigiendoRef.current) {
        setIsLoadingSummary(false)
        setIsLoadingAvance(false)
        setIsRefreshing(false)
      }
    }
  }, [router])

  useEffect(() => {
    isMounted.current = true
    // No disparar llamadas API sin sesión activa: sin token, todas
    // responderían 401 y generarían errores en la consola.
    if (hasSession) {
      // Guard temprano: si el perfil ya indica que el onboarding no está
      // completo, no tiene sentido disparar el batch (su avance respondería
      // 400/requiereOnboarding): se va directo a terminar el onboarding.
      if (user && user.onboarding_completado === false) {
        redirigiendoRef.current = true
        router.replace("/onboarding")
      } else {
        loadDashboardData()
      }
    } else {
      setIsLoadingSummary(false)
      setIsLoadingAvance(false)
    }
    return () => {
      isMounted.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSession, userId])

  // Solo el primer nombre: "Hola, Juan Carlos Pérez Ramírez 👋" no saluda a
  // nadie, y el nombre completo ya está en el menú de usuario.
  const primerNombre = (user?.nombre_completo || "Estudiante").trim().split(/\s+/)[0]

// Skeletons por sección: cada una muestra su loader mientras sus datos
// correspondientes no han llegado aún. Se ocultan automáticamente cuando
// el fetch respectivo termina (dentro de loadDashboardData).
const skeletonSummary = isLoadingSummary && !hasLoadedOnce.current
const skeletonAvance = isLoadingAvance && !hasLoadedOnce.current

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-6 md:p-10">
        {/* Saludo + métricas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-8">
          <div className="lg:col-span-5 space-y-1">
            <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
              Hola, {primerNombre} <span aria-hidden="true">👋</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
{skeletonAvance ? (
                "Revisando tu actividad..."
              ) : (
                <>
                  Llevas <b className="text-[#d2cefd] font-bold">{racha} días</b> de racha estudiando. Sigue así, la constancia gana ciclos.
                  </>
                )}
            </p>
          </div>
          <div className="lg:col-span-7">
            <StatsCards stats={stats} isLoading={skeletonSummary} compact />
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
            <AIRecommendationBanner />
            <section>
              <ContinueLearning cursos={cursosActivos} isLoading={skeletonSummary} />
            </section>
          </div>

          {/* Panel lateral */}
          <div className="lg:col-span-4">
            <SidebarWidgets stats={stats} logros={logros} isLoading={skeletonSummary} />
          </div>
        </div>

        <RecentResources />

        <footer className="border-t border-border pt-6 mt-16 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            UniVia · Un proyecto de LEAD UNI para la comunidad UNI
          </p>
          <p className="text-xs text-muted-foreground/70 uppercase tracking-widest">
            Learn. Explore. Aspire. Discover.
          </p>
        </footer>
      </div>
    </div>
  )
}