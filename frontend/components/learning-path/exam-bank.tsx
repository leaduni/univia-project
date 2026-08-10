// Course-specific resource bank: fetches real recursos filtered by curso_id,
// merged with the local Geometría Analítica planchas (no Drive equivalent).
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FileText, BookOpen } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { RecursoCard } from "@/components/recursos/recurso-card"
import type { Recurso } from "@/types/recurso"
import { useAuth } from "@/components/providers/auth-context"

// Todas las planchas de Geometría Analítica del repositorio local (sin
// equivalente en Drive todavía, se sirven desde ingesta_silabos/planchas).
const GEOMETRIA_PLANCHAS: { nombre: string; archivo: string }[] = [
  { nombre: "Vectores", archivo: "VECTORES.pdf" },
  { nombre: "Componente y Producto Escalar", archivo: "COMPONENTE Y PROD. ESCALAR.pdf" },
  { nombre: "Proyección Ortogonal", archivo: "PROYECCION ORTOGONAL.pdf" },
  { nombre: "Razón de División", archivo: "RAZON DE DIVISION.pdf" },
  { nombre: "La Recta", archivo: "RECTA.pdf" },
  { nombre: "Complemento - La Recta", archivo: "RECTA-COMPLEMENTO.pdf" },
  { nombre: "Rotación y Traslación de Coordenadas", archivo: "ROTACION Y TRASLACION DE COORDS.pdf" },
  { nombre: "La Circunferencia", archivo: "CIRCUNFERENCIA.pdf" },
  { nombre: "La Parábola", archivo: "PARABOLA.pdf" },
  { nombre: "La Elipse", archivo: "ELIPSE.pdf" },
  { nombre: "Elipse e Hipérbola", archivo: "ELIPSE E HIPÉRBOLA.pdf" },
  { nombre: "La Hipérbola", archivo: "HIPÉRBOLA.pdf" },
  { nombre: "Ecuación de Segundo Grado", archivo: "ECUACION DE SEGUNDO GRADO.pdf" },
]

const COURSE_IDS_GA = ["11", "31", "54"]

const TIPOS: Recurso["tipo"][] = ["Examen", "Practica", "Silabo", "PDF", "Compendio", "Libro", "Apunte", "Video"]

export function ExamBank({ courseId, onCountChange }: { courseId: string; onCountChange?: (count: number) => void }) {
  const { session } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<Recurso["tipo"] | null>(null)
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const isGA = COURSE_IDS_GA.includes(courseId)

  useEffect(() => {
    let activo = true

    if (!session) {
      setRecursos([])
      setIsLoading(false)
      return
    }

    const fetchRecursos = async () => {
      try {
        setIsLoading(true)
        const cleanId = courseId.toString().startsWith("c") ? courseId.toString().substring(1) : courseId
        const data = await apiService.getRecursos({ curso_id: Number(cleanId) })
        if (activo) {
          setRecursos(data)
        }
      } catch (err) {
        if (activo) {
          console.error("Error fetching recursos del curso:", err)
        }
      } finally {
        if (activo) {
          setIsLoading(false)
        }
      }
    }
    fetchRecursos()
    return () => {
      activo = false
    }
  }, [courseId, session])

  const allRecursos = useMemo(() => {
    const lista = [...recursos]
    if (isGA) {
      GEOMETRIA_PLANCHAS.forEach((p, idx) => {
        lista.push({
          id: -(idx + 1),
          titulo: `Práctica Dirigida: ${p.nombre}`,
          tipo: "Apunte",
          curso_id: Number(courseId) || null,
          codigo_curso: null,
          nombre_curso: "Geometría Analítica",
          ciclo: null,
          year: null,
          downloads: 0,
          rating: 0,
          preview_url: null,
          has_solucionario: false,
          url_drive: null,
          facultad_nombre: null,
          created_at: "",
          // Se usa solo del lado del cliente para descargar el archivo local en vez de abrir url_drive.
          _archivoLocal: p.archivo,
        } as Recurso & { _archivoLocal: string })
      })
    }
    return lista
  }, [recursos, isGA, courseId])

  useEffect(() => {
    onCountChange?.(allRecursos.length)
  }, [allRecursos, onCountChange])

  const filteredRecursos = allRecursos.filter((r) => {
    const matchesSearch = r.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !filterType || r.tipo === filterType
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Banco de Exámenes</h3>
        <p className="text-sm text-muted-foreground">
          {isGA
            ? "Repositorio completo de exámenes, prácticas dirigidas y material de estudio de Geometría Analítica"
            : "Accede a exámenes anteriores y materiales de práctica de este curso"}
        </p>
      </div>

      {isGA && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <BookOpen className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{GEOMETRIA_PLANCHAS.length} prácticas dirigidas</span> disponibles en el repositorio.
            Revisa el material por tema para prepararte antes de tus evaluaciones.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <Input
          placeholder="Buscar por título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-secondary/50"
        />
        <div className="flex gap-2 flex-wrap">
          {TIPOS.map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFilterType(filterType === tipo ? null : tipo)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === tipo ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary/50 text-foreground hover:bg-secondary"
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando recursos...</p>
        ) : filteredRecursos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No se encontraron recursos</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecursos.map((recurso) => {
              const archivoLocal = (recurso as Recurso & { _archivoLocal?: string })._archivoLocal
              return (
                <RecursoCard
                  key={recurso.id}
                  recurso={recurso}
                  onDownload={archivoLocal ? () => apiService.downloadPlancha(courseId, archivoLocal) : undefined}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
