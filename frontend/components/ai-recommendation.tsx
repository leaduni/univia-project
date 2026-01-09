"use client"
import { Sparkles } from "lucide-react"

export function AIRecommendation() {
  return (
    <div className="ai-glow rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-cyan-200/50 dark:border-cyan-900/50 p-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">Recomendación de IA</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Basado en tu desempeño en Programación I, te recomendamos practicar más sobre
              <span className="ai-glow-text ml-1">Algoritmos de Ordenamiento</span>. Completar 3 ejercicios adicionales
              mejorará tu comprensión en un 15% antes del examen parcial.
            </p>
            <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
              Ver sugerencias detalladas →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
