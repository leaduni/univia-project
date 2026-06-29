// Onboarding completion - success summary and CTA
"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle, ChevronLeft, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import type { OnboardingData } from "@/types/onboarding"

interface CompletionStepProps {
  data: OnboardingData
  onBack: () => void
  onComplete: () => void
  isSubmitting?: boolean
}

export function CompletionStep({ data, onBack, onComplete, isSubmitting = false }: CompletionStepProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    setShowConfetti(true)
  }, [])

  const careerName =
    {
      cs: "Ingeniería en Computación",
      ie: "Ingeniería Electrónica",
      im: "Ingeniería Mecánica",
      is: "Ingeniería de Sistemas",
    }[data.career] || "Tu carrera"

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {showConfetti && (
        <>
          {/* Confetti-like particles */}
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="fixed pointer-events-none"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                animation: `fall ${2 + Math.random() * 1}s linear forwards`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full opacity-80"
                style={{
                  background: `hsl(${190 + Math.random() * 20}, 100%, 50%)`,
                }}
              />
            </div>
          ))}
          <style>{`
            @keyframes fall {
              to {
                transform: translateY(100vh) rotate(360deg);
                opacity: 0;
              }
            }
          `}</style>
        </>
      )}

      {/* Success Icon with Glow */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 gradient-ai-neon rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-[#a0218b]/10 border-2 border-[var(--ai-neon-pink)] rounded-full p-8 ai-neon-glow">
            <CheckCircle className="w-16 h-16 text-[var(--ai-neon-pink)]" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          ¡Perfil Listo! <Sparkles className="w-6 h-6 text-accent" />
        </h2>
        <p className="text-muted-foreground">Tu malla curricular está personalizada. Aquí está tu resumen:</p>
      </div>

      {/* Profile Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Career */}
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1">Carrera</p>
          <p className="font-semibold text-foreground text-balance">{careerName}</p>
        </Card>

        {/* Semester */}
        <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1">Semestre Actual</p>
          <p className="font-semibold text-foreground">{data.semester} de 8</p>
        </Card>

        {/* Enrollment */}
        <Card className="p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 border-border backdrop-blur-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1">Cursos Inscritos</p>
          <p className="font-semibold text-foreground">{data.currentEnrollment?.length || 0}</p>
        </Card>
      </div>

      {/* What's Next */}
      <Card className="bg-secondary/30 border-border/50 p-6 space-y-3 backdrop-blur-sm">
        <h3 className="font-semibold text-foreground">Próximos pasos:</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="text-accent font-bold flex-shrink-0">1.</span>
            <span>Ve a tu Dashboard para ver tus cursos activos</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent font-bold flex-shrink-0">2.</span>
            <span>Explora tu Malla Curricular completa en "Mi Malla"</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent font-bold flex-shrink-0">3.</span>
            <span>Descubre recursos personalizados en la Biblioteca</span>
          </li>
        </ul>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Button onClick={onBack} variant="outline" size="lg" className="gap-2 bg-transparent">
          <ChevronLeft className="w-4 h-4" /> Atrás
        </Button>
        <Button
          onClick={onComplete}
          disabled={isSubmitting}
          size="lg"
          className="gap-2 px-8 gradient-brand-hover text-white border-0"
        >
          {isSubmitting ? "Guardando..." : "Comenzar mi Ruta"} <Sparkles className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
