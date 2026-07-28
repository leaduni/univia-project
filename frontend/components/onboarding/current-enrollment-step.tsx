"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronRight, ChevronLeft, ChevronDown, CheckCircle2, Lock, Loader2, Circle, ArrowRight } from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"
import { apiService } from "@/lib/api-service"

interface CurrentEnrollmentStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  onBack: () => void
  carrera_id: number
}

interface CursoItem {
  id: number
  code: string
  name: string
  credits: number
  ciclo: number
  carrera_id: number
  prerrequisito_ids: number[]
  status: string
}

interface CicloGroup {
  ciclo: string
  cicloNum: number
  credits: number
  courses: CursoItem[]
}

function resolvePrereqs(courseId: number, prereqMap: Record<number, number[]>): Set<number> {
  const visited = new Set<number>()
  const queue = [courseId]
  while (queue.length > 0) {
    const curr = queue.shift()!
    for (const pid of prereqMap[curr] || []) {
      if (!visited.has(pid)) {
        visited.add(pid)
        queue.push(pid)
      }
    }
  }
  return visited
}

function resolveSuccessors(courseId: number, prereqMap: Record<number, number[]>): Set<number> {
  const reverse: Record<number, number[]> = {}
  for (const [cid, prereqs] of Object.entries(prereqMap)) {
    for (const pid of prereqs) {
      if (!reverse[pid]) reverse[pid] = []
      reverse[pid].push(Number(cid))
    }
  }

  const visited = new Set<number>()
  const queue = [courseId]
  while (queue.length > 0) {
    const curr = queue.shift()!
    for (const dep of reverse[curr] || []) {
      if (!visited.has(dep)) {
        visited.add(dep)
        queue.push(dep)
      }
    }
  }
  return visited
}

function getConflictSet(courseId: number, prereqMap: Record<number, number[]>): Set<number> {
  const prereqs = resolvePrereqs(courseId, prereqMap)
  const successors = resolveSuccessors(courseId, prereqMap)
  return new Set([...prereqs, ...successors])
}

