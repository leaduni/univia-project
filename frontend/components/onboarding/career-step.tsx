"use client"

import { useState } from "react"
import { ArrowRight, Network, Code, Factory, Cpu, Building2, GraduationCap } from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"

const getCareerIcon = (name: string = "") => {
  const n = name.toLowerCase()
  if (n.includes("sistema") || n.includes("red")) return Network
  if (n.includes("software") || n.includes("computac")) return Code
  if (n.includes("industr")) return Factory
  if (n.includes("mecatr") || n.includes("electr")) return Cpu
  if (n.includes("civil") || n.includes("estruct")) return Building2
  return GraduationCap
}

interface CareerStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  careers: any[]
}

export function CareerStep({ data, onNext, careers }: CareerStepProps) {
  const [selected, setSelected] = useState<number>(data.career)

  const handleSelect = (careerId: number) => {
    setSelected(careerId)
  }

  const handleContinue = () => {
    if (selected > 0) {
      onNext({ career: selected })
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          &iquest;Qu&eacute; carrera estudias?
        </h1>
        <p className="text-sm text-slate-300">
          Con esto armamos tu malla curricular personalizada.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {careers?.map((career) => {
          const Icon = getCareerIcon(career.name)
          const isSelected = selected === career.id
          return (
            <button
              key={career.id}
              onClick={() => handleSelect(career.id)}
              className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 ${
                isSelected
                  ? "bg-[#181438] border-[#ec4899] shadow-lg shadow-pink-500/10 ring-1 ring-[#ec4899]"
                  : "bg-[#121124]/80 border-[#232045] hover:border-[#3d376e] hover:bg-[#16142e]"
              }`}
            >
              <div className={`p-3 rounded-xl ${isSelected ? "bg-gradient-to-br from-[#ec4899] to-[#a855f7] text-white" : "bg-[#1d1a3b] text-slate-300"}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{career.name}</h3>
                <span className="text-xs font-semibold text-slate-400">{career.codigo || "UNI"}</span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleContinue}
          disabled={!selected}
          className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#a855f7] hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-pink-500/20 flex items-center gap-2"
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
