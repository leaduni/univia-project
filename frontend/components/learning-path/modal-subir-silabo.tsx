"use client"

// Modal: subida del sílabo en PDF/imagen con drag & drop y progreso real.
// Fase 11 — Ruta de aprendizaje vacía. El backend queda en
// 'en_procesamiento' y notifica a los devs; este modal confirma "<24h".

import { useRef, useState } from "react"
import { FileUp, Loader2, CheckCircle2, XCircle, X } from "lucide-react"
import { apiService, mensajeAmigableError } from "@/lib/api-service"

const MIMES_ADMITIDOS: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
}
const MAX_BYTES = 10 * 1024 * 1024

interface ModalSubirSilaboProps {
  courseId: string | number
  nombreCurso: string
  abierto: boolean
  onCerrar: () => void
  /** Se dispara cuando la solicitud quedó registrada (para re-leer la ruta). */
  onSubido?: () => void
}

export function ModalSubirSilabo({
  courseId,
  nombreCurso,
  abierto,
  onCerrar,
  onSubido,
}: ModalSubirSilaboProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [exito, setExito] = useState(false)

  if (!abierto) return null

  const validar = (f: File): string | null => {
    if (!MIMES_ADMITIDOS[f.type]) return "Usa un PDF o imagen (PNG, JPG, WEBP)."
    if (f.size > MAX_BYTES) return "El archivo supera los 10 MB."
    return null
  }

  const seleccionar = (f: File | undefined | null) => {
    if (!f) return
    const problema = validar(f)
    setError(problema)
    setArchivo(problema ? null : f)
  }

  const resetear = () => {
    setArchivo(null)
    setError(null)
    setProgreso(0)
    setSubiendo(false)
    setExito(false)
  }

  const cerrar = () => {
    if (subiendo) return // no cortar una subida en curso
    resetear()
    onCerrar()
  }

  const enviar = async () => {
    if (!archivo || subiendo) return
    setSubiendo(true)
    setError(null)
    setProgreso(0)
    try {
      await apiService.subirSilabo(courseId, archivo, setProgreso)
      setExito(true)
      onSubido?.()
    } catch (err) {
      setError(mensajeAmigableError(err))
      setProgreso(0)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={cerrar}
    >
      <div
        className="bg-[#14132a] border border-[#27244a] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Subir sílabo oficial</h3>
            <p className="text-xs text-slate-400 mt-1">
              Lo procesaremos en menos de 24 horas y la ruta oficial de{" "}
              <span className="text-slate-200 font-semibold">{nombreCurso}</span> se activará para todos.
            </p>
          </div>
          <button
            onClick={cerrar}
            disabled={subiendo}
            className="text-slate-500 hover:text-slate-300 disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {exito ? (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-emerald-300">Sílabo recibido</p>
            <p className="text-xs text-emerald-200/80">
              En procesamiento: la ruta oficial estará lista en menos de 24 horas.
            </p>
            <button
              onClick={cerrar}
              className="mt-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all"
            >
              Entendido
            </button>
          </div>
        ) : (
          <>
            {!archivo ? (
              <div
                role="button"
                tabIndex={0}
                aria-label="Seleccionar o arrastrar el sílabo"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setArrastrando(true)
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setArrastrando(false)
                  seleccionar(e.dataTransfer.files?.[0])
                }}
                className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                  arrastrando
                    ? "border-[#ec4899] bg-pink-500/5"
                    : "border-[#3b3475] hover:border-[#5a4fb0] hover:bg-[#1d1a3b]/60"
                }`}
              >
                <FileUp className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
                <p className="text-sm font-semibold text-slate-200">
                  Arrastra tu sílabo aquí
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  o haz clic para elegirlo — PDF, PNG, JPG o WEBP (máx. 10 MB)
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#3b3475] bg-[#1d1a3b]/60 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{archivo.name}</p>
                  <p className="text-xs text-slate-400">
                    {(archivo.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                {!subiendo && (
                  <button
                    onClick={() => setArchivo(null)}
                    className="text-slate-500 hover:text-slate-300 shrink-0"
                    aria-label="Quitar archivo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {(subiendo || progreso > 0) && !exito && (
              <div className="space-y-1.5">
                <div className="h-2 bg-[#232045] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ec4899] to-[#a855f7] rounded-full transition-all"
                    style={{ width: `${subiendo ? progreso : 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 text-right">{progreso}%</p>
              </div>
            )}

            {error && (
              <p className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 shrink-0" />
                {error}
              </p>
            )}

            <button
              onClick={enviar}
              disabled={!archivo || subiendo}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {subiendo ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Subiendo...
                </span>
              ) : (
                "Enviar sílabo"
              )}
            </button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={Object.keys(MIMES_ADMITIDOS).join(",")}
          className="hidden"
          onChange={(e) => seleccionar(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}
