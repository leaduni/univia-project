"use client"

import { useState } from "react"
import { ChevronLeft, ArrowRight } from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"

interface SemesterStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  onBack: () => void
}

export function SemesterStep({ data, onNext, onBack }: SemesterStepProps) {
  const [selected, setSelected] = useState(data.semester)

  const handleSelect = (semester: number) => {
    setSelected(semester)
  }

  const handleContinue = () => {
    onNext({ semester: selected })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          &iquest;En qu&eacute; semestre est&aacute;s?
        </h1>
        <p className="text-sm text-slate-300 max-w-md mx-auto">
          Selecciona el semestre actual para ver tu progreso acad&eacute;mico.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-6">
        {Array.from({ length: 8 }, (_, i) => i + 1).map((semester) => {
          const isSelected = selected === semester
          return (
            <button
              key={semester}
              onClick={() => handleSelect(semester)}
              className={`py-4 px-3 rounded-2xl border text-center transition-all duration-200 ${
                isSelected
                  ? "bg-[#181438] border-[#ec4899] shadow-lg shadow-pink-500/20 ring-1 ring-[#ec4899]"
                  : "bg-[#121124]/80 border-[#232045] hover:border-[#3d376e] hover:bg-[#16142e]"
              }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Semestre
              </span>
              <span className={`text-2xl font-black ${isSelected ? "text-white" : "text-slate-200"}`}>
                {semester}
              </span>
            </button>
          )
        })}
      </div>

      <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-[#121124]/60 border border-[#232045] text-center backdrop-blur-md mb-8">
        <p className="text-xs text-slate-300">
          Esto nos ayudar&aacute; a personalizar tu malla curricular y recomendaciones de aprendizaje.
        </p>
      </div>

      <div className="flex justify-between items-center pt-4 max-w-2xl mx-auto w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3b3475] bg-[#1d1a3b] text-sm font-semibold text-white hover:bg-[#282452] hover:border-[#ec4899] transition-all shadow-md"
        >
          <ChevronLeft className="w-4 h-4" /> Atr&aacute;s
        </button>
        <button
          onClick={handleContinue}
          className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#a855f7] hover:opacity-90 transition-all shadow-lg shadow-pink-500/20 flex items-center gap-2"
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
