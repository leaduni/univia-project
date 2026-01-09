"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Zap, BookOpen, Award } from "lucide-react"

export function RightSidebar() {
  const achievements = [
    { icon: Trophy, label: "Primer Lugar", color: "bg-yellow-500" },
    { icon: Zap, label: "Racha 7 días", color: "bg-orange-500" },
    { icon: Award, label: "Excelencia", color: "bg-red-500" },
    { icon: BookOpen, label: "Lector", color: "bg-blue-500" },
    { icon: Trophy, label: "Colaborador", color: "bg-cyan-500" },
  ]

  return (
    <div className="space-y-6">
      {/* Logros Card */}
      <Card className="bg-card border-border sticky top-32">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Logros</CardTitle>
          <CardDescription>Tus insignias académicas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {achievements.map((achievement, index) => {
              const Icon = achievement.icon
              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-2 p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className={`p-2 rounded-lg ${achievement.color}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs text-center text-foreground font-medium leading-tight">{achievement.label}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start border-border hover:bg-secondary bg-transparent">
            <BookOpen className="w-4 h-4 mr-2" />
            Ver Malla Curricular
          </Button>
          <Button className="w-full justify-start bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
            <Zap className="w-4 h-4 mr-2" />
            Nueva Evaluación
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
