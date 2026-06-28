// Dashboard statistics cards with unique icon colors per metric
"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, TrendingUp, Award, Clock, Calendar } from "lucide-react"

interface StatsCardsProps {
  stats: any
  isLoading: boolean
}

const iconBgColors: Record<string, string> = {
  cursosCompletados: "bg-emerald-500/15 text-emerald-400",
  cursosEnProgreso: "bg-blue-500/15 text-blue-400",
  totalCursos: "bg-primary/15 text-primary",
  porcentajeProgreso: "bg-violet-500/15 text-violet-400",
  promedioPonderado: "bg-amber-500/15 text-amber-400",
  horasEstudio: "bg-secondary/15 text-secondary",
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const statsConfig = [
    {
      key: "cursosCompletados",
      title: "Cursos Completados",
      value: `${stats?.cursosCompletados ?? 0}/${stats?.totalCursos ?? 0}`,
      description: "De tu carrera total",
      icon: BookOpen,
    },
    {
      key: "cursosEnProgreso",
      title: "Cursos en Progreso",
      value: `${stats?.cursosEnProgreso ?? 0}`,
      description: "Actualmente cursando",
      icon: Clock,
    },
    {
      key: "porcentajeProgreso",
      title: "Progreso Total",
      value: `${stats?.porcentajeProgreso ?? 0}%`,
      description: "Avance curricular",
      icon: TrendingUp,
    },
    {
      key: "promedioPonderado",
      title: "Promedio Actual",
      value: stats?.promedioPonderado ?? "0.0",
      description: "Basado en tus notas",
      icon: Award,
    },
    {
      key: "horasEstudio",
      title: "Horas de Estudio",
      value: `${stats?.horasEstudio ?? 0}h`,
      description: "Dedicación acumulada",
      icon: Calendar,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon
        const iconColor = iconBgColors[stat.key] || "bg-primary/15 text-primary"
        return (
          <Card key={index} className="bg-card border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              </div>
              <div className={`p-2.5 rounded-lg ${iconColor}`}>
                <Icon className="w-5 h-5" />
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
