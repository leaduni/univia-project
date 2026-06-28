"use client"

import React from "react"
import { 
  BadgeCheck, 
  Lock, 
  PlayCircle, 
  Circle,
  Info,
  ChevronDown
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { COURSE_STATUS_MAP } from "@/lib/course-status"

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

const statusIcons = {
  completed: BadgeCheck,
  in_progress: PlayCircle,
  available: Circle,
  locked: Lock,
}

const StatusBadge = ({ status }: { status: Course["status"] }) => {
  const config = COURSE_STATUS_MAP[status]
  const Icon = statusIcons[status]
  return (
    <Badge className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${config.badge}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

export const MallaCurricular: React.FC<MallaCurricularProps> = ({ malla, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {malla.map((ciclo, idx) => {
        const cicloNum = ciclo.ciclo.split(" ")[1]
        return (
        <div key={idx} className="group">
          <details className="w-full" open={idx === 0}>
            <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted transition-colors list-none">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
                  {cicloNum}
                </div>
                <div>
                  <h3 className="font-bold text-foreground tracking-tight">{ciclo.ciclo}</h3>
                  <p className="text-xs text-muted-foreground font-medium">{ciclo.credits} Créditos Académicos</p>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" />
            </summary>
            
            <div className="px-5 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                {ciclo.courses.map((curso) => {
                  const config = COURSE_STATUS_MAP[curso.status]
                  const isLocked = curso.status === "locked"
                  return (
                  <div 
                    key={curso.id}
                    className={`relative p-4 rounded-xl border transition-all ${config.card} ${
                      isLocked 
                      ? 'cursor-not-allowed' 
                      : 'hover:border-primary/30 hover:shadow-md hover:shadow-primary/5'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                        {curso.code}
                      </span>
                      <StatusBadge status={curso.status} />
                    </div>
                    
                    <h4 className="text-sm font-bold text-foreground leading-snug mb-1 line-clamp-2 min-h-[2.5rem]">
                      {curso.name}
                    </h4>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <span className="text-primary">{curso.credits}</span>
                        <span>Créditos</span>
                      </div>
                      
                      {curso.description && (
                        <button className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground" title="Ver detalles">
                          <Info className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {curso.progreso !== undefined && curso.progreso > 0 && (
                      <div className="mt-3 pt-2 border-t border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-muted-foreground">Progreso</span>
                          <span className="text-[10px] font-bold text-primary">{curso.progreso}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              curso.status === 'completed' ? 'bg-emerald-500' : 'bg-primary'
                            }`}
                            style={{ width: `${curso.progreso}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            </div>
          </details>
        </div>
        )}
      )}
    </div>
  )
}
