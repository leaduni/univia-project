"use client"

import { CheckCircle2, ChevronLeft, ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import type { OnboardingData } from "@/types/onboarding"

interface CompletionStepProps {
  data: OnboardingData
  onBack: () => void
  onComplete: () => void
  isSubmitting?: boolean
  careerName?: string
}

export function CompletionStep({ data, onBack, onComplete, isSubmitting = false, careerName = "Tu carrera" }: CompletionStepProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    setShowConfetti(true)
  }, [])

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {showConfetti && (
        <>
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

      {/* Header y Felicitaciones Centradas */}
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-[#ec4899] to-[#a855f7] p-0.5 shadow-lg shadow-pink-500/30 flex items-center justify-center">
          <div className="w-full h-full bg-[#0b0a16] rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[#ec4899]" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          &iexcl;Perfil Listo! <span className="text-pink-400">&#x2728;</span>
        </h1>
        <p className="text-sm text-slate-300 max-w-md mx-auto">
          Tu malla curricular est&aacute; personalizada. Aqu&iacute; est&aacute; tu resumen:
        </p>
      </div>

      {/* Tarjetas de Resumen Centradas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
        <div className="p-4 rounded-2xl bg-[#121124]/80 border border-[#232045] text-center space-y-1">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Carrera</span>
          <p className="text-sm font-extrabold text-white truncate">{careerName}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#121124]/80 border border-[#232045] text-center space-y-1">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Semestre Actual</span>
          <p className="text-sm font-extrabold text-white">{data.semester} de 8</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#121124]/80 border border-[#232045] text-center space-y-1">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Cursos Inscritos</span>
          <p className="text-sm font-extrabold text-white">{data.cursosInscritos?.length || 0}</p>
        </div>
      </div>

      {/* Pr&oacute;ximos Pasos con N&uacute;meros Destacados */}
      <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-[#121124]/80 border border-[#232045] space-y-4 mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Pr&oacute;ximos pasos:
        </h3>
        <ul className="space-y-3 text-xs text-slate-200">
          <li className="flex items-center gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#211d45] border border-[#3b3475] text-[#ec4899] font-bold flex items-center justify-center text-[11px]">1</span>
            <span>Ve a tu Dashboard para ver tus cursos activos</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#211d45] border border-[#3b3475] text-[#ec4899] font-bold flex items-center justify-center text-[11px]">2</span>
            <span>Explora tu Malla Curricular completa en &quot;Mi Malla&quot;</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#211d45] border border-[#3b3475] text-[#ec4899] font-bold flex items-center justify-center text-[11px]">3</span>
            <span>Descubre recursos personalizados en la Biblioteca</span>
          </li>
        </ul>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3b3475] bg-[#1d1a3b] text-sm font-semibold text-white hover:bg-[#282452] hover:border-[#ec4899] transition-all shadow-md"
        >
          <ChevronLeft className="w-4 h-4" /> Atr&aacute;s
        </button>
        <button
          onClick={onComplete}
          disabled={isSubmitting}
          className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#a855f7] hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-pink-500/20 flex items-center gap-2"
        >
          {isSubmitting ? "Guardando..." : "Comenzar mi Ruta"} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
