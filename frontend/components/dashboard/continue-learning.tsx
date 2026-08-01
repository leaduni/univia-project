// Sección "Continúa donde te quedaste" del dashboard con marcas de agua dinámicas
"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Atom, BarChart3, BookOpen, Code, GraduationCap, Sigma } from "lucide-react"
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

// Degradados deterministas de cabecera por posición/curso
const CABECERA_GRADIENTS = [
  "linear-gradient(135deg, #d93340 0%, #7957f1 100%)",
  "linear-gradient(135deg, #d93340 0%, #a6249d 100%)",
  "linear-gradient(135deg, #a6249d 0%, #7957f1 100%)",
  "linear-gradient(135deg, #e69333 0%, #a6249d 100%)",
]

// Helper para seleccionar la marca de agua según nombre/código de materia
function getCourseIcon(name: string, code: string) {
  const str = `${name || ""} ${code || ""}`.toLowerCase()
  if (/(matem|cálcul|calcul|álgebr|algebr|geom|vector|matri)/.test(str)) return Sigma
  if (/(físic|fisic|electr|quím|quim|circu|termo)/.test(str)) return Atom
  if (/(estadís|estadis|probab|datos)/.test(str)) return BarChart3
  if (/(prog|algor|sistem|comput|cod|soft|redes)/.test(str)) return Code
  return GraduationCap
}

function TarjetaCurso({ curso, index }: { curso: CursoActivo; index: number }) {
  const router = useRouter()
  const Marca = getCourseIcon(curso.name, curso.code)
  const thumbGradient = CABECERA_GRADIENTS[index % CABECERA_GRADIENTS.length]

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
      className="group cursor-pointer rounded-2xl bg-[#232532] border border-[#3f424d] overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-[#7957f1] hover:shadow-xl active:scale-[0.99]"
    >
      {/* Thumbnail (Header 118px) */}
      <div
        className="relative h-[118px] p-4 flex flex-col justify-between overflow-hidden"
        style={{ background: thumbGradient }}
      >
        {/* Capa de brillo radial */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.28),transparent_58%)]" />
        {/* Capa de oscurecimiento inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141623]/80 via-transparent to-transparent" />

        {/* Marca de Agua Dinámica (Posicionada abajo a la derecha) */}
        <div className="absolute right-3 bottom-1 text-white/20 pointer-events-none">
          <Marca className="w-16 h-16 stroke-[1.4] transition-transform duration-300 group-hover:scale-110" />
        </div>

        {/* Fila superior: Código de curso + Badge En curso */}
        <div className="flex justify-between items-center gap-2 z-10">
          <span className="font-poppins font-bold text-[11px] text-white/90 tracking-wider">
            {curso.code}
          </span>
          <span className="text-[10.5px] px-2.5 py-0.5 rounded-md bg-[#141623]/60 backdrop-blur-md text-white font-medium border border-white/10 flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            En curso
          </span>
        </div>

        {/* Nombre del curso */}
        <h3 className="font-poppins font-semibold text-[15px] text-white z-10 leading-snug line-clamp-1 group-hover:text-white/90">
          {curso.name}
        </h3>
      </div>

      {/* Cuerpo inferior con metadatos y barra de progreso */}
      <div className="p-4 flex flex-col justify-between gap-2.5 flex-1">
        <div className="flex justify-between items-center text-[11.5px] text-[#e9e9ed]/50">
          <span>{curso.ciclo ? `Ciclo ${aRomano(curso.ciclo)}` : "Sin ciclo"}</span>
          <span>{curso.credits} créditos</span>
        </div>

        {/* Siguiente tema */}
        <p className="text-[11.5px] text-[#e9e9ed]/70 line-clamp-1">
          {curso.siguiente_tema ? (
            <>
              <span className="text-[#e9e9ed]/45">Sigue:</span> {curso.siguiente_tema}
            </>
          ) : curso.temas_totales > 0 ? (
            <span className="text-emerald-400/90 font-medium">Completaste todos los temas</span>
          ) : (
            <span className="text-[#e9e9ed]/45">Aún sin ruta de aprendizaje</span>
          )}
        </p>

        {/* Barra de Progreso */}
        <div className="space-y-1 pt-1 mt-auto">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#e9e9ed]/50">
              {curso.temas_totales > 0
                ? `${curso.temas_completados} de ${curso.temas_totales} temas`
                : "Progreso"}
            </span>
            <span className="font-poppins font-bold text-[#e9e9ed]">{curso.progreso}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#2e3142] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#a6249d] to-[#7957f1] transition-all duration-500"
              style={{ width: `${Math.min(curso.progreso, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ContinueLearning({ cursos, isLoading }: ContinueLearningProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-56 bg-[#232532] animate-pulse rounded-2xl border border-[#3f424d]" />
        ))}
      </div>
    )
  }

  if (!cursos?.length) {
    return (
      <div className="p-8 text-center bg-[#232532] rounded-2xl border border-dashed border-[#3f424d]">
        <div className="p-3 rounded-xl bg-gradient-to-br from-[#a6249d] to-[#7957f1] inline-flex mb-3 shadow-md">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <p className="text-[#e9e9ed] font-poppins font-semibold text-base">
          No tienes cursos activos en este momento.
        </p>
        <p className="text-xs text-[#e9e9ed]/60 mt-1">
          Aparecerán aquí cuando registres los cursos de tu ciclo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-poppins font-semibold text-[19px] text-[#e9e9ed]">
          Continúa donde te quedaste
        </h2>
        <Link href="/malla" className="text-xs font-semibold text-primary hover:underline transition-colors">
          Ver mi malla →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cursos.map((curso, index) => (
          <TarjetaCurso key={curso.id} curso={curso} index={index} />
        ))}
      </div>
    </div>
  )
}
