"use client"
import { useState, useEffect } from "react"
import { StatsCards } from "./stats-cards"
import { CurrentCoursesSection } from "./current-courses-section"
import { RightSidebar } from "./right-sidebar"
import { AIRecommendation } from "./ai-recommendation"
import { apiService } from "@/lib/api-service"

export function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [statsData, userData] = await Promise.all([
          apiService.getDashboardStats(),
          apiService.getProfile()
        ])
        setStats(statsData)
        setUser(userData)
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="flex gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bienvenido, {user?.nombre_completo?.split(' ')[0] || 'Usuario'}
          </h1>
          <p className="text-muted-foreground">Aquí está tu resumen académico personalizado</p>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} isLoading={isLoading} />

        {/* Current Courses Section */}
        <CurrentCoursesSection courses={stats?.currentCourses} isLoading={isLoading} />

        {/* AI Recommendation Banner */}
        <AIRecommendation />
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0">
        <RightSidebar />
      </div>
    </div>
  )
}
