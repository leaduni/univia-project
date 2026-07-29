// Menú desplegable "Explorar" de la barra superior
"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  BookMarked,
  ChevronDown,
  FlaskConical,
  GraduationCap,
  Laptop,
  Loader2,
  Lock,
  Sparkles,
  Video,
  Wrench,
} from "lucide-react"
import { apiService } from "@/lib/api-service"
import { cn } from "@/lib/utils"
import type { Carrera } from "@/types/onboarding"

interface CursoMenu {
  id: string
  code: string
  name: string
  bloqueado: boolean
}

/**
 * Prefijos reales de los códigos de la malla UNI, tomados del catálogo
 * (`seed_catalogo.sql`). No hay columna de área en `cursos`, así que la
 * agrupación se deriva del código, que es el dato que sí existe.
 */
const AREAS = {
  basicas: ["BMA", "BFI", "BQU", "FB"], // matemática, física, química, formación básica
  computacion: ["BIC", "SI", "SW"], // introducción, sistemas, software
}

const MAX_POR_COLUMNA = 6

const prefijo = (code: string) => code.split(/[0-9_]/)[0]

export function ExplorarMenu() {
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [cargado, setCargado] = useState(false)
  const [basicas, setBasicas] = useState<CursoMenu[]>([])
  const [computacion, setComputacion] = useState<CursoMenu[]>([])
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [miCarreraId, setMiCarreraId] = useState<number | null>(null)
  const contenedor = useRef<HTMLDivElement>(null)

  /** Se carga al abrir, no al montar: el menú vive en todas las pantallas. */
  const cargar = async () => {
    if (cargado || cargando) return
    setCargando(true)
    try {
      const [ciclos, meta] = await Promise.all([
        apiService.getMalla().catch(() => []),
        apiService.getOnboardingData().catch(() => null),
      ])

      const planos: CursoMenu[] = (Array.isArray(ciclos) ? ciclos : []).flatMap((ciclo: any) =>
        (ciclo.courses || []).map((c: any) => ({
          id: String(c.id),
          code: c.code,
          name: c.name,
          bloqueado: c.status === "locked",
        })),
      )

      setBasicas(planos.filter((c) => AREAS.basicas.includes(prefijo(c.code))).slice(0, MAX_POR_COLUMNA))
      setComputacion(
        planos.filter((c) => AREAS.computacion.includes(prefijo(c.code))).slice(0, MAX_POR_COLUMNA),
      )
      setCarreras(meta?.carreras ?? [])

      const perfil = await apiService.getProfile().catch(() => null)
      setMiCarreraId(perfil?.carrera_id ?? null)
      setCargado(true)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const alClicar = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false)
    }
    const alEscapar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false)
    }
    document.addEventListener("mousedown", alClicar)
    document.addEventListener("keydown", alEscapar)
    return () => {
      document.removeEventListener("mousedown", alClicar)
      document.removeEventListener("keydown", alEscapar)
    }
  }, [])

  const alternar = () => {
    const siguiente = !abierto
    setAbierto(siguiente)
    if (siguiente) cargar()
  }

  return (
    <div ref={contenedor} className="relative hidden lg:block">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={abierto}
        aria-haspopup="true"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
          abierto
            ? "bg-accent/15 text-accent"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        Explorar
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", abierto && "rotate-180")} />
      </button>

      {abierto && (
        <div className="absolute right-0 top-full mt-2 w-[860px] max-w-[92vw] rounded-2xl bg-card border border-border shadow-2xl p-6 z-50">
          {cargando && !cargado ? (
            <div className="flex items-center justify-center gap-3 py-10">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <p className="text-sm text-muted-foreground">Cargando tus cursos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-6">
              <ColumnaCursos
                titulo="Ciencias Básicas"
                icono={FlaskConical}
                cursos={basicas}
                onNavegar={() => setAbierto(false)}
              />
              <ColumnaCursos
                titulo="Computación"
                icono={Laptop}
                cursos={computacion}
                onNavegar={() => setAbierto(false)}
              />

              <div className="space-y-3">
                <Encabezado icono={GraduationCap} titulo="Por Facultad" />
                {carreras.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pudimos cargar las carreras.</p>
                ) : (
                  <ul className="space-y-2">
                    {carreras.map((carrera) => {
                      const esMia = carrera.id === miCarreraId
                      return (
                        <li key={carrera.id}>
                          {/* Solo la carrera propia enlaza: el backend sirve la
                              malla del estudiante autenticado, no la de
                              cualquier carrera. */}
                          {esMia ? (
                            <Link
                              href="/malla"
                              onClick={() => setAbierto(false)}
                              className="block group"
                            >
                              <p className="text-xs font-semibold text-accent group-hover:underline">
                                {carrera.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {carrera.facultad?.nombre} · tu carrera
                              </p>
                            </Link>
                          ) : (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">
                                {carrera.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground/60">
                                {carrera.facultad?.nombre}
                              </p>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-3">
                <Encabezado icono={Wrench} titulo="Herramientas" />
                <ul className="space-y-1.5">
                  <li>
                    <Herramienta
                      icono={BookMarked}
                      label="Banco de exámenes"
                      href="/recursos?tipo=Examen"
                      onNavegar={() => setAbierto(false)}
                    />
                  </li>
                  <li>
                    <Herramienta
                      icono={GraduationCap}
                      label="Mi malla curricular"
                      href="/malla"
                      onNavegar={() => setAbierto(false)}
                    />
                  </li>
                  {/* Sin destino todavía. Se muestran deshabilitadas en vez de
                      enlazar a una página que no existe. */}
                  <li>
                    <Herramienta icono={Sparkles} label="Evaluaciones con IA" />
                  </li>
                  <li>
                    <Herramienta icono={Video} label="Clases grabadas" />
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Encabezado({ icono: Icono, titulo }: { icono: any; titulo: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-border">
      <Icono className="w-4 h-4 text-accent" />
      <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
        {titulo}
      </h3>
    </div>
  )
}

function ColumnaCursos({
  titulo,
  icono,
  cursos,
  onNavegar,
}: {
  titulo: string
  icono: any
  cursos: CursoMenu[]
  onNavegar: () => void
}) {
  return (
    <div className="space-y-3">
      <Encabezado icono={icono} titulo={titulo} />
      {cursos.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Tu malla no tiene cursos de esta área.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {cursos.map((curso) =>
            curso.bloqueado ? (
              <li
                key={curso.id}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/60"
                title="Te faltan prerrequisitos para este curso"
              >
                <Lock className="w-3 h-3 shrink-0" />
                <span className="truncate">{curso.name}</span>
              </li>
            ) : (
              <li key={curso.id}>
                <Link
                  href={`/curso/${curso.id}`}
                  onClick={onNavegar}
                  className="block text-xs text-muted-foreground hover:text-accent transition-colors truncate"
                >
                  {curso.name}
                </Link>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}

function Herramienta({
  icono: Icono,
  label,
  href,
  onNavegar,
}: {
  icono: any
  label: string
  href?: string
  onNavegar?: () => void
}) {
  if (!href) {
    return (
      <span className="flex items-center gap-2 text-xs text-muted-foreground/50 cursor-default">
        <Icono className="w-3.5 h-3.5 shrink-0" />
        {label}
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/70">
          pronto
        </span>
      </span>
    )
  }

  return (
    <Link
      href={href}
      onClick={onNavegar}
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors"
    >
      <Icono className="w-3.5 h-3.5 shrink-0" />
      {label}
    </Link>
  )
}
