// Paso 2 del flujo de donación: el monto exacto (con centavo identificador) y el QR.
"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { Check, Copy, Loader2, X } from "lucide-react"
import { formatearSoles } from "./constantes"
import type { IntencionDonacion } from "@/lib/donaciones-service"

interface YapeModalProps {
  intencion: IntencionDonacion
  enviando: boolean
  onConfirmar: () => void
  onCerrar: () => void
}

export function YapeModal({ intencion, enviando, onConfirmar, onCerrar }: YapeModalProps) {
  const [montado, setMontado] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => setMontado(true), [])

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviando) onCerrar()
    }
    window.addEventListener("keydown", alPresionar)
    return () => window.removeEventListener("keydown", alPresionar)
  }, [enviando, onCerrar])

  if (!montado) return null

  const montoTexto = intencion.monto_exacto.toFixed(2)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(montoTexto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin portapapeles (contexto no seguro o permiso denegado): el monto
      // igual está a la vista, así que no vale interrumpir con un error.
    }
  }

  // Montado en <body>: dentro del árbol del dashboard hay contenedores con
  // transform que acotarían el `fixed` y el velo no cubriría toda la ventana.
  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="yape-modal-titulo"
      onClick={() => !enviando && onCerrar()}
    >
      <div
        className="relative w-full max-w-md max-h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e1b] shadow-[0_24px_64px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative gradient-brand-br px-6 py-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">
            Paso 2 de 2
          </p>
          <h2 id="yape-modal-titulo" className="font-heading text-lg font-bold text-white">
            Yapea este monto exacto
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            aria-label="Cerrar"
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black/25 text-white/90 transition-colors hover:bg-black/40 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 px-6 py-5 text-center">
          <button
            type="button"
            onClick={copiar}
            className="w-full rounded-xl border-2 border-dashed border-[#7957f1]/40 px-4 py-3 transition-colors hover:border-[#7957f1]/70"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Monto exacto a transferir
            </p>
            <p className="font-heading text-4xl font-bold text-foreground">
              {formatearSoles(intencion.monto_exacto)}
            </p>
            <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#c4b5fd]">
              {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado ? "Monto copiado" : "Toca para copiar monto"}
            </span>
          </button>

          <div className="rounded-2xl bg-white p-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.45)]">
            <Image
              src="/QR-YAPE.jpeg"
              alt="Código QR de Yape de UniVia"
              width={320}
              height={480}
              className="w-auto h-auto max-h-[34vh] max-w-full object-contain rounded-lg"
            />
          </div>

          <div className="w-full rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100/90">
            Yapea <b>{formatearSoles(intencion.monto_exacto)}</b> exacto. El céntimo extra
            permite reconocer tu aporte automáticamente, sin pedirte capturas.
          </div>

          <button
            type="button"
            onClick={onConfirmar}
            disabled={enviando}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-white/[0.1] disabled:opacity-60"
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400" />
            )}
            Ya yapeé {formatearSoles(intencion.monto_exacto)}
          </button>

          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Cancelar o cambiar monto
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
