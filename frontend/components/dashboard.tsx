"use client"
import { useState, useEffect } from "react"
import { StatsCards } from "./stats-cards"
import { CurrentCoursesSection } from "./current-courses-section"
import { RightSidebar } from "./right-sidebar"
import { AIRecommendation } from "./ai-recommendation"
import { useAuth } from "./providers/auth-context"
import { apiService } from "@/lib/api-service"

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [logros, setLogros] = useState<any[]>([])
  const [currentCourses, setCurrentCourses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true)
      try {
        // Ejecutar peticiones en paralelo para mayor velocidad
        const [summary, malla] = await Promise.all([
          apiService.getDashboardSummary(),
          apiService.getMalla()
        ]);

        setStats(summary.stats)
        setLogros(summary.logros)

        // Extraer cursos actuales de la malla
        const activeCourses: any[] = []
        Object.values(malla).forEach((ciclo: any) => {
          if (ciclo.courses) {
            ciclo.courses.forEach((course: any) => {
              if (course.status === "in_progress") {
                activeCourses.push({
                  ...course,
                  progress: 0
                })
              }
            })
          }
        })
        setCurrentCourses(activeCourses)

      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const displayName = user?.nombre_completo?.split(" ")[0] || "Estudiante"

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Main Content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bienvenido, {displayName}
          </h1>
          <p className="text-muted-foreground">Aquí está tu resumen académico personalizado</p>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} isLoading={isLoading} />

        {/* Current Courses Section */}
        <CurrentCoursesSection courses={currentCourses} isLoading={isLoading} />

        {/* AI Recommendation Banner */}
        <AIRecommendation />
      </div>

      {/* Right Sidebar */}
      <div className="lg:w-72 flex-shrink-0">
        <RightSidebar achievements={logros} isLoading={isLoading} />
      </div>
    </div>
  )
}
