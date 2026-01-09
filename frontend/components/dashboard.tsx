"use client"
import { StatsCards } from "./stats-cards"
import { CurrentCoursesSection } from "./current-courses-section"
import { RightSidebar } from "./right-sidebar"
import { AIRecommendation } from "./ai-recommendation"

export function Dashboard() {
  return (
    <div className="flex gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Bienvenido, Juan</h1>
          <p className="text-muted-foreground">Aquí está tu resumen académico personalizado</p>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Current Courses Section */}
        <CurrentCoursesSection />

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
