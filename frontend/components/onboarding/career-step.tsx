"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"


interface CareerStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  careers: any[]
}

export function CareerStep({ data, onNext, careers }: CareerStepProps) {
  const [selected, setSelected] = useState(data.career)

  const handleSelect = (careerId: string) => {
    setSelected(careerId)
  }

  const handleContinue = () => {
    if (selected) {
      onNext({ career: selected })
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-foreground font-poppins">¿Cuál es tu carrera?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Selecciona tu programa académico para personalizar tu malla curricular
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {careers?.map((career) => (
          <button
            key={career.id}
            onClick={() => handleSelect(career.id.toString())}
            className={`relative p-6 rounded-xl border-2 transition-all duration-200 group overflow-hidden ${selected === career.id.toString()
              ? "border-[#a6249d] bg-[#a6249d]/5 shadow-lg shadow-[#a6249d]/10"
              : "border-border bg-card hover:border-[#a6249d]/50 hover:shadow-md"
              }`}
          >
            {/* Animated background for selected state */}
            {selected === career.id.toString() && (
              <div className="absolute inset-0 bg-gradient-to-r from-[#a6249d]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            )}

            <div className="relative space-y-3 text-center">
              <div className="text-4xl">{career.codigo === 'IS' || career.codigo === 'CS' ? '🖥️' : '🎓'}</div>
              <div className="text-center">
                <p className="font-semibold text-foreground group-hover:text-[#a6249d] transition-colors">{career.name}</p>
                {selected === career.id.toString() && <p className="text-sm text-muted-foreground">{career.codigo}</p>}
              </div>
              {selected === career.id.toString() && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-[#a6249d] rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Continue Button */}
      <div className="flex justify-center pt-4">
        <Button 
          onClick={handleContinue} 
          disabled={!selected} 
          size="lg" 
          className="gap-2 px-8 bg-primary hover:bg-[#bf2a51] text-white font-bold font-poppins shadow-sm"
        >
          Continuar <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
