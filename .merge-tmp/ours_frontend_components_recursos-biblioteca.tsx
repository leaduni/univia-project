// Resource library with search, filters, and AI exam generation
"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RecursoCard } from "./recursos/recurso-card"
import { RecursosEmptyState } from "./recursos/empty-state"
import { apiService } from "@/lib/api-service"
import type { Recurso } from "@/types/recurso"
import { useAuth } from "@/components/providers/auth-context"

export function RecursosBiblioteca() {
  const { user } = useAuth()
  // user.id es una primitiva estable: el objeto `session` cambia en cada
  // renovaci├│n de token de Supabase y disparar├¡a re-fetches innecesarios.
  const userId = user?.id ?? null
  // Permite llegar filtrado desde otra pantalla (ej. 'Banco de ex├ímenes' del
  // men├║ Explorar abre /recursos?tipo=Examen). Sin esto, ese enlace abrir├¡a la
  // biblioteca completa y el estudiante tendr├¡a que filtrar a mano.
  const searchParams = useSearchParams()
  const tipoInicial = searchParams.get("tipo")

  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "downloaded" | "rated">("recent")
  const [recursosData, setRecursosData] = useState<Recurso[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter states
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    tipoInicial ? [tipoInicial] : [],
  )
  const [selectedCiclos, setSelectedCiclos] = useState<string[]>([])
  const [selectedFacultad, setSelectedFacultad] = useState<string>("")
  const [selectedYears, setSelectedYears] = useState<string[]>([])

  useEffect(() => {
    let activo = true

    if (!user) {
      setRecursosData([])
      setIsLoading(false)
      return
    }

    const fetchRecursos = async () => {
      try {
        setIsLoading(true)
        const data = await apiService.getRecursos({
          search: searchQuery
        })
        if (activo) {
          setRecursosData(data)
        }
      } catch (err) {
        if (activo) {
          console.error("Error fetching recursos:", err)
        }
      } finally {
        if (activo) {
          setIsLoading(false)
        }
      }
    }

    const timeoutId = setTimeout(fetchRecursos, 500) // Debounce search
    return () => {
      activo = false
      clearTimeout(timeoutId)
    }
  }, [searchQuery, userId])

  // Facultades y a├▒os reales presentes en los datos recibidos (no hay endpoint propio para esto).
  const facultadesDisponibles = useMemo(
    () => Array.from(new Set(recursosData.map((r) => r.facultad_nombre).filter(Boolean))) as string[],
    [recursosData],
  )
  const aniosDisponibles = useMemo(
    () =>
      Array.from(new Set(recursosData.map((r) => r.year).filter((y): y is number => Boolean(y))))
        .sort((a, b) => b - a),
    [recursosData],
  )

  const aniosOpciones = useMemo(() => {
    const defaultYears = ["2026", "2025", "2020", "2018", "2014", "2013", "2011", "2006"]
    const dynamicYears = aniosDisponibles.map((y) => y.toString())
    const set = new Set([...defaultYears, ...dynamicYears])
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [aniosDisponibles])

  // Filter and sort logic (Client side filtering for secondary filters)
  const filteredRecursos = useMemo(() => {
    let filtered = recursosData

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((r) => selectedTypes.includes(r.tipo))
    }

    // Ciclo filter
    if (selectedCiclos.length > 0) {
      filtered = filtered.filter((r) => selectedCiclos.includes(r.ciclo?.toString() || ""))
    }

    // Facultad filter
    if (selectedFacultad && selectedFacultad !== 'all') {
      filtered = filtered.filter(
        (r) =>
          r.facultad_nombre === selectedFacultad ||
          r.especialidades?.some((e) => e.facultad_nombre === selectedFacultad),
      )
    }

    // Year filter
    if (selectedYears.length > 0) {
      filtered = filtered.filter((r) => selectedYears.includes(r.year?.toString() || ""))
    }

    // Sort
    const sorted = [...filtered]
    if (sortBy === "downloaded") {
      sorted.sort((a, b) => b.downloads - a.downloads)
    } else if (sortBy === "rated") {
      sorted.sort((a, b) => b.rating - a.rating)
    } else {
      sorted.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    }

    return sorted
  }, [recursosData, selectedTypes, selectedCiclos, selectedFacultad, selectedYears, sortBy])

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  const categoryChips = [
    { id: "all", label: "Todos" },
    { id: "Examen", label: "Ex├ímenes" },
    { id: "Practica", label: "Pr├ícticas" },
    { id: "Silabo", label: "S├¡labos" },
    { id: "Compendio", label: "Compendios" },
    { id: "Libro", label: "Libros" },
    { id: "Apunte", label: "Apuntes" },
    { id: "Video", label: "Videos" },
  ]

  return (
    <div className="min-h-screen bg-[#161826] text-foreground">
      {/* Header & Main Search Section */}
      <div className="bg-[#161826]/80 border-b border-[#3f424d]/60 backdrop-blur-md">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
          {/* Page Header */}
          <div>
            <h1 className="font-poppins font-semibold text-3xl text-foreground tracking-tight mb-1">
              Banco de ex├ímenes y recursos
            </h1>
            <p className="text-muted-foreground text-sm">
              Repositorio global de materiales acad├®micos de la universidad
            </p>
          </div>

          {/* Barra de b├║squeda y selectores de filtro superior */}
          <div className="flex gap-3 mb-2 flex-wrap xl:flex-nowrap items-center">
            {/* Input de b├║squeda */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              <Input
                placeholder="Buscar por curso, c├│digo o tema..."
                className="h-11 pl-10 pr-4 rounded-xl bg-[#232532] border border-[#3f424d]/60 text-sm focus-visible:ring-2 focus-visible:ring-primary/50 placeholder:text-muted-foreground/50 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Select Facultad */}
            <div className="w-full sm:w-48">
              <Select value={selectedFacultad || "all"} onValueChange={setSelectedFacultad}>
                <SelectTrigger className="h-11 rounded-xl bg-[#232532] border border-[#3f424d]/60 text-sm">
                  <SelectValue placeholder="Facultad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las facultades</SelectItem>
                  {facultadesDisponibles.map((fac) => (
                    <SelectItem key={fac} value={fac}>
                      {fac}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            {/* Select A├▒o */}
            <div className="w-full sm:w-36">
              <Select
                value={selectedYears[0] ?? "all"}
                onValueChange={(val) => setSelectedYears(val === "all" ? [] : [val])}
              >
                <SelectTrigger className="h-11 rounded-xl bg-[#232532] border border-[#3f424d]/60 text-sm">
                  <SelectValue placeholder="A├▒o" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los a├▒os</SelectItem>
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
                  <SelectItem value="recent">M├ís Reciente</SelectItem>
                  <SelectItem value="downloaded">M├ís Descargado</SelectItem>
                  <SelectItem value="rated">Mejor Calificado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chips de Categor├¡a y Contador de Resultados */}
          <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
            {/* Chips de Categor├¡as */}
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
              {filteredRecursos.length} recursos
            </span>
          </div>
        </div>
      </div>

      {/* Results Content Area (100% width grid) */}
      <div className="w-full p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            /* Grid de Skeletons */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
          ) : filteredRecursos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredRecursos.map((recurso) => (
                <RecursoCard key={recurso.id} recurso={recurso} />
              ))}
            </div>
          ) : (
            <RecursosEmptyState />
          )}
        </div>
      </div>
    </div>
  )
}
