"use client"

import React from "react"
import { 
  CheckCircle2, 
  Lock, 
  PlayCircle, 
  Circle,
  Info,
  ChevronDown
} from "lucide-react"

interface Course {
  id: string
  code: string
  name: string
  credits: number
  status: "available" | "in_progress" | "completed" | "locked"
  description?: string
  progreso?: number
}

interface Ciclo {
  ciclo: string
  credits: number
  courses: Course[]
}

interface MallaCurricularProps {
  malla: Ciclo[]
  isLoading: boolean
}

const StatusBadge = ({ status }: { status: Course["status"] }) => {
  const styles = {
    completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    in_progress: "bg-indigo-50 text-indigo-700 border-indigo-100",
    available: "bg-slate-50 text-slate-600 border-slate-100",
    locked: "bg-slate-100 text-slate-400 border-slate-200 opacity-60",
  }

  const labels = {
    completed: "Completado",
    in_progress: "En Curso",
    available: "Disponible",
    locked: "Bloqueado",
  }

  const icons = {
    completed: <CheckCircle2 className="w-3 h-3" />,
    in_progress: <PlayCircle className="w-3 h-3" />,
    available: <Circle className="w-3 h-3" />,
    locked: <Lock className="w-3 h-3" />,
  }

  return (
    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status]}`}>
      {icons[status]}
      {labels[status]}
    </span>
  )
}

export const MallaCurricular: React.FC<MallaCurricularProps> = ({ malla, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full bg-slate-100 animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      {malla.map((ciclo, idx) => (
        <div key={idx} className="group">
          <details className="w-full" open={idx === 0}>
            <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors list-none">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm border border-indigo-100">
                  {ciclo.ciclo.split(" ")[1]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 tracking-tight">{ciclo.ciclo}</h3>
                  <p className="text-xs text-slate-500 font-medium">{ciclo.credits} Créditos Académicos</p>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            
            <div className="px-5 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                {ciclo.courses.map((curso) => (
                  <div 
                    key={curso.id}
                    className={`relative p-4 rounded-xl border transition-all ${
                      curso.status === 'locked' 
                      ? 'bg-slate-50/50 border-slate-100' 
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                        {curso.code}
                      </span>
                      <StatusBadge status={curso.status} />
                    </div>
                    
                    <h4 className="text-sm font-bold text-slate-800 leading-snug mb-1 line-clamp-2 min-h-[2.5rem]">
                      {curso.name}
                    </h4>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <span className="text-indigo-600">{curso.credits}</span>
                        <span>Créditos</span>
                      </div>
                      
                      {curso.description && (
                        <button className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400" title="Ver detalles">
                          <Info className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {curso.status === 'in_progress' && curso.progreso !== undefined && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 rounded-b-xl overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-500" 
                          style={{ width: `${curso.progreso}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>
      ))}
    </div>
  )
}