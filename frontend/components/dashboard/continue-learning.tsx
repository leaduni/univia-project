// Sección "Continúa donde te quedaste" del dashboard
"use client"

import { useRouter } from "next/navigation"
import { Atom, BarChart3, BookOpen, GitBranch, Sigma } from "lucide-react"
import { aRomano } from "@/lib/ciclos"

export interface CursoActivo {
  id: number | string
  code: string
  name: string
  credits: number
  ciclo: number | null
  progreso: number
  temas_completados: number
  temas_totales: number
  siguiente_tema: string | null
}

interface ContinueLearningProps {
  cursos: CursoActivo[]
  isLoading: boolean
}

// Degradados de marca para la cabecera de cada tarjeta. Son decorativos: el
// estado real lo comunican el badge y la barra de avance.
const CABECERAS = [
  "gradient-brand",
  "gradient-purple",
  "gradient-brand-br",
  "gradient-icon",
]

const MARCAS_AGUA = [Sigma, Atom, GitBranch, BarChart3]

function TarjetaCurso({ curso, index }: { curso: CursoActivo; index: number }) {
  const router = useRouter()
  const Marca = MARCAS_AGUA[index % MARCAS_AGUA.length]

  const abrir = () => router.push(`/curso/${curso.id}`)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={abrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          abrir()
        }
      }}
      aria-label={`${curso.name}, ${curso.progreso}% completado`}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-card border border-border flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-lg hover:shadow-accent/10 active:scale-[0.99]"
    >
      <div
        className={`relative h-32 p-4 flex flex-col justify-between overflow-hidden ${
          CABECERAS[index % CABECERAS.length]
        }`}
      >
        <div className="absolute -right-2 -bottom-2 opacity-20 text-primary-foreground pointer-events-none">
          <Marca className="w-28 h-28 stroke-[1.5]" />
        </div>
        <div className="flex justify-between items-center gap-2 z-10">
          <span className="text-xs font-bold text-primary-foreground/90 tracking-wider">
            {curso.code}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs bg-background/40 backdrop-blur-md text-primary-foreground font-medium border border-primary-foreground/10 flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
            En curso
          </span>
        </div>
        <h3 className="font-heading text-lg font-bold text-primary-foreground z-10 leading-snug">
          {curso.name}
        </h3>
      </div>

      <div className="p-4 flex flex-col justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {curso.ciclo ? `Ciclo ${aRomano(curso.ciclo)}` : "Sin ciclo"} · {curso.credits} créditos
        </p>

        {/* Si el curso no tiene ruta cargada no se inventa un "sigue con...". */}
        <p className="text-xs text-foreground line-clamp-1">
          {curso.siguiente_tema ? (
            <>
              <span className="text-muted-foreground">Sigue:</span> {curso.siguiente_tema}
            </>
          ) : curso.temas_totales > 0 ? (
            <span className="text-muted-foreground">Completaste todos los temas</span>
          ) : (
            <span className="text-muted-foreground">Aún sin ruta de aprendizaje</span>
          )}
        </p>

        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="progress-bar-modern-fill"
              style={{ width: `${Math.min(curso.progreso, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium shrink-0">
            {curso.progreso}%
          </span>
        </div>

        {curso.temas_totales > 0 && (
          <p className="text-[11px] text-muted-foreground/70">
            {curso.temas_completados} de {curso.temas_totales} temas
          </p>
        )}
      </div>
    </div>
  )
}

export function ContinueLearning({ cursos, isLoading }: ContinueLearningProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-56 bg-card animate-pulse rounded-2xl border border-border" />
        ))}
      </div>
    )
  }

  if (!cursos?.length) {
    return (
      <div className="p-10 text-center bg-card rounded-2xl border border-dashed border-border">
        <div className="p-3 rounded-lg gradient-brand-br inline-flex mb-4">
          <BookOpen className="w-6 h-6 text-primary-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">
          No tienes cursos activos en este momento.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          Aparecerán aquí cuando registres los cursos de tu ciclo.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cursos.map((curso, index) => (
        <TarjetaCurso key={curso.id} curso={curso} index={index} />
      ))}
    </div>
  )
}
