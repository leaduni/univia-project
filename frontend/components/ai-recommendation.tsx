"use client"
import { Sparkles } from "lucide-react"

export function AIRecommendation() {
  return (
    <div className="rounded-lg ai-card-neon p-6 overflow-hidden relative ai-neon-glow">
      <div className="relative z-10">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg gradient-ai-neon">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-sidebar-foreground mb-2">Recomendación de IA</h3>
            <p className="text-sm text-sidebar-foreground/70 mb-4 leading-relaxed">
              Basado en tu desempeño en Programación I, te recomendamos practicar más sobre
              <span className="ai-glow-text ml-1">Algoritmos de Ordenamiento</span>. Completar 3 ejercicios adicionales
              mejorará tu comprensión en un 15% antes del examen parcial.
            </p>
            <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Ver sugerencias detalladas →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
