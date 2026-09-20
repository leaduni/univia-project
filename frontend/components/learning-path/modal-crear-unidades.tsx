"use client"

// Modal: creación manual de unidades y temas (origen='usuario').
// Fase 11 — Ruta de aprendizaje vacía. Formulario dinámico espejo de los
// límites del backend (hasta 12 unidades, 12 temas por unidad).

import { useState } from "react"
import { Loader2, Plus, Trash2, X, XCircle } from "lucide-react"
import { apiService, mensajeAmigableError, UnidadUsuarioEntrada } from "@/lib/api-service"

const MAX_UNIDADES = 12
const MAX_TEMAS = 12

interface UnidadFormulario {
  titulo: string
  duracion: string
  temasTexto: string
}

const unidadVacia = (): UnidadFormulario => ({ titulo: "", duracion: "", temasTexto: "" })

interface ModalCrearUnidadesProps {
  courseId: string | number
  nombreCurso: string
  abierto: boolean
  onCerrar: () => void
  /** Se dispara cuando las unidades quedaron persistidas, para re-leer la ruta. */
  onCreadas?: () => void
}

export function ModalCrearUnidades({
  courseId,
  nombreCurso,
  abierto,
  onCerrar,
  onCreadas,
}: ModalCrearUnidadesProps) {
  const [unidades, setUnidades] = useState<UnidadFormulario[]>([unidadVacia()])
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  if (!abierto) return null

  const actualizar = (indice: number, cambios: Partial<UnidadFormulario>) => {
    setUnidades((prev) =>
      prev.map((u, i) => (i === indice ? { ...u, ...cambios } : u)),
    )
  }

  const agregar = () => {
    if (unidades.length >= MAX_UNIDADES) return
    setUnidades((prev) => [...prev, unidadVacia()])
  }

  const quitar = (indice: number) => {
    setUnidades((prev) => prev.filter((_, i) => i !== indice))
  }

  const resetearYCerrar = () => {
    if (guardando) return
    setUnidades([unidadVacia()])
    setError(null)
    onCerrar()
  }

  const guardar = async () => {
    if (guardando) return

    const validas: UnidadUsuarioEntrada[] = unidades
      .map((u) => ({
        titulo: u.titulo.trim(),
        duracion: u.duracion.trim() || undefined,
        topics: u.temasTexto
          .split(/\n|,/)
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, MAX_TEMAS),
      }))
      .filter((u) => u.titulo.length > 0)

    if (validas.length === 0) {
      setError("Escribe el título de al menos una unidad.")
      return
    }

    setGuardando(true)
    setError(null)
    try {
      await apiService.crearUnidadesUsuario(courseId, validas)
      onCreadas?.()
      resetearYCerrar()
    } catch (err) {
      setError(mensajeAmigableError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={resetearYCerrar}
    >
      <div
        className="bg-[#14132a] border border-[#27244a] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Crear mis unidades</h3>
            <p className="text-xs text-slate-400 mt-1">
              Arma tu propia ruta para{" "}
              <span className="text-slate-200 font-semibold">{nombreCurso}</span>{" "}
              mientras llega el sílabo oficial. Solo tú la verás.
            </p>
          </div>
          <button
            onClick={resetearYCerrar}
            disabled={guardando}
            className="text-slate-500 hover:text-slate-300 disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {unidades.map((unidad, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#3b3475] bg-[#1d1a3b]/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                  Unidad {i + 1}
                </span>
                {unidades.length > 1 && (
                  <button
                    onClick={() => quitar(i)}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                    aria-label={`Quitar unidad ${i + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <input
                type="text"
                value={unidad.titulo}
                onChange={(e) => actualizar(i, { titulo: e.target.value })}
                placeholder="Título (ej. Límites y continuidad)"
                maxLength={120}
                className="w-full rounded-lg bg-[#121124] border border-[#2b2654] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ec4899]"
              />

              <input
                type="text"
                value={unidad.duracion}
                onChange={(e) => actualizar(i, { duracion: e.target.value })}
                placeholder="Duración estimada (opcional, ej. 4h)"
                className="w-full rounded-lg bg-[#121124] border border-[#2b2654] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ec4899]"
              />

              <textarea
                value={unidad.temasTexto}
                onChange={(e) => actualizar(i, { temasTexto: e.target.value })}
                placeholder={"Temas (uno por línea o separados por coma)"}
                rows={3}
                className="w-full rounded-lg bg-[#121124] border border-[#2b2654] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ec4899] resize-y"
              />
            </div>
          ))}
        </div>

        {unidades.length < MAX_UNIDADES && (
          <button
            onClick={agregar}
            className="w-full py-2.5 rounded-xl border border-dashed border-[#3b3475] text-sm font-semibold text-slate-300 hover:border-[#5a4fb0] hover:bg-[#1d1a3b]/60 transition-all inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar otra unidad
          </button>
        )}

        {error && (
          <p className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}

        <button
          onClick={guardar}
          disabled={guardando}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {guardando ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </span>
          ) : (
            "Crear mi ruta"
          )}
        </button>
      </div>
    </div>
  )
}
