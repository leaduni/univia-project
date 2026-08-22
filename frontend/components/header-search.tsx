// Buscador de cursos de la barra superior
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock, Search } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { COURSE_STATUS_MAP, type CourseStatus } from "@/lib/course-status"
import { cn } from "@/lib/utils"

interface CursoBuscable {
  id: string
  code: string
  name: string
  ciclo_num: number
  status: CourseStatus
}

const MAX_RESULTADOS = 6

/**
 * Quita tildes para que "calculo" encuentre "Cálculo".
 *
 * NFD separa la letra de su tilde y el rango ̀-ͯ borra las marcas
 * diacríticas sueltas. Sin esto, buscar sin tildes —que es como se escribe
 * rápido— no encontraría casi ningún curso.
 */
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")

export function HeaderSearch() {
  const router = useRouter()
  const [consulta, setConsulta] = useState("")
  const [cursos, setCursos] = useState<CursoBuscable[]>([])
  const [cargando, setCargando] = useState(false)
  const [cargado, setCargado] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(0)
  const contenedor = useRef<HTMLDivElement>(null)

  /**
   * Los cursos se piden en el primer foco, no al montar la cabecera. La
   * cabecera está en todas las pantallas: cargarlos siempre sería una llamada
   * a la malla en cada navegación para una función que muchos no usan.
   */
  const cargarCursos = async () => {
    if (cargado || cargando) return
    setCargando(true)
    try {
      const ciclos = await apiService.getMalla()
      const planos: CursoBuscable[] = (Array.isArray(ciclos) ? ciclos : []).flatMap(
        (ciclo: any) =>
          (ciclo.courses || []).map((c: any) => ({
            id: String(c.id),
            code: c.code,
            name: c.name,
            ciclo_num: ciclo.ciclo_num,
            status: c.status,
          })),
      )
      setCursos(planos)
      setCargado(true)
    } catch {
      // Un buscador que no carga no debe romper la cabecera: queda vacío y
      // el mensaje de "sin resultados" cubre el caso.
      setCursos([])
      setCargado(true)
    } finally {
      setCargando(false)
    }
  }

  const resultados = useMemo(() => {
    const q = normalizar(consulta.trim())
    if (!q) return []
    return cursos
      .filter((c) => normalizar(c.code).includes(q) || normalizar(c.name).includes(q))
      .slice(0, MAX_RESULTADOS)
  }, [consulta, cursos])

  useEffect(() => setIndiceActivo(0), [consulta])

  // Cerrar al hacer clic fuera.
  useEffect(() => {
    const alClicar = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener("mousedown", alClicar)
    return () => document.removeEventListener("mousedown", alClicar)
  }, [])

  const irAlCurso = (curso: CursoBuscable) => {
    // Un curso bloqueado devuelve 403 en el detalle: mandar ahí al estudiante
    // sería llevarlo a un error en vez de explicarle que le faltan
    // prerrequisitos.
    if (curso.status === "locked") return
    setAbierto(false)
    setConsulta("")
    router.push(`/curso/${curso.id}`)
  }

  const alTeclear = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setAbierto(false)
      return
    }
    if (!resultados.length) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setIndiceActivo((i) => (i + 1) % resultados.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setIndiceActivo((i) => (i - 1 + resultados.length) % resultados.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      irAlCurso(resultados[indiceActivo])
    }
  }

  const mostrarPanel = abierto && consulta.trim().length > 0

  return (
    <div ref={contenedor} className="relative group flex-1 max-w-xl hidden md:block rounded-full bg-white/[0.05] border border-white/[0.09] ring-0 transition-all duration-250 hover:bg-white/[0.08] hover:border-white/[0.15] focus-within:bg-white/[0.08] focus-within:border-[#7957f1]/40 focus-within:shadow-[0_0_0_3px_rgba(121,87,241,0.12),0_2px_12px_rgba(121,87,241,0.15)]">
      <label htmlFor="buscador-cursos" className="sr-only">
        Buscar un curso de tu malla
      </label>
      <input
        id="buscador-cursos"
        type="text"
        role="combobox"
        aria-expanded={mostrarPanel}
        aria-controls="resultados-busqueda"
        aria-autocomplete="list"
        autoComplete="off"
        value={consulta}
        onFocus={() => {
          setAbierto(true)
          cargarCursos()
        }}
        onChange={(e) => {
          setConsulta(e.target.value)
          setAbierto(true)
        }}
        onKeyDown={alTeclear}
        placeholder="¿Qué curso quieres reforzar hoy?"
        className="w-full py-2.5 pl-5 pr-12 rounded-full bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground outline-none ring-0 focus-visible:ring-0 transition-all"
      />
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-full gradient-login-btn text-primary-foreground shadow-md shadow-accent/20 pointer-events-none text-muted-foreground/60 group-hover:text-muted-foreground transition-colors duration-200">
        {cargando ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </span>

      {mostrarPanel && (
        <div
          id="resultados-busqueda"
          role="listbox"
          className="absolute top-full mt-2 w-full rounded-2xl bg-card border border-border shadow-xl overflow-hidden z-50"
        >
          {cargando && !cargado ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Cargando tus cursos...</p>
          ) : resultados.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No encontramos cursos que coincidan con “{consulta.trim()}”.
            </p>
          ) : (
            resultados.map((curso, idx) => {
              const estado = COURSE_STATUS_MAP[curso.status]
              const bloqueado = curso.status === "locked"
              return (
                <button
                  key={curso.id}
                  type="button"
                  role="option"
                  aria-selected={idx === indiceActivo}
                  aria-disabled={bloqueado}
                  onMouseEnter={() => setIndiceActivo(idx)}
                  onClick={() => irAlCurso(curso)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    idx === indiceActivo ? "bg-muted" : "bg-transparent",
                    bloqueado && "cursor-not-allowed",
                  )}
                >
                  <span className="text-xs font-semibold text-accent shrink-0 w-16">
                    {curso.code}
                  </span>
                  <span
                    className={cn(
                      "text-sm flex-1 truncate",
                      bloqueado ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {curso.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    Ciclo {curso.ciclo_num}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1",
                      estado.badge,
                    )}
                  >
                    {bloqueado && <Lock className="w-3 h-3" />}
                    {estado.label}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
