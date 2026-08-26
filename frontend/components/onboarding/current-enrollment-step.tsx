"use client"

import { useState, useMemo, useEffect } from "react"
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Circle,
  ArrowRight,
  AlertCircle,
  Info,
  Search,
  History,
} from "lucide-react"
import type { OnboardingData } from "@/types/onboarding"
import { apiService } from "@/lib/api-service"
import { aRomano, MAX_CURSOS_INSCRITOS } from "@/lib/ciclos"

interface CurrentEnrollmentStepProps {
  data: OnboardingData
  onNext: (data: Partial<OnboardingData>) => void
  onBack: () => void
  carrera_id: number
  malla_id?: number
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

export function CurrentEnrollmentStep({
  data,
  onNext,
  onBack,
  carrera_id,
  malla_id,
}: CurrentEnrollmentStepProps) {
  const cicloActual = Number(data.semester) || 1

  const [cursos, setCursos] = useState<CursoItem[]>([])
  // Historial declarado. El sistema no tiene de dónde deducirlo: `progreso_cursos`
  // está vacía en el onboarding, así que solo lo sabe el estudiante.
  const [aprobados, setAprobados] = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [ciclosCerrados, setCiclosCerrados] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!carrera_id || carrera_id <= 0) return
    let activo = true

    const fetchCursos = async () => {
      setLoading(true)
      setFetchError(null)
      try {
        const result = await apiService.getEnvironmentCursos(
          carrera_id,
          cicloActual,
          data.malla_id || malla_id,
        )
        const items: CursoItem[] = result?.cursos || []
        if (!activo) return
        setCursos(items)

        // Al volver atrás en el wizard se conserva lo ya declarado; en la
        // primera visita se asume la progresión normal de malla: todo lo de
        // ciclos anteriores está aprobado y el estudiante solo desmarca sus
        // excepciones (cursos jalados o que aún no lleva).
        // Se compara contra undefined, no por verdad: una declaración vacía
        // ("no aprobé nada") es válida y no debe re-pre-marcarse.
        const previosAprobados = data.cursosAprobados
        setAprobados(
          previosAprobados !== undefined
            ? new Set(previosAprobados)
            : new Set(
                items
                  .filter((c) => c.ciclo < cicloActual || c.status === "completed")
                  .map((c) => c.id),
              ),
        )

        const previousIds = new Set(data.cursosInscritos || [])
        setSelected(new Set(items.filter((c) => previousIds.has(c.id)).map((c) => c.id)))
      } catch (err: any) {
        if (!activo) return
        console.error("Error fetching courses:", err)
        setFetchError(err.message || "Error al cargar cursos")
      } finally {
        if (activo) setLoading(false)
      }
    }

    fetchCursos()
    return () => {
      activo = false
    }
    // `data.cursosAprobados`/`cursosInscritos` solo se leen como valor inicial:
    // incluirlos re-dispararía el fetch en cada clic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrera_id, malla_id, data.malla_id, cicloActual])

  const cursosPorId = useMemo(() => {
    const map = new Map<number, CursoItem>()
    for (const c of cursos) map.set(c.id, c)
    return map
  }, [cursos])

  const cursosPrevios = useMemo(
    () => cursos.filter((c) => c.ciclo < cicloActual),
    [cursos, cicloActual],
  )

  /**
   * Lo que se puede elegir: TODO el ciclo declarado, siempre, más los cursos
   * de ciclos anteriores que el estudiante no marcó como aprobados (arrastres).
   * Nada se oculta ni se bloquea por prerrequisitos: convalidaciones, cursos
   * dirigidos y permisos de facultad existen y el sistema no los conoce. Si
   * falta un prerrequisito se avisa, pero la última palabra es del estudiante.
   */
  const cursosOfertados = useMemo(
    () =>
      cursos.filter(
        (c) => c.ciclo === cicloActual || (c.ciclo < cicloActual && !aprobados.has(c.id)),
      ),
    [cursos, cicloActual, aprobados],
  )

  /** Prerrequisitos directos que no figuran en el historial declarado. */
  const faltantesPara = (course: CursoItem): CursoItem[] =>
    course.prerrequisito_ids
      .filter((pid) => cursosPorId.has(pid) && !aprobados.has(pid))
      .map((pid) => cursosPorId.get(pid)!)

