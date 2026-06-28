"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Zap, BookOpen, Award, Star, Medal } from "lucide-react"
import { ACHIEVEMENTS } from "@/lib/mockData"

interface RightSidebarProps {
  achievements?: any[]
  isLoading?: boolean
}

export function RightSidebar({ achievements = [], isLoading = false }: RightSidebarProps) {
  const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    trophy: Trophy,
    zap: Zap,
    star: Star,
    graduation: BookOpen,
    medal: Medal,
    sparkles: Award,
  }

  const getIcon = (iconName: string) => ICON_MAP[iconName?.toLowerCase()] || Award

  return (
    <div className="space-y-6">
      {/* Logros Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">Logros Académicos</CardTitle>
          </div>
          <CardDescription>Tus insignias académicas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-secondary/50 rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {achievements.map((achievement, index) => {
                const Icon = getIcon(achievement.icon)
                const isUnlocked = achievement.unlocked

                return (
                  <div
                    key={achievement.id || index}
                    className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all duration-300 ${isUnlocked
                        ? "bg-primary/10 hover:bg-primary/20 scale-100 opacity-100"
                        : "bg-secondary/30 grayscale opacity-40 cursor-not-allowed"
                      }`}
                    title={achievement.descripcion}
                  >
                    <div className={`p-2 rounded-lg ${isUnlocked ? "bg-primary/20" : "bg-muted"}`}>
                      <Icon className={`w-4 h-4 ${isUnlocked ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <p className="text-[10px] text-center text-foreground font-medium leading-tight">
                      {achievement.nombre}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
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
          <Button className="w-full justify-start gradient-ai-neon text-white border-0">
            <Zap className="w-4 h-4 mr-2" />
            Nueva Evaluación
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
