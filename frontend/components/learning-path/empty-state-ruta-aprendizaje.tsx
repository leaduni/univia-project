"use client"

// Empty state de la ruta de aprendizaje (fase 11): cuando el curso aún no
// tiene sílabo procesado (timeline vacío), el alumno puede:
//   1. Subir el sílabo (ModalSubirSilabo) -> queda en procesamiento < 24h.
//   2. Generar una ruta provisional con IA (un solo clic, feedback visual).
//   3. Crear sus unidades manualmente (ModalCrearUnidades).
// Si ya existe una solicitud abierta, se muestra su estado ("En procesamiento").

import { useState } from "react"
import { BookMarked, FileUp, Loader2, PencilLine, Sparkles, Hourglass } from "lucide-react"
import { toast } from "sonner"
import { apiService, mensajeAmigableError } from "@/lib/api-service"
import { ModalSubirSilabo } from "./modal-subir-silabo"
import { ModalCrearUnidades } from "./modal-crear-unidades"

interface EmptyStateRutaAprendizajeProps {
  courseId: string | number
  nombreCurso: string
  /** Solicitud abierta del alumno (si ya subió su sílabo). */
  solicitudSilabo?: {
    estado?: string
    nombre_original?: string
  } | null
  /** Re-leer la ruta tras crear unidades / generar provisional. */
  onRutaCreada: () => void
}

export function EmptyStateRutaAprendizaje({
  courseId,
  nombreCurso,
  solicitudSilabo,
  onRutaCreada,
}: EmptyStateRutaAprendizajeProps) {
  const [modalSilabo, setModalSilabo] = useState(false)
  const [modalUnidades, setModalUnidades] = useState(false)
  const [generandoIA, setGenerandoIA] = useState(false)
  const [errorIA, setErrorIA] = useState<string | null>(null)

  const generarConIA = async () => {
    if (generandoIA) return
    setGenerandoIA(true)
    setErrorIA(null)
    try {
      const resultado = await apiService.generarRutaProvisional(courseId)
      toast.success(resultado?.mensaje || "Ruta provisional generada.")
      onRutaCreada()
    } catch (err) {
      setErrorIA(mensajeAmigableError(err))
    } finally {
      setGenerandoIA(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#27244a] bg-[#121124]/60 p-8 md:p-10 text-center space-y-6">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#ec4899]/20 to-[#8b5cf6]/20 border border-[#3b3475] flex items-center justify-center">
        <BookMarked className="w-7 h-7 text-indigo-300" />
      </div>

      <div className="space-y-2 max-w-md mx-auto">
        <h2 className="text-xl font-black text-white">
          Este curso aún no tiene ruta oficial
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Aún no procesamos el sílabo de {nombreCurso}. Mientras tanto puedes
          empezar por tu cuenta con cualquiera de estas opciones:
        </p>
      </div>

      {solicitudSilabo && (
        <div className="max-w-md mx-auto rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 flex items-center gap-3 text-left">
          <Hourglass className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-200/90">
            Tu sílabo{" "}
            <span className="font-semibold">{solicitudSilabo.nombre_original || "enviado"}</span>{" "}
            está en procesamiento. Estará listo en menos de 24 horas.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        <button
          onClick={() => setModalSilabo(true)}
          disabled={Boolean(solicitudSilabo) && solicitudSilabo?.estado !== "rechazado"}
          className="group rounded-xl border border-[#3b3475] bg-[#1d1a3b]/60 p-5 text-left hover:border-[#ec4899] hover:bg-[#1d1a3b] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[#3b3475]"
        >
          <FileUp className="w-6 h-6 text-sky-400 mb-2" />
          <p className="text-sm font-bold text-white">Subir el sílabo</p>
          <p className="text-xs text-slate-400 mt-1">
            Nos lo envías y en menos de 24h habrá ruta oficial para todos.
          </p>
        </button>

        <button
          onClick={generarConIA}
          disabled={generandoIA}
          className="group rounded-xl border border-[#3b3475] bg-[#1d1a3b]/60 p-5 text-left hover:border-[#ec4899] hover:bg-[#1d1a3b] transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          {generandoIA ? (
            <Loader2 className="w-6 h-6 text-[#ec4899] mb-2 animate-spin" />
          ) : (
            <Sparkles className="w-6 h-6 text-[#ec4899] mb-2" />
          )}
          <p className="text-sm font-bold text-white">Generar ruta con IA</p>
          <p className="text-xs text-slate-400 mt-1">
            Provisional, solo para ti. Se reemplaza al llegar la oficial.
          </p>
        </button>

        <button
          onClick={() => setModalUnidades(true)}
          className="group rounded-xl border border-[#3b3475] bg-[#1d1a3b]/60 p-5 text-left hover:border-[#ec4899] hover:bg-[#1d1a3b] transition-all"
        >
          <PencilLine className="w-6 h-6 text-emerald-400 mb-2" />
          <p className="text-sm font-bold text-white">Crear mis unidades</p>
          <p className="text-xs text-slate-400 mt-1">
            Escribe a mano las unidades y temas que vas a seguir.
          </p>
        </button>
      </div>

      {generandoIA && (
        <p className="text-xs text-indigo-300 animate-pulse">
          La IA está armando tu ruta provisional, puede tardar hasta un minuto...
        </p>
      )}
      {errorIA && (
        <p className="text-xs font-semibold text-rose-300">{errorIA}</p>
      )}

      <ModalSubirSilabo
        courseId={courseId}
        nombreCurso={nombreCurso}
        abierto={modalSilabo}
        onCerrar={() => setModalSilabo(false)}
        onSubido={() => {
          toast.success("Sílabo enviado. Estará listo en menos de 24h.")
          onRutaCreada()
        }}
      />
      <ModalCrearUnidades
        courseId={courseId}
        nombreCurso={nombreCurso}
        abierto={modalUnidades}
        onCerrar={() => setModalUnidades(false)}
        onCreadas={() => {
          toast.success("Tus unidades quedaron creadas.")
          onRutaCreada()
        }}
      />
    </div>
  )
}
