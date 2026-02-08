"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Zap, BookOpen, Award, Star, Medal } from "lucide-react"
import { ACHIEVEMENTS } from "@/lib/mockData"

interface RightSidebarProps {
  achievements?: any[]
  isLoading?: boolean
}

export function RightSidebar({ achievements = [], isLoading = false }: RightSidebarProps) {
  // Mapping of achievement icons
  const getIcon = (icon: string) => {
    switch (icon) {
      case '🏆': return Trophy;
      case '⚡': return Zap;
      case '⭐': return Star;
      case '🎓': return BookOpen;
      case '🎖️': return Medal;
      case '✨': return Award;
      default: return Award;
    }
  }

  return (
    <div className="space-y-6">
      {/* Logros Card */}
      <Card className="bg-card border-border sticky top-32">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Logros</CardTitle>
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
          <Button className="w-full justify-start bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
            <Zap className="w-4 h-4 mr-2" />
            Nueva Evaluación
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
