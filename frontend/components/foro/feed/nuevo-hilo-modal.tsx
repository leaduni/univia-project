"use client"

// Modal "Nuevo hilo" del feed global (Fase 5): elige sección y reutiliza
// CrearPublicacionForm. No hay componente Dialog en el proyecto, así que se
// implementa un overlay propio con cierre por Escape y click fuera.

import { useEffect, useState } from "react"
import { Loader2, X } from "lucide-react"
import { foroService } from "@/lib/foro-service"
import type { Publicacion, Seccion } from "@/types/foro"
import { CrearPublicacionForm } from "../crear-publicacion-form"

interface NuevoHiloModalProps {
  abierto: boolean
  onCerrar: () => void
  onCreada: (publicacion: Publicacion) => void
}

export function NuevoHiloModal({ abierto, onCerrar, onCreada }: NuevoHiloModalProps) {
  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [seccionId, setSeccionId] = useState<number | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [abierto, onCerrar])

  useEffect(() => {
    if (!abierto) return
    setCargando(true)
    foroService
      .getSecciones()
      .then((lista) => {
        setSecciones(lista)
        if (lista.length > 0) setSeccionId((prev) => prev ?? lista[0].id)
      })
      .catch(() => setSecciones([]))
      .finally(() => setCargando(false))
  }, [abierto])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label="Crear nuevo hilo"
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/10 bg-card p-5 sm:p-6 shadow-2xl anim-up max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-poppins font-semibold text-lg text-foreground">Nuevo hilo</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando secciones…
          </div>
        ) : secciones.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay secciones disponibles para publicar.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="nuevo-hilo-seccion"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Sección
              </label>
              <select
                id="nuevo-hilo-seccion"
                value={seccionId ?? ""}
                onChange={(e) => setSeccionId(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#7957f1]"
              >
                {secciones.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-950">
                    {s.facultad_nombre ? `${s.titulo} · ${s.facultad_nombre}` : s.titulo}
                  </option>
                ))}
              </select>
            </div>

            {seccionId != null && (
              <CrearPublicacionForm
                key={seccionId}
                seccionId={seccionId}
                onCreada={(p) => {
                  onCreada(p)
                  onCerrar()
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
