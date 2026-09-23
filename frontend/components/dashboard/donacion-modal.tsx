// Modal de donaciones: muestra el QR de Yape para que la comunidad apoye a UniVia.
"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { Heart, X } from "lucide-react"

interface DonacionModalProps {
  abierto: boolean
  onCerrar: () => void
}

export function DonacionModal({ abierto, onCerrar }: DonacionModalProps) {
  const [montado, setMontado] = useState(false)

  useEffect(() => setMontado(true), [])

  useEffect(() => {
    if (!abierto) return
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar()
    }
    window.addEventListener("keydown", alPresionar)
    return () => window.removeEventListener("keydown", alPresionar)
  }, [abierto, onCerrar])

  if (!abierto || !montado) return null

  // Va montado en <body>: dentro del árbol del dashboard, el contenedor de
  // scroll y las tarjetas animadas (transform) acotaban el `fixed` y el velo
  // no llegaba al borde inferior de la ventana.
  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donacion-titulo"
      onClick={onCerrar}
    >
      <div
        className="relative w-full max-w-md max-h-full overflow-hidden rounded-2xl border border-[#7957f1]/25 bg-[#0d0e1b] shadow-[0_24px_64px_rgba(0,0,0,0.65)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Resplandores de marca, consistentes con las tarjetas del dashboard */}
        <div
          className="absolute -top-20 -right-16 w-48 h-48 rounded-full bg-[#7957f1]/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-[#d93340]/12 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative flex flex-col items-center gap-4 px-6 pt-8 pb-6 text-center">
          <Image
            src="/Logo_LEAD_UNI.png"
            alt="LEAD UNI"
            width={48}
            height={48}
            className="w-12 h-12 object-contain drop-shadow-[0_2px_12px_rgba(217,51,64,0.4)]"
          />

          <div className="space-y-1.5">
            <h2 id="donacion-titulo" className="font-heading text-lg font-semibold text-foreground">
              Apoya a UniVia
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Escanea el QR con tu app de Yape y aporta el monto que quieras.
            </p>
          </div>

          <div className="min-h-0 rounded-2xl bg-white p-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.45)]">
            <Image
              src="/QR-YAPE.jpeg"
              alt="Código QR de Yape para donar a UniVia"
              width={320}
              height={480}
              // La altura manda sobre el ancho: el QR de Yape es una tarjeta
              // vertical y, sin tope, desbordaba el modal en pantallas bajas.
              className="w-auto h-auto max-h-[46vh] max-w-full object-contain rounded-lg"
            />
          </div>

          <p className="text-xs text-muted-foreground/90 leading-relaxed">
            En el mensaje del Yape escribe{" "}
            <span className="font-semibold text-foreground">&ldquo;Donación UniVia&rdquo;</span> para
            que podamos identificar tu aporte.
          </p>

          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold gradient-brand-text">
            <Heart className="w-4 h-4 text-[#d93340]" aria-hidden="true" />
            ¡Apóyanos! Tu aporte cuenta :)
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
