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
    <div className="space-y-6 max-w-2xl mx-auto font-sans">
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
                  background: ['#d93340', '#a6249d', '#7957f1'][Math.floor(Math.random() * 3)],
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
          <div className="absolute inset-0 bg-gradient-to-r from-[#d93340] via-[#a6249d] to-[#7957f1] rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-[#a6249d]/10 border-2 border-[#a6249d] rounded-full p-8">
            <CheckCircle className="w-16 h-16 text-[#a6249d]" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-foreground flex items-center justify-center gap-2 font-poppins">
          ¡Perfil Listo! <Sparkles className="w-6 h-6 text-[#a6249d]" />
        </h2>
        <p className="text-muted-foreground">Tu malla curricular está personalizada. Aquí está tu resumen:</p>
      </div>

      {/* Profile Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Career */}
        <Card className="p-4 bg-gradient-to-br from-[#030c40]/10 to-[#030c40]/5 border-[#030c40]/20 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1">Carrera</p>
          <p className="font-semibold text-foreground text-balance font-poppins">{careerName}</p>
        </Card>

        {/* Semester */}
        <Card className="p-4 bg-gradient-to-br from-[#a6249d]/10 to-[#a6249d]/5 border-[#a6249d]/20 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1">Semestre Actual</p>
          <p className="font-semibold text-foreground font-poppins">{data.semester} de 8</p>
        </Card>

        {/* Enrollment */}
        <Card className="p-4 bg-gradient-to-br from-[#d7cef7]/10 to-[#d7cef7]/5 border-border backdrop-blur-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1">Cursos Inscritos</p>
          <p className="font-semibold text-foreground font-poppins">{data.currentEnrollment?.length || 0}</p>
        </Card>
      </div>

      {/* What's Next */}
      <Card className="bg-[#d7cef7]/20 border-border/50 p-6 space-y-3 backdrop-blur-sm">
        <h3 className="font-semibold text-foreground font-poppins">Próximos pasos:</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="text-[#a6249d] font-bold flex-shrink-0">1.</span>
            <span>Ve a tu Dashboard para ver tus cursos activos</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#a6249d] font-bold flex-shrink-0">2.</span>
            <span>Explora tu Malla Curricular completa en "Mi Malla"</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#a6249d] font-bold flex-shrink-0">3.</span>
            <span>Descubre recursos personalizados en la Biblioteca</span>
          </li>
        </ul>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Button onClick={onBack} variant="outline" size="lg" className="gap-2 bg-transparent border-[#a6249d] text-[#a6249d] hover:bg-[#a6249d]/5 font-bold font-poppins">
          <ChevronLeft className="w-4 h-4" /> Atrás
        </Button>
        <Button
          onClick={onComplete}
          disabled={isSubmitting}
          size="lg"
          className="gap-2 px-8 bg-primary hover:bg-[#bf2a51] text-white font-bold font-poppins shadow-sm"
        >
          {isSubmitting ? "Guardando..." : "Comenzar mi Ruta"} <Sparkles className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
