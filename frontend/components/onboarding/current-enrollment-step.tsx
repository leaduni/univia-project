"use client"

import { useState, useMemo, useEffect } from "react"
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  Lock,
  Loader2,
  Circle,
  ArrowRight,
  AlertCircle,
  Info,
} from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"
import { apiService } from "@/lib/api-service"
import { aRomano, MAX_CURSOS_INSCRITOS } from "@/lib/ciclos"

interface CurrentEnrollmentStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  onBack: () => void
  carrera_id: number
}

/** Espejo de `PrerrequisitoFaltante` del backend. */
interface PrerrequisitoFaltante {
  id: number
  code: string
  name: string
}

/** Espejo de `CursoPrereqItem` del backend. */
interface CursoItem {
  id: number
  code: string
  name: string
  credits: number
  ciclo: number
  carrera_id: number
  prerrequisito_ids: number[]
  status: string
  prerrequisitos_faltantes?: PrerrequisitoFaltante[]
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
  // Curso bloqueado sobre el que se pidió explicación. Un `title` no sirve:
  // en móvil no hay hover y el estudiante se queda sin saber por qué no puede.
  const [motivoVisible, setMotivoVisible] = useState<number | null>(null)

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
          ciclo: `Ciclo ${aRomano(c.ciclo)}`,
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

  const creditosSeleccionados = useMemo(
    () => cursos.filter((c) => selected.has(c.id)).reduce((total, c) => total + c.credits, 0),
    [cursos, selected]
  )

  const topeAlcanzado = selected.size >= MAX_CURSOS_INSCRITOS

  const handleToggleCourse = (courseId: number) => {
    const newSelected = new Set(selected)
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId)
    } else {
      // El backend rechaza más de 12 cursos: cortarlo aquí evita que el
      // estudiante arme toda su inscripción y recién falle al enviarla.
      if (topeAlcanzado) return
      newSelected.add(courseId)
    }
    setSelected(newSelected)
    setMotivoVisible(null)
  }

  const handleContinue = () => {
    if (selected.size >= 1) {
      onNext({
        cursosInscritos: Array.from(selected),
        creditosInscritos: creditosSeleccionados,
      })
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
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-muted-foreground">Cargando cursos de la carrera...</p>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-16">
        <div className="p-4 rounded-full bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold text-foreground">
            No pudimos cargar los cursos
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">{fetchError}</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-card border border-border hover:bg-muted transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          ¿Qué cursos llevas este ciclo?
        </h1>
        <p className="text-sm text-muted-foreground">
          Marca los cursos en los que estás matriculado. Los aprobados y los que ya
          llevas aparecen marcados y no necesitas tocarlos.
        </p>
      </div>

      <div className="max-w-3xl mx-auto max-h-[500px] overflow-y-auto pr-2 space-y-3">
        {curriculum.map((cicloData) => {
          const isExpanded = expanded.has(cicloData.ciclo)
          return (
            <div key={cicloData.ciclo} className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCiclo(cicloData.ciclo)}
                aria-expanded={isExpanded}
                className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-heading font-semibold text-foreground">{cicloData.ciclo}</h3>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {cicloData.credits} créditos
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="p-4 pt-3 space-y-3">
                  {/* Píldoras: los cursos de un ciclo se leen de un vistazo,
                      sin la altura de una tarjeta por curso. */}
                  <div className="flex flex-wrap gap-2">
                    {cicloData.courses.map((course) => {
                      const isAvailable = course.status === "available"
                      const isCompleted = course.status === "completed"
                      const isInProgress = course.status === "in_progress"
                      const isLocked = course.status === "locked"
                      const isSelected = selected.has(course.id)
                      const isConflicted = conflictSet.has(course.id) && !isSelected
                      const bloqueadoPorTope = topeAlcanzado && !isSelected && isAvailable
                      const seleccionable = isAvailable && !isConflicted && !bloqueadoPorTope

                      const estilo = isCompleted
                        ? "border-accent/30 bg-accent/10 text-accent"
                        : isInProgress
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : isSelected
                            ? "border-accent bg-accent/15 text-foreground ring-1 ring-accent"
                            : isConflicted || isLocked || bloqueadoPorTope
                              ? "border-border/50 bg-card/40 text-muted-foreground"
                              : "border-border bg-card text-foreground hover:border-accent/50"

                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => {
                            if (seleccionable) handleToggleCourse(course.id)
                            // Un curso bloqueado explica por qué lo está en vez
                            // de quedarse mudo.
                            else if (isLocked || isConflicted) {
                              setMotivoVisible(motivoVisible === course.id ? null : course.id)
                            }
                          }}
                          aria-pressed={isSelected}
                          title={`${course.code} · ${course.name} · ${course.credits} créditos`}
                          className={`inline-flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-full border text-left transition-all duration-200 ${estilo} ${
                            seleccionable || isLocked || isConflicted ? "" : "cursor-not-allowed"
                          }`}
                        >
                          <span className="shrink-0">
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isInProgress ? (
                              <Circle className="w-4 h-4 fill-primary text-primary" />
                            ) : isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-accent" />
                            ) : isConflicted || isLocked ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/60" />
                            )}
                          </span>
                          <span className="text-xs font-semibold tracking-wide">{course.code}</span>
                          <span className="text-xs max-w-[14rem] truncate">{course.name}</span>
                          {isCompleted && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                              Aprobado
                            </span>
                          )}
                          {isInProgress && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                              En curso
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Explicación del bloqueo, con los prerrequisitos que el
                      backend ya calcula (RF-EST-03). */}
                  {cicloData.courses
                    .filter((c) => c.id === motivoVisible)
                    .map((course) => {
                      const faltantes = course.prerrequisitos_faltantes ?? []
                      return (
                        <div
                          key={`motivo-${course.id}`}
                          className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground"
                        >
                          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          <p className="leading-relaxed">
                            <span className="font-semibold text-foreground">{course.name}</span>{" "}
                            {faltantes.length > 0 ? (
                              <>
                                está bloqueado porque te falta aprobar:{" "}
                                <span className="text-foreground">
                                  {faltantes.map((p) => `${p.code} ${p.name}`).join(", ")}
                                </span>
                                .
                              </>
                            ) : (
                              <>
                                no se puede llevar junto con otro curso que ya
                                seleccionaste, porque uno es prerrequisito del otro.
                              </>
                            )}
                          </p>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-card border border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Cursos a inscribir:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/15 text-accent border border-accent/40">
            {selected.size}
          </span>
          {creditosSeleccionados > 0 && (
            <span className="text-xs text-muted-foreground">
              · {creditosSeleccionados} créditos
            </span>
          )}
        </div>
        {topeAlcanzado && (
          <span className="text-xs text-muted-foreground">
            Llegaste al máximo de {MAX_CURSOS_INSCRITOS} cursos.
          </span>
        )}
        {!isValidEnrollment && (
          <span className="text-xs text-muted-foreground">
            Marca al menos 1 curso para continuar.
          </span>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 max-w-3xl mx-auto w-full">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted hover:border-accent/40 transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Atrás
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!isValidEnrollment || cursos.length === 0}
          className="px-8 py-3 rounded-xl font-semibold text-sm text-primary-foreground gradient-login-btn disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-accent/20 active:scale-[0.99] flex items-center gap-2"
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
