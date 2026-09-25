// Resource library with search, filters, and AI exam generation
"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  Search, BookMarked, Library, CalendarDays, GraduationCap, ArrowUpDown,
  Layers, FileText, PenLine, ClipboardList, FolderArchive, BookOpen, StickyNote, Video,
  type LucideIcon,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RecursoCard } from "./recursos/recurso-card"
import { RecursosEmptyState } from "./recursos/empty-state"
import { Paginacion } from "./recursos/paginacion"
import { apiService } from "@/lib/api-service"
import type { Recurso } from "@/types/recurso"
import { useAuth } from "@/components/providers/auth-context"

type Vista = "mis-cursos" | "todo"

const RECURSOS_POR_PAGINA = 20

export function RecursosBiblioteca() {
  const { session } = useAuth()
  // Permite llegar filtrado desde otra pantalla (ej. /recursos?tipo=Examen).
  // Sin esto, ese enlace abriría la biblioteca completa y el estudiante
  // tendría que filtrar a mano.
  const searchParams = useSearchParams()
  const tipoInicial = searchParams.get("tipo")

  // Por defecto se muestra solo el material de los cursos que el estudiante
  // lleva ahora: es lo que viene a buscar, y evita que el navegador se baje el
  // banco entero de la universidad en cada visita.
  const [vista, setVista] = useState<Vista>("mis-cursos")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "downloaded" | "rated">("recent")
  const [paginaActual, setPaginaActual] = useState(1)

  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [total, setTotal] = useState(0)
  const [sinCursosActivos, setSinCursosActivos] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  // Facultad a la que el backend acota el listado. No es un filtro que el
  // estudiante elija: se deriva de su carrera y solo se muestra como contexto.
  const [facultad, setFacultad] = useState<string | null>(null)

  // Filter states
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    tipoInicial ? [tipoInicial] : [],
  )
  const [selectedCiclos, setSelectedCiclos] = useState<string[]>([])
  const [selectedYears, setSelectedYears] = useState<string[]>([])

  const claveFiltros = JSON.stringify({
    vista,
    searchQuery,
    sortBy,
    selectedTypes,
    selectedCiclos,
    selectedYears,
  })

  // Al cambiar filtros el listado se reduce: quedarse en una página que ya no
  // existe mostraría una grilla vacía.
  useEffect(() => {
    setPaginaActual(1)
  }, [claveFiltros])

  useEffect(() => {
    let activo = true

    if (!session) {
      setRecursos([])
      setTotal(0)
      setIsLoading(false)
      return
    }

    const fetchRecursos = async () => {
      try {
        setIsLoading(true)
        const pagina = await apiService.getRecursosPaginados({
          mis_cursos: vista === "mis-cursos",
          search: searchQuery || undefined,
          tipo: selectedTypes.length ? selectedTypes.join(",") : undefined,
          ciclo: selectedCiclos.length ? Number(selectedCiclos[0]) : undefined,
          year: selectedYears.length ? Number(selectedYears[0]) : undefined,
          orden: sortBy,
          limit: RECURSOS_POR_PAGINA,
          offset: (paginaActual - 1) * RECURSOS_POR_PAGINA,
        })
        if (!activo) return
        setRecursos(pagina.items as Recurso[])
        setTotal(pagina.total)
        setSinCursosActivos(pagina.sinCursosActivos)
        setFacultad(pagina.facultad ?? null)
      } catch (err) {
        if (activo) {
          console.error("Error fetching recursos:", err)
          setRecursos([])
          setTotal(0)
        }
      } finally {
        if (activo) setIsLoading(false)
      }
    }

    // Debounce: escribir en el buscador no debe disparar una petición por tecla.
    const timeoutId = setTimeout(fetchRecursos, 350)
    return () => {
      activo = false
      clearTimeout(timeoutId)
    }
  }, [claveFiltros, paginaActual, session])

  const totalPaginas = Math.max(1, Math.ceil(total / RECURSOS_POR_PAGINA))

  const aniosOpciones = useMemo(() => {
    const defaultYears = ["2026", "2025", "2020", "2018", "2014", "2013", "2011", "2006"]
    const dynamicYears = recursos
      .map((r) => r.year)
      .filter((y): y is number => Boolean(y))
      .map((y) => y.toString())
    return Array.from(new Set([...defaultYears, ...dynamicYears])).sort(
      (a, b) => Number(b) - Number(a),
    )
  }, [recursos])

  const irAPagina = (pagina: number) => {
    if (pagina < 1 || pagina > totalPaginas) return
    setPaginaActual(pagina)
    // Sin esto el usuario cambia de página y sigue viendo el pie de la grilla.
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  const categoryChips: { id: string; label: string; icon: LucideIcon; color: string }[] = [
    { id: "all",       label: "Todos",      icon: Layers,        color: "text-brand-violet" },
    { id: "Examen",    label: "Exámenes",   icon: FileText,      color: "text-rose-400" },
    { id: "Practica",  label: "Prácticas",  icon: PenLine,       color: "text-amber-400" },
    { id: "Silabo",    label: "Sílabos",    icon: ClipboardList, color: "text-sky-400" },
    { id: "Compendio", label: "Compendios", icon: FolderArchive, color: "text-purple-400" },
    { id: "Libro",     label: "Libros",     icon: BookOpen,      color: "text-pink-400" },
    { id: "Apunte",    label: "Apuntes",    icon: StickyNote,    color: "text-emerald-400" },
    { id: "Video",     label: "Videos",     icon: Video,         color: "text-red-400" },
  ]

  const vistas: { id: Vista; label: string; icon: typeof BookMarked }[] = [
    { id: "mis-cursos", label: "Mis cursos", icon: BookMarked },
    { id: "todo", label: "Todo el banco", icon: Library },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header & Main Search Section */}
      <div className="relative overflow-hidden border-b border-border/40">
        {/* Fondo con gradiente sutil de marca */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/5 via-brand-magenta/3 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle,rgba(121,87,241,0.08),transparent_70%)] pointer-events-none" />

        <div className="relative p-4 md:p-6 lg:p-8 max-w-[1800px] mx-auto space-y-5">
          {/* Page Header — estilo limpio como Mi Malla */}
          <div className="space-y-1">
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Banco de exámenes y recursos
            </h1>
            <p className="text-sm text-muted-foreground">
              {vista === "mis-cursos"
                ? "Material de los cursos que llevas este ciclo"
                : "Todo el material académico de tu facultad"}
              {facultad && <span className="text-muted-foreground/70"> · {facultad}</span>}
            </p>
          </div>

          {/* Selector de alcance */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-card/80 border border-border/60 backdrop-blur-sm shadow-sm">
            {vistas.map((v) => {
              const Icono = v.icon
              const activa = vista === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVista(v.id)}
                  aria-pressed={activa}
                  className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activa
                      ? "gradient-brand text-white shadow-md shadow-brand-violet/25 font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icono className="w-4 h-4" />
                  {v.label}
                </button>
              )
            })}
          </div>

          {/* Barra de filtros unificada */}
          <div className="rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm p-4 space-y-4">
            {/* Fila: Búsqueda + Filtros */}
            <div className="flex gap-3 flex-wrap xl:flex-nowrap items-end">
              {/* Input de búsqueda */}
              <div className="min-w-0 w-full flex-1 xl:min-w-[260px] space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3 h-3" />
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-4 h-4 pointer-events-none" />
                  <Input
                    placeholder="Curso, código o tema..."
                    className="h-10 pl-9 pr-4 rounded-xl bg-background/60 border border-border/50 text-sm focus-visible:ring-1 focus-visible:ring-brand-violet/40 focus-visible:border-brand-violet/30 placeholder:text-muted-foreground/40 w-full transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Sin selector de facultad: el listado ya viene acotado a la
                  facultad del estudiante, así que ofrecer "todas" prometía
                  material que nunca se iba a mostrar. */}

              {/* Select Ciclo */}
              <div className="w-full sm:w-40 space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3 h-3" />
                  Ciclo
                </label>
                <Select
                  value={selectedCiclos[0] ?? "all"}
                  onValueChange={(val) => setSelectedCiclos(val === "all" ? [] : [val])}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-background/60 border border-border/50 text-sm font-medium">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los ciclos</SelectItem>
                    {Array.from({ length: 10 }, (_, i) => (i + 1).toString()).map((ciclo) => (
                      <SelectItem key={ciclo} value={ciclo}>
                        Ciclo {ciclo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Año */}
              <div className="w-full sm:w-36 space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-3 h-3" />
                  Año
                </label>
                <Select
                  value={selectedYears[0] ?? "all"}
                  onValueChange={(val) => setSelectedYears(val === "all" ? [] : [val])}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-background/60 border border-border/50 text-sm font-medium">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los años</SelectItem>
                    {aniosOpciones.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Ordenamiento */}
              <div className="w-full sm:w-44 space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpDown className="w-3 h-3" />
                  Ordenar
                </label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background/60 border border-border/50 text-sm font-medium">
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Más Reciente</SelectItem>
                    <SelectItem value="downloaded">Más Descargado</SelectItem>
                    <SelectItem value="rated">Mejor Calificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Chips de Categoría y Contador de Resultados */}
          <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
            {/* Chips de Categorías */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
              {categoryChips.map((chip) => {
                const ChipIcon = chip.icon
                const isActive =
                  chip.id === "all" ? selectedTypes.length === 0 : selectedTypes.includes(chip.id)
                return (
                  <button
                    key={chip.id}
                    onClick={() => {
                      if (chip.id === "all") {
                        setSelectedTypes([])
                      } else {
                        toggleType(chip.id)
                      }
                    }}
                    className={`group/chip h-9 px-4 rounded-xl text-[13px] font-semibold transition-all duration-200 shrink-0 flex items-center gap-2 ${
                      isActive
                        ? "gradient-brand text-white shadow-md shadow-brand-violet/25 scale-[1.02]"
                        : "bg-card/80 text-muted-foreground border border-border/50 hover:border-brand-violet/30 hover:bg-brand-violet/5 hover:text-foreground hover:scale-[1.02]"
                    }`}
                  >
                    <ChipIcon className={`w-3.5 h-3.5 transition-colors ${
                      isActive ? "text-white" : chip.color
                    }`} />
                    {chip.label}
                  </button>
                )
              })}
            </div>

            {/* Contador de resultados */}
            <span className="text-xs text-muted-foreground font-semibold shrink-0 bg-card/80 px-3 py-1.5 rounded-full border border-border/60">
              {total} recursos
              {totalPaginas > 1 && ` · página ${paginaActual} de ${totalPaginas}`}
            </span>
          </div>
        </div>
      </div>

      {/* Results Content Area (100% width grid) */}
      <div className="w-full p-4 md:p-8">
        <div className="max-w-[1800px] mx-auto">
          {isLoading ? (
            /* Grid de Skeletons */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex flex-col rounded-2xl bg-card border border-border/60 overflow-hidden h-[340px] animate-pulse"
                >
                  <div className="h-44 bg-muted/40" />
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted/40 rounded w-3/4" />
                      <div className="h-3 bg-muted/30 rounded w-1/2" />
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border/40">
                      <div className="h-3 bg-muted/30 rounded w-1/3" />
                      <div className="h-8 bg-muted/40 rounded w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recursos.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {recursos.map((recurso) => (
                  <RecursoCard key={recurso.id} recurso={recurso} />
                ))}
              </div>

              <Paginacion
                paginaActual={paginaActual}
                totalPaginas={totalPaginas}
                onCambiar={irAPagina}
              />
            </>
          ) : sinCursosActivos ? (
            /* Vista "Mis cursos" sin cursos activos: sin esto la pantalla
               parecería un banco vacío en vez de un perfil sin matrícula. */
            <div className="text-center py-16 space-y-4">
              <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-md inline-block">
                <BookMarked className="w-10 h-10 text-brand-violet" />
              </div>
              <div className="space-y-1">
                <h2 className="font-heading text-lg font-bold text-foreground">
                  Todavía no tienes cursos activos
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Cuando registres los cursos que llevas este ciclo, aquí verás su material.
                  Mientras tanto puedes explorar el banco completo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVista("todo")}
                className="h-10 px-6 rounded-xl text-sm font-bold gradient-brand text-white shadow-md shadow-brand-violet/25 hover:opacity-90 transition-all duration-200"
              >
                Ver todo el banco
              </button>
            </div>
          ) : (
            <RecursosEmptyState />
          )}
        </div>
      </div>
    </div>
  )
}
