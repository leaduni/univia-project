"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, TrendingUp, Award } from "lucide-react"

interface StatsCardsProps {
  stats: any
  isLoading: boolean
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const statsConfig = [
    {
      title: "Cursos Completados",
      value: `${stats?.cursosCompletados ?? 0}/${stats?.totalCursos ?? 0}`,
      description: "De tu carrera total",
      icon: BookOpen,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Progreso Total",
      value: `${stats?.porcentajeProgreso ?? 0}%`,
      description: "Avance curricular",
      icon: TrendingUp,
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      title: "Promedio Actual",
      value: stats?.promedioPonderado ?? "0.0",
      description: "Basado en tus notas",
      icon: Award,
      gradient: "from-emerald-500 to-cyan-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="bg-card border-border hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              </div>
              <div className={`p-2.5 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-9 w-20 bg-muted animate-pulse rounded mb-1" />
              ) : (
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              )}
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
