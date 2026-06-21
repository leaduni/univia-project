"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RecursoCard } from "./recursos/recurso-card"
import { RecursosEmptyState } from "./recursos/empty-state"
import { apiService } from "@/lib/api-service"
import type { Recurso } from "@/types/recurso"

export function RecursosBiblioteca() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "downloaded" | "rated">("recent")
  const [showFilters, setShowFilters] = useState(false)
  const [recursosData, setRecursosData] = useState<Recurso[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter states
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedCiclos, setSelectedCiclos] = useState<string[]>([])
  const [selectedFacultad, setSelectedFacultad] = useState<string>("")
  const [selectedYears, setSelectedYears] = useState<string[]>([])

  useEffect(() => {
    const fetchRecursos = async () => {
      try {
        setIsLoading(true)
        // We'll filter on the client side for types/ciclos/years for now to keep it responsive,
        // or we could refetch on every filter change.
        const data = await apiService.getRecursos({
          search: searchQuery
        })
        setRecursosData(data)
      } catch (err) {
        console.error("Error fetching recursos:", err)
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(fetchRecursos, 500) // Debounce search
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Filter and sort logic (Client side filtering for secondary filters)
  const filteredRecursos = useMemo(() => {
    let filtered = recursosData

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((r) => selectedTypes.includes(r.type))
    }

    // Ciclo filter
    if (selectedCiclos.length > 0) {
      filtered = filtered.filter((r) => selectedCiclos.includes(r.ciclo?.toString() || ""))
    }

    // Facultad filter
    if (selectedFacultad && selectedFacultad !== 'all') {
      filtered = filtered.filter((r) => r.facultad === selectedFacultad)
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
      sorted.reverse() // Recent (reverse order of insertion)
    }

    return sorted
  }, [recursosData, selectedTypes, selectedCiclos, selectedFacultad, selectedYears, sortBy])

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  const toggleCiclo = (ciclo: string) => {
    setSelectedCiclos((prev) => (prev.includes(ciclo) ? prev.filter((c) => c !== ciclo) : [...prev, ciclo]))
  }

  const toggleYear = (year: string) => {
    setSelectedYears((prev) => (prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]))
  }

  return (
    <div className="min-h-screen bg-transparent font-sans">
      {/* Search Header */}
      <div className="bg-[#02072c]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-30">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="mb-4">
            <h1 className="text-3xl font-extrabold text-foreground mb-2 font-poppins">Biblioteca Central de Recursos</h1>
            <p className="text-muted-foreground">Repositorio global de materiales académicos de la universidad</p>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por curso, código o tema..."
                className="pl-10 bg-[#02072c]/60 border-white/10 text-white placeholder:text-muted-foreground/40 focus:border-violet focus:ring-1 focus:ring-violet"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className="md:hidden border-white/10 hover:bg-[#121b58] text-white">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex justify-end">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-48 bg-[#02072c]/60 border-white/10 text-white focus:border-violet focus:ring-1 focus:ring-violet">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent className="bg-[#02072c] border-white/10 text-white">
                <SelectItem value="recent">Más Reciente</SelectItem>
                <SelectItem value="downloaded">Más Descargado</SelectItem>
                <SelectItem value="rated">Mejor Calificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Filter Sidebar - Desktop */}
        <div
          className={`hidden md:flex md:w-64 lg:w-72 border-r border-white/5 p-6 bg-[#02072c]/40 backdrop-blur-sm sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto flex-col gap-6`}
        >
          <FilterSidebar
            selectedTypes={selectedTypes}
            selectedCiclos={selectedCiclos}
            selectedFacultad={selectedFacultad}
            selectedYears={selectedYears}
            onToggleType={toggleType}
            onToggleCiclo={toggleCiclo}
            onSelectFacultad={setSelectedFacultad}
            onToggleYear={toggleYear}
          />
        </div>

        {/* Mobile Filter Sidebar */}
        {showFilters && (
          <div className="md:hidden fixed inset-0 z-40 bg-background p-4 overflow-y-auto">
            <Button variant="ghost" className="mb-4" onClick={() => setShowFilters(false)}>
              ✕ Cerrar Filtros
            </Button>
            <FilterSidebar
              selectedTypes={selectedTypes}
              selectedCiclos={selectedCiclos}
              selectedFacultad={selectedFacultad}
              selectedYears={selectedYears}
              onToggleType={toggleType}
              onToggleCiclo={toggleCiclo}
              onSelectFacultad={setSelectedFacultad}
              onToggleYear={toggleYear}
            />
          </div>
        )}

        {/* Results Grid */}
        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {filteredRecursos.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-6">{filteredRecursos.length} resultados encontrados</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRecursos.map((recurso) => (
                    <RecursoCard key={recurso.id} recurso={recurso} />
                  ))}
                </div>
              </>
            ) : (
              <RecursosEmptyState />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface FilterSidebarProps {
  selectedTypes: string[]
  selectedCiclos: string[]
  selectedFacultad: string
  selectedYears: string[]
  onToggleType: (type: string) => void
  onToggleCiclo: (ciclo: string) => void
  onSelectFacultad: (facultad: string) => void
  onToggleYear: (year: string) => void
}

function FilterSidebar({
  selectedTypes,
  selectedCiclos,
  selectedFacultad,
  selectedYears,
  onToggleType,
  onToggleCiclo,
  onSelectFacultad,
  onToggleYear,
}: FilterSidebarProps) {
  const documentTypes = ["Examen", "Práctica", "Libro", "Apunte"]
  const ciclos = Array.from({ length: 10 }, (_, i) => (i + 1).toString())
  const facultades = ["Ingeniería", "Ciencias", "Humanidades", "Administración"]
  const years = Array.from({ length: 6 }, (_, i) => (2025 - i).toString())

  return (
    <div className="space-y-6">
      {/* Tipo de Documento */}
      <div>
        <h3 className="font-semibold text-foreground mb-3 font-poppins">Tipo de Documento</h3>
        <div className="space-y-2">
          {documentTypes.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <Checkbox
                id={`type-${type}`}
                checked={selectedTypes.includes(type)}
                onCheckedChange={() => onToggleType(type)}
              />
              <label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
                {type}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Ciclo */}
      <div>
        <h3 className="font-semibold text-foreground mb-3 font-poppins">Ciclo</h3>
        <div className="space-y-2">
          {ciclos.map((ciclo) => (
            <div key={ciclo} className="flex items-center gap-2">
              <Checkbox
                id={`ciclo-${ciclo}`}
                checked={selectedCiclos.includes(ciclo)}
                onCheckedChange={() => onToggleCiclo(ciclo)}
              />
              <label htmlFor={`ciclo-${ciclo}`} className="text-sm cursor-pointer">
                Ciclo {ciclo}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Facultad */}
      <div>
        <h3 className="font-semibold text-foreground mb-3 font-poppins">Facultad</h3>
        <Select value={selectedFacultad} onValueChange={onSelectFacultad}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar facultad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {facultades.map((fac) => (
              <SelectItem key={fac} value={fac}>
                {fac}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Año */}
      <div>
        <h3 className="font-semibold text-foreground mb-3 font-poppins">Año</h3>
        <div className="space-y-2">
          {years.map((year) => (
            <div key={year} className="flex items-center gap-2">
              <Checkbox
                id={`year-${year}`}
                checked={selectedYears.includes(year)}
                onCheckedChange={() => onToggleYear(year)}
              />
              <label htmlFor={`year-${year}`} className="text-sm cursor-pointer">
                {year}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
