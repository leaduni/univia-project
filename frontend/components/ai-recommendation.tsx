// Full-width AI recommendation banner (prototype-aligned)
"use client"
import { Sparkles } from "lucide-react"

export function AIRecommendation() {
  return (
    <div className="bg-[#1a1836] border border-[#2d2959] rounded-xl p-6 relative overflow-hidden">
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center gradient-btn-pink-violet">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-white mb-1">Recomendación de IA</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Basado en tu desempeño en Programación I, te recomendamos practicar más sobre
              <span className="ai-glow-text ml-1">Algoritmos de Ordenamiento</span>. Completar 3 ejercicios adicionales
              mejorará tu comprensión en un 15% antes del examen parcial.
            </p>
          </div>
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-white gradient-btn-pink-violet border-0 transition-all hover:opacity-90 shrink-0">
          Practicar ahora
        </button>
      </div>
    </div>
  )
}
