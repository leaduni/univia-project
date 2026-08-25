// Resource library with search, filters, and AI exam generation
"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Search, BookMarked, Library } from "lucide-react"
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
  // Permite llegar filtrado desde otra pantalla (ej. 'Banco de exámenes' del
  // menú Explorar abre /recursos?tipo=Examen). Sin esto, ese enlace abriría la
  // biblioteca completa y el estudiante tendría que filtrar a mano.
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

  const categoryChips = [
    { id: "all", label: "Todos" },
    { id: "Examen", label: "Exámenes" },
    { id: "Practica", label: "Prácticas" },
    { id: "Silabo", label: "Sílabos" },
    { id: "Compendio", label: "Compendios" },
    { id: "Libro", label: "Libros" },
    { id: "Apunte", label: "Apuntes" },
    { id: "Video", label: "Videos" },
  ]

  const vistas: { id: Vista; label: string; icon: typeof BookMarked }[] = [
    { id: "mis-cursos", label: "Mis cursos", icon: BookMarked },
    { id: "todo", label: "Todo el banco", icon: Library },
  ]

  return (
    <div className="min-h-screen bg-[#161826] text-foreground">
      {/* Header & Main Search Section */}
      <div className="bg-[#161826]/80 border-b border-[#3f424d]/60 backdrop-blur-md">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
          {/* Page Header */}
          <div>
            <h1 className="font-poppins font-semibold text-3xl text-foreground tracking-tight mb-1">
              Banco de exámenes y recursos
            </h1>
            <p className="text-muted-foreground text-sm">
              {vista === "mis-cursos"
                ? "Material de los cursos que llevas este ciclo"
                : "Todo el material académico de tu facultad"}
              {facultad && <span className="text-muted-foreground/70"> · {facultad}</span>}
            </p>
          </div>

          {/* Selector de alcance */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#232532] border border-[#3f424d]/60">
            {vistas.map((v) => {
              const Icono = v.icon
              const activa = vista === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVista(v.id)}
                  aria-pressed={activa}
                  className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-all ${
                    activa
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icono className="w-4 h-4" />
                  {v.label}
                </button>
              )
            })}
          </div>

          {/* Barra de búsqueda y selectores de filtro superior */}
          <div className="flex gap-3 mb-2 flex-wrap xl:flex-nowrap items-center">
            {/* Input de búsqueda */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              <Input
                placeholder="Buscar por curso, código o tema..."
                className="h-11 pl-10 pr-4 rounded-xl bg-[#232532] border border-[#3f424d]/60 text-sm focus-visible:ring-2 focus-visible:ring-primary/50 placeholder:text-muted-foreground/50 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sin selector de facultad: el listado ya viene acotado a la
                facultad del estudiante, así que ofrecer "todas" prometía
                material que nunca se iba a mostrar. */}

            {/* Select Ciclo */}
            <div className="w-full sm:w-40">
              <Select
                value={selectedCiclos[0] ?? "all"}
                onValueChange={(val) => setSelectedCiclos(val === "all" ? [] : [val])}
              >
                <SelectTrigger className="h-11 rounded-xl bg-[#232532] border border-[#3f424d]/60 text-sm">
                  <SelectValue placeholder="Ciclo" />
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
            <div className="w-full sm:w-36">
              <Select
                value={selectedYears[0] ?? "all"}
                onValueChange={(val) => setSelectedYears(val === "all" ? [] : [val])}
              >
                <SelectTrigger className="h-11 rounded-xl bg-[#232532] border border-[#3f424d]/60 text-sm">
                  <SelectValue placeholder="Año" />
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
            <div className="w-full sm:w-44">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="h-11 rounded-xl bg-[#232532] border border-[#3f424d]/60 text-sm">
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

          {/* Chips de Categoría y Contador de Resultados */}
          <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
            {/* Chips de Categorías */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
              {categoryChips.map((chip) => {
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
                    className={`h-9 px-4 rounded-full text-sm font-medium transition-all shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                        : "bg-[#232532] text-muted-foreground border border-[#3f424d]/60 hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>

            {/* Contador de resultados */}
            <span className="text-xs text-muted-foreground font-medium shrink-0">
              {total} recursos
              {totalPaginas > 1 && ` · página ${paginaActual} de ${totalPaginas}`}
            </span>
          </div>
        </div>
      </div>

      {/* Results Content Area (100% width grid) */}
      <div className="w-full p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            /* Grid de Skeletons */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex flex-col rounded-2xl bg-[#232532] border border-[#3f424d]/60 overflow-hidden h-[340px] animate-pulse"
                >
                  <div className="h-44 bg-muted/40" />
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted/40 rounded w-3/4" />
                      <div className="h-3 bg-muted/30 rounded w-1/2" />
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-[#3f424d]/40">
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
              <BookMarked className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <div className="space-y-1">
                <h2 className="font-poppins font-semibold text-foreground">
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
                className="h-10 px-5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
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
