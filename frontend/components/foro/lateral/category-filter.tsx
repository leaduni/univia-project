"use client"

// Filtro por categorías/facultades (columna izquierda, Fase 5): secciones
// globales directas + secciones por facultad agrupadas en un acordeón.
// Escribe ?seccion_id= en la URL (fuente de verdad del feed).

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Globe, Hash, Loader2 } from "lucide-react"
import { foroService } from "@/lib/foro-service"
import type { Seccion } from "@/types/foro"
import { cn } from "@/lib/utils"

export function CategoryFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const seccionActual = searchParams.get("seccion_id")
  const facultadActual = searchParams.get("facultad_id")

  const [secciones, setSecciones] = useState<Seccion[] | null>(null)
  const [expandida, setExpandida] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    foroService
      .getSecciones()
      .then((data) => {
        if (activo) setSecciones(data)
      })
      .catch(() => {
        if (activo) setSecciones([])
      })
    return () => {
      activo = false
    }
  }, [])

  const globales = useMemo(
    () => (secciones ?? []).filter((s) => s.tipo === "global"),
    [secciones],
  )

  // Agrupa las secciones de facultad por nombre de facultad.
  const porFacultad = useMemo(() => {
    const grupos = new Map<string, Seccion[]>()
    for (const s of secciones ?? []) {
      if (s.tipo !== "facultad") continue
      const clave = s.facultad_nombre || `Facultad ${s.facultad_id ?? ""}`
      if (!grupos.has(clave)) grupos.set(clave, [])
      grupos.get(clave)!.push(s)
    }
    return [...grupos.entries()]
  }, [secciones])

  const navegar = (cambios: { seccion_id?: string | null; facultad_id?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(cambios)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    const qs = params.toString()
    router.replace(qs ? `/foro?${qs}` : "/foro", { scroll: false })
  }

  if (secciones === null) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-white/35">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Cargando categorías…
      </div>
    )
  }

  const clasesItem = (activo: boolean) =>
    cn(
      "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition-all duration-200",
      activo
        ? "border border-violet-400/10 bg-violet-500/[0.12] font-medium text-violet-200"
        : "border border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white/80",
    )

  return (
    <div className="space-y-4">
      {/* Comunidad General */}
      {globales.length > 0 && (
        <div>
          <h3 className="mb-3 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            Comunidad general
          </h3>
          <div className="space-y-0.5">
            {globales.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navegar({ seccion_id: String(s.id), facultad_id: null })}
                aria-current={seccionActual === String(s.id) ? "true" : undefined}
                className={clasesItem(seccionActual === String(s.id))}
              >
                <Globe className="h-4 w-4 shrink-0 text-cyan-400/60" />
                <span className="truncate">{s.titulo}</span>
                <span className="ml-auto text-[10px] tabular-nums text-white/20">
                  {s.num_publicaciones}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Por Facultad (acordeón) */}
      {porFacultad.length > 0 && (
        <div>
          <h3 className="mb-2 px-2.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
            Por facultad
          </h3>
          <div className="space-y-1">
            {porFacultad.map(([facultad, lista]) => {
              const abierta =
                expandida === facultad ||
                lista.some((s) => String(s.facultad_id) === facultadActual) ||
                lista.some((s) => String(s.id) === seccionActual)
              const facultadId = lista[0]?.facultad_id
              return (
                <div key={facultad}>
                  <button
                    type="button"
                    onClick={() => setExpandida(abierta ? null : facultad)}
                    aria-expanded={abierta}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-white/55 transition hover:bg-white/[0.04] hover:text-white/80"
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-white/25 transition-transform group-hover:text-white/50",
                        !abierta && "-rotate-90",
                      )}
                    />
                    <span className="truncate">{facultad}</span>
                  </button>
                  {abierta && (
                    <div className="mt-0.5 space-y-0.5 pl-5">
                      {facultadId != null && (
                        <button
                          type="button"
                          onClick={() =>
                            navegar({ facultad_id: String(facultadId), seccion_id: null })
                          }
                          aria-current={facultadActual === String(facultadId) ? "true" : undefined}
                          className={clasesItem(facultadActual === String(facultadId))}
                        >
                          <Hash className="h-3 w-3 shrink-0" />
                          <span className="truncate">Toda la facultad</span>
                        </button>
                      )}
                      {lista.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            navegar({ seccion_id: String(s.id), facultad_id: null })
                          }
                          aria-current={seccionActual === String(s.id) ? "true" : undefined}
                          className={clasesItem(seccionActual === String(s.id))}
                        >
                          <Hash className="h-3 w-3 shrink-0 text-white/25" />
                          <span className="truncate">{s.titulo}</span>
                          <span className="ml-auto text-[10px] tabular-nums text-white/20">
                            {s.num_publicaciones}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {secciones.length === 0 && (
        <p className="px-2.5 py-2 text-xs text-white/35">
          No hay secciones disponibles.
        </p>
      )}
    </div>
  )
}