  const historialPorCiclo = useMemo(() => {
    const groups: Record<number, CicloGroup> = {}
    for (const c of cursosPrevios) {
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
  }, [cursosPrevios])

  const ofertadosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    const lista = termino
      ? cursosOfertados.filter(
          (c) =>
            c.name.toLowerCase().includes(termino) || c.code.toLowerCase().includes(termino),
        )
      : cursosOfertados
    // Primero los del ciclo declarado: son los que el estudiante viene a marcar.
    // Detrás van los arrastres, del ciclo más reciente al más antiguo.
    return [...lista].sort((a, b) => {
      const aEsDelCiclo = a.ciclo === cicloActual
      const bEsDelCiclo = b.ciclo === cicloActual
      if (aEsDelCiclo !== bEsDelCiclo) return aEsDelCiclo ? -1 : 1
      return b.ciclo - a.ciclo || a.name.localeCompare(b.name)
    })
  }, [cursosOfertados, busqueda, cicloActual])

  const creditosSeleccionados = useMemo(
    () => cursos.filter((c) => selected.has(c.id)).reduce((total, c) => total + c.credits, 0),
    [cursos, selected],
  )

  const creditosAprobados = useMemo(
    () => cursos.filter((c) => aprobados.has(c.id)).reduce((total, c) => total + c.credits, 0),
    [cursos, aprobados],
  )

  const topeAlcanzado = selected.size >= MAX_CURSOS_INSCRITOS

  /** Marca o desmarca un curso del historial. Solo ese: nada en cascada. */
  const toggleAprobado = (courseId: number) => {
    // Un curso ya aprobado en la base no se puede desaprobar desde aquí. Los
    // `in_progress` sí se tocan: al actualizar la situación académica, los
    // cursos del ciclo que acaba de terminar son justamente los que el
    // estudiante viene a declarar como aprobados o jalados.
    if (cursosPorId.get(courseId)?.status === "completed") return

    setAprobados((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
    // Un curso aprobado ya no se lleva; lo demás se respeta tal cual.
    setSelected((prev) => {
      if (!prev.has(courseId)) return prev
      const next = new Set(prev)
      next.delete(courseId)
      return next
    })
  }

  const marcarCicloCompleto = (cicloNum: number, marcar: boolean) => {
    const delCiclo = cursosPrevios.filter(
      (c) => c.ciclo === cicloNum && c.status !== "completed",
    )
    setAprobados((prev) => {
      const next = new Set(prev)
      for (const curso of delCiclo) {
        if (marcar) next.add(curso.id)
        else next.delete(curso.id)
      }
      return next
    })
    if (marcar) {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const curso of delCiclo) next.delete(curso.id)
        return next
      })
    }
  }

  const handleToggleCourse = (courseId: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) {
        next.delete(courseId)
        return next
      }
      // El backend rechaza más de 12 cursos: cortarlo aquí evita que el
      // estudiante arme toda su inscripción y recién falle al enviarla.
      if (prev.size >= MAX_CURSOS_INSCRITOS) return prev
      next.add(courseId)
      return next
    })
  }

  const handleContinue = () => {
    if (selected.size >= 1) {
      onNext({
        cursosInscritos: Array.from(selected),
        cursosAprobados: Array.from(aprobados),
        creditosInscritos: creditosSeleccionados,
      })
    }
  }

  const isValidEnrollment = selected.size >= 1

  const toggleCiclo = (cicloNum: number) => {
    setCiclosCerrados((prev) => {
      const next = new Set(prev)
      if (next.has(cicloNum)) next.delete(cicloNum)
      else next.add(cicloNum)
      return next
    })
  }

  /** Cursos elegidos a los que les falta algún prerrequisito en el historial. */
  const avisosPrereq = useMemo(
    () =>
      Array.from(selected)
        .map((id) => cursosPorId.get(id))
        .filter((c): c is CursoItem => !!c)
        .map((c) => ({ curso: c, faltantes: faltantesPara(c) }))
        .filter((x) => x.faltantes.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, aprobados, cursosPorId],
  )

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
          Confirma tu avance y tus cursos
        </h1>
        <p className="text-sm text-muted-foreground">
          Damos por aprobado todo lo de ciclos anteriores. Desmarca lo que te falte
          y luego elige los cursos que llevas ahora.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-5">
        {/* ---------- Card 1: historial declarado ---------- */}
        {historialPorCiclo.length > 0 && (
          <section className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <header className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-accent/15 text-accent">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-foreground text-sm">
                    Lo que ya aprobaste
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Ciclos I al {aRomano(cicloActual - 1)} · desmarca lo que no hayas llevado
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30">
                {aprobados.size} cursos · {creditosAprobados} créditos
              </span>
            </header>

            <div className="max-h-[280px] overflow-y-auto p-3 space-y-2">
              {historialPorCiclo.map((grupo) => {
                const cerrado = ciclosCerrados.has(grupo.cicloNum)
                const aprobadosDelCiclo = grupo.courses.filter((c) => aprobados.has(c.id)).length
                const todosMarcados = aprobadosDelCiclo === grupo.courses.length

                return (
                  <div key={grupo.cicloNum} className="rounded-xl border border-border/70">
                    <div className="flex items-center justify-between gap-2 p-2.5">
                      <button
                        type="button"
                        onClick={() => toggleCiclo(grupo.cicloNum)}
                        aria-expanded={!cerrado}
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                      >
                        {cerrado ? (
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-heading font-semibold text-sm text-foreground">
                          {grupo.ciclo}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {aprobadosDelCiclo}/{grupo.courses.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => marcarCicloCompleto(grupo.cicloNum, !todosMarcados)}
                        className="text-[11px] font-semibold text-accent hover:underline shrink-0"
                      >
                        {todosMarcados ? "Desmarcar todo" : "Marcar todo"}
                      </button>
                    </div>

                    {!cerrado && (
                      <div className="flex flex-wrap gap-2 p-2.5 pt-0">
                        {grupo.courses.map((course) => {
                          const estaAprobado = aprobados.has(course.id)
                          const bloqueadoEnBd = course.status === "completed"
                          return (
                            <button
                              key={course.id}
                              type="button"
                              onClick={() => toggleAprobado(course.id)}
                              aria-pressed={estaAprobado}
                              disabled={bloqueadoEnBd}
                              title={`${course.code} · ${course.name} · ${course.credits} créditos`}
                              className={`inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border text-left transition-all duration-200 ${
                                estaAprobado
                                  ? "border-accent/50 bg-accent/10 text-accent"
                                  : "border-border bg-card text-muted-foreground hover:border-accent/40"
                              } ${bloqueadoEnBd ? "opacity-70 cursor-not-allowed" : ""}`}
                            >
                              <span className="shrink-0">
                                {estaAprobado ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/50" />
                                )}
                              </span>
                              <span className="text-[11px] font-semibold tracking-wide">
                                {course.code}
                              </span>
                              <span className="text-[11px] max-w-[11rem] truncate">
                                {course.name}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ---------- Card 2: cursos del ciclo ---------- */}
        <section className="rounded-2xl border border-border bg-card/60 overflow-hidden">
          <header className="p-4 border-b border-border space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-semibold text-foreground text-sm">
                  Cursos que llevas este ciclo
                </h2>
                <p className="text-xs text-muted-foreground">
                  Todo el Ciclo {aRomano(cicloActual)} de tu plan, más lo que dejaste pendiente
                </p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
                {selected.size} elegidos
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar curso por nombre o código..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </header>

          <div className="max-h-[300px] overflow-y-auto p-3 space-y-3">
            {ofertadosFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay cursos que coincidan con tu búsqueda.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ofertadosFiltrados.map((course) => {
                  const isSelected = selected.has(course.id)
                  const esDeCicloPrevio = course.ciclo < cicloActual
                  const bloqueadoPorTope = topeAlcanzado && !isSelected
                  const leFalta = faltantesPara(course).length > 0

                  const estilo = isSelected
                    ? "border-accent bg-accent/15 text-foreground ring-1 ring-accent"
                    : bloqueadoPorTope
                      ? "border-border/50 bg-card/40 text-muted-foreground cursor-not-allowed"
                      : "border-border bg-card text-foreground hover:border-accent/50"

                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => handleToggleCourse(course.id)}
                      disabled={bloqueadoPorTope}
                      aria-pressed={isSelected}
                      title={`${course.code} · ${course.name} · ${course.credits} créditos`}
                      className={`inline-flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-full border text-left transition-all duration-200 ${estilo}`}
                    >
                      <span className="shrink-0">
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-accent" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground/60" />
                        )}
                      </span>
                      <span className="text-xs font-semibold tracking-wide">{course.code}</span>
                      <span className="text-xs max-w-[13rem] truncate">{course.name}</span>
                      {esDeCicloPrevio && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                          Ciclo {aRomano(course.ciclo)}
                        </span>
                      )}
                      {leFalta && (
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider text-amber-500"
                          title="Según lo que marcaste, te falta un prerrequisito"
                        >
                          Requisito
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Aviso, no bloqueo: el estudiante puede tener convalidación o permiso. */}
        {avisosPrereq.length > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <p>
                Elegiste cursos cuyo prerrequisito no marcaste como aprobado. Puedes
                llevarlos igual si tienes convalidación o permiso de tu facultad.
              </p>
              <ul className="space-y-0.5">
                {avisosPrereq.map(({ curso, faltantes }) => (
                  <li key={curso.id}>
                    <span className="font-semibold text-foreground">{curso.name}</span> requiere{" "}
                    {faltantes.map((f) => `${f.code} ${f.name}`).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
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
