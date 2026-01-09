"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, TrendingUp, Award } from "lucide-react"

export function StatsCards() {
  const stats = [
    {
      title: "Cursos Activos",
      value: "6",
      description: "De 8 total en tu plan",
      icon: BookOpen,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Progreso Semestral",
      value: "68%",
      description: "En el segundo semestre",
      icon: TrendingUp,
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      title: "Habilidades Dominadas",
      value: "12",
      description: "De tu plan curricular",
      icon: Award,
      gradient: "from-emerald-500 to-cyan-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => {
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
              <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