export function CurrentEnrollmentStep({ data, onNext, onBack, carrera_id }: CurrentEnrollmentStepProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [cursos, setCursos] = useState<CursoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!carrera_id || carrera_id <= 0) return
    const fetchCursos = async () => {
      setLoading(true)
      setFetchError(null)
      try {
        const cicloParsed = data.semester ? Number(data.semester) : 1
        const result = await apiService.getEnvironmentCursos(carrera_id, cicloParsed)
        const items: CursoItem[] = result?.cursos || []
        setCursos(items)

        const previousIds = new Set(data.cursosInscritos || [])
        const initialSelected = new Set(
          items.filter((c) => c.status === "available" && previousIds.has(c.id)).map((c) => c.id)
        )
        setSelected(initialSelected)
      } catch (err: any) {
        console.error("Error fetching courses:", err)
        setFetchError(err.message || "Error al cargar cursos")
      } finally {
        setLoading(false)
      }
    }
    fetchCursos()
  }, [carrera_id, data.cursosInscritos])

  const prereqMap = useMemo(() => {
    const map: Record<number, number[]> = {}
    for (const c of cursos) {
      if (c.prerrequisito_ids.length > 0) {
        map[c.id] = c.prerrequisito_ids
      }
    }
    return map
  }, [cursos])

  const curriculum = useMemo(() => {
    const groups: Record<number, CicloGroup> = {}
    for (const c of cursos) {
      if (!groups[c.ciclo]) {
        groups[c.ciclo] = {
          ciclo: `Ciclo ${c.ciclo}`,
          cicloNum: c.ciclo,
          credits: 0,
          courses: [],
        }
      }
      groups[c.ciclo].credits += c.credits
      groups[c.ciclo].courses.push(c)
    }
    return Object.values(groups).sort((a, b) => a.cicloNum - b.cicloNum)
  }, [cursos])

  const expandedDefault = useMemo(() => {
    const cycles = new Set<string>()
    for (const cg of curriculum) {
      if (cg.cicloNum <= data.semester) {
        cycles.add(cg.ciclo)
      }
    }
    return cycles
  }, [curriculum, data.semester])

  const [expanded, setExpanded] = useState<Set<string>>(expandedDefault)

  useEffect(() => {
    setExpanded(expandedDefault)
  }, [expandedDefault])

  const conflictSet = useMemo(() => {
    const conflicts = new Set<number>()
    for (const cid of selected) {
      for (const conflictId of getConflictSet(cid, prereqMap)) {
        conflicts.add(conflictId)
      }
    }
    return conflicts
  }, [selected, prereqMap])

  const handleToggleCourse = (courseId: number) => {
    const newSelected = new Set(selected)
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId)
    } else {
      newSelected.add(courseId)
    }
    setSelected(newSelected)
  }

  const handleContinue = () => {
    if (selected.size >= 1) {
      onNext({ cursosInscritos: Array.from(selected) })
    }
  }

  const isValidEnrollment = selected.size >= 1

  const toggleCiclo = (ciclo: string) => {
    const next = new Set(expanded)
    if (next.has(ciclo)) {
      next.delete(ciclo)
    } else {
      next.add(ciclo)
    }
    setExpanded(next)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-16">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
        <p className="text-slate-400">Cargando cursos de la carrera...</p>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="text-center space-y-4 py-16">
        <p className="text-rose-400 font-medium">Error al cargar los cursos</p>
        <p className="text-slate-400 text-sm">{fetchError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl border border-[#3b3475] bg-[#1d1a3b] text-sm font-semibold text-white hover:bg-[#282452] transition-all shadow-md"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
          Inscripci&oacute;n Actual
        </h1>
        <p className="text-sm text-slate-300">
          Selecciona los cursos que cursar&aacute;s este semestre. Los cursos ya aprobados o en curso aparecen marcados y no requieren acci&oacute;n.
        </p>
      </div>

      <div className="max-w-3xl mx-auto max-h-[500px] overflow-y-auto pr-4 space-y-3">
        {curriculum.map((cicloData) => {
          const isExpanded = expanded.has(cicloData.ciclo)
          return (
            <div key={cicloData.ciclo} className="rounded-xl border border-[#232045] overflow-hidden">
              <button
                onClick={() => toggleCiclo(cicloData.ciclo)}
                className="w-full flex items-center justify-between p-4 bg-[#14132a]/80 hover:bg-[#1a1738] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-white">{cicloData.ciclo}</h3>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#1e1b3a] text-slate-400">
                    {cicloData.credits} cr&eacute;ditos
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cicloData.courses.map((course) => {
                    const isAvailable = course.status === "available"
                    const isCompleted = course.status === "completed"
                    const isInProgress = course.status === "in_progress"
                    const isLocked = course.status === "locked"
                    const isSelected = selected.has(course.id)
                    const isConflicted = conflictSet.has(course.id) && !isSelected
                    const isDisabled = !isAvailable || isConflicted

                    return (
                      <button
                        key={course.id}
                        onClick={() => isAvailable && !isConflicted && handleToggleCourse(course.id)}
                        disabled={isDisabled}
                        className={`p-4 rounded-xl border-2 transition-all text-left group relative overflow-hidden backdrop-blur-sm ${
                          isCompleted
                            ? "border-emerald-700/40 bg-emerald-950/20"
                            : isInProgress
                              ? "border-fuchsia-700/40 bg-fuchsia-950/20"
                              : isSelected
                                ? "border-[#ec4899] bg-gradient-to-br from-[#ec4899]/15 to-[#a855f7]/5 shadow-lg shadow-pink-500/20"
                                : isConflicted || isLocked
                                  ? "border-[#232045]/40 bg-[#121124]/40 cursor-not-allowed opacity-60"
                                  : "border-[#232045] bg-[#121124]/60 hover:border-[#ec4899]/50 hover:shadow-md"
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                        <div className="relative flex items-start gap-3">
                          <div className="flex-shrink-0 pt-1">
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : isInProgress ? (
                              <Circle className="w-5 h-5 text-fuchsia-400 fill-fuchsia-700" />
                            ) : isSelected ? (
                              <CheckCircle2 className="w-5 h-5 text-[#ec4899]" />
                            ) : isConflicted || isLocked ? (
                              <Lock className="w-5 h-5 text-slate-500" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-slate-500 group-hover:border-[#ec4899]/50 transition-colors" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs text-slate-400 font-medium">{course.code}</p>
                              {isCompleted && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300">
                                  Aprobado
                                </span>
                              )}
                              {isInProgress && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-fuchsia-900/40 text-fuchsia-300">
                                  En Curso
                                </span>
                              )}
                            </div>
                            <p className={`font-semibold transition-colors text-sm truncate ${
                              isCompleted
                                ? "text-emerald-300"
                                : isInProgress
                                  ? "text-fuchsia-300"
                                  : isSelected
                                    ? "text-[#ec4899]"
                                    : isConflicted || isLocked
                                      ? "text-slate-500"
                                      : "text-white group-hover:text-[#ec4899]"
                            }`}>
                              {course.name}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{course.credits} cr&eacute;ditos</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="p-4 rounded-2xl bg-[#14132a]/90 border border-[#27244a] backdrop-blur-md flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">Cursos a inscribir:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ec4899]/20 text-[#ec4899] border border-[#ec4899]/40">
            {selected.size}
          </span>
        </div>
        {conflictSet.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Cursos bloqueados por prerrequisito:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {conflictSet.size}
            </span>
          </div>
        )}
        {!isValidEnrollment && (
          <span className="text-xs text-yellow-400">Debes seleccionar al menos 1 curso para continuar</span>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3b3475] bg-[#1d1a3b] text-sm font-semibold text-white hover:bg-[#282452] hover:border-[#ec4899] transition-all shadow-md"
        >
          <ChevronLeft className="w-4 h-4" /> Atr&aacute;s
        </button>
        <button
          onClick={handleContinue}
          disabled={!isValidEnrollment || cursos.length === 0}
          className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#a855f7] hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-pink-500/20 flex items-center gap-2"
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}