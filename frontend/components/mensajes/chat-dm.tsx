"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Loader2, Send } from "lucide-react"
import { dmService } from "@/lib/dm-service"
import type { ConversacionDM, MensajeDM } from "@/types/dm"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BadgeModerador } from "@/components/foro/badge-moderador"

interface ChatDMProps {
  conversacion: ConversacionDM
  onVolver: () => void
}

export function ChatDM({ conversacion, onVolver }: ChatDMProps) {
  const [mensajes, setMensajes] = useState<MensajeDM[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [envError, setEnvError] = useState<string | null>(null)
  const finRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let activo = true

    dmService
      .getMensajes(conversacion.id)
      .then((data) => {
        if (activo) setMensajes(data)
        // Marcar como leído al abrir la conversación.
        dmService.marcarLeido(conversacion.id).catch(() => {})
      })
      .catch((e) => {
        if (activo) setError(e.message || "No se pudieron cargar los mensajes.")
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    // Realtime: recibir mensajes nuevos en vivo.
    const cancelar = dmService.suscribirConversacion(conversacion.id, (nuevo) => {
      if (!activo) return
      setMensajes((prev) => {
        if (prev.some((m) => m.id === nuevo.id)) return prev
        return [...prev, nuevo]
      })
    })

    return () => {
      activo = false
      cancelar()
    }
  }, [conversacion.id])

  // Auto-scroll al final al recibir/abrir mensajes.
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensajes.length])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const cuerpo = texto.trim()
    if (!cuerpo || enviando) return
    setEnviando(true)
    setEnvError(null)
    // Optimista: insertamos localmente y el backend/Realtime confirma.
    const temporal: MensajeDM = {
      id: -Date.now(),
      conversacion_dm_id: conversacion.id,
      remitente_id: "",
      cuerpo,
      leido: false,
      created_at: new Date().toISOString(),
      propio: true,
    }
    setMensajes((prev) => [...prev, temporal])
    setTexto("")
    try {
      const enviado = await dmService.enviarMensaje(conversacion.id, { cuerpo })
      setMensajes((prev) => prev.map((m) => (m.id === temporal.id ? enviado : m)))
    } catch (e: any) {
      setEnvError(e.message || "No se pudo enviar el mensaje.")
      // Revertir el mensaje optimista.
      setMensajes((prev) => prev.filter((m) => m.id !== temporal.id))
      setTexto(cuerpo)
    } finally {
      setEnviando(false)
    }
  }

  return (
    // Caja transparente: hereda la ventana glass de BandejaMensajes.
    <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {/* Cabecera */}
      <div className="flex h-[64px] shrink-0 items-center gap-3 border-b border-white/[0.06] px-5">
        <button
          type="button"
          onClick={onVolver}
          aria-label="Volver a la bandeja"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/40 transition-colors hover:border-white/[0.12] hover:text-white/80"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-medium uppercase text-white/60">
          {(conversacion.otro_nombre || "E").charAt(0)}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-white/85">
              {conversacion.otro_nombre || "Estudiante"}
            </h2>
            <p className="text-[10px] text-white/25">Conversación privada</p>
          </div>
          <BadgeModerador perfilId={conversacion.otro_id} />
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {error && (
          <p className="text-xs text-red-300 bg-red-400/[0.06] border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {cargando ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : mensajes.length === 0 ? (
          <p className="text-sm text-white/35 text-center pt-10">
            Sin mensajes todavía. ¡Saluda!
          </p>
        ) : (
          mensajes.map((mensaje) => (
            <MensajeBurbuja key={mensaje.id} mensaje={mensaje} />
          ))
        )}
        <div ref={finRef} />
      </div>

      {/* Input */}
      <form onSubmit={enviar} className="border-t border-white/[0.06] p-4">
        {envError && (
          <p className="mb-2 text-xs text-red-400">{envError}</p>
        )}
        <div className="flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un mensaje…"
            maxLength={5000}
            aria-label="Mensaje"
            className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-cyan-400/30 focus:outline-none focus:ring-4 focus:ring-cyan-500/10"
          />
          <Button type="submit" disabled={!texto.trim() || enviando} className="gap-1.5 shrink-0">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar
          </Button>
        </div>
      </form>
    </div>
  )
}

function MensajeBurbuja({ mensaje }: { mensaje: MensajeDM }) {
  return (
    <div className={cn("flex", mensaje.propio ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
          mensaje.propio
            ? "bg-gradient-to-br from-[#7957f1] to-[#a6249d] text-white rounded-br-md"
            : "bg-secondary/60 text-foreground border border-border/60 rounded-bl-md",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{mensaje.cuerpo}</p>
        <p className={cn("text-[10px] mt-1", mensaje.propio ? "text-white/70" : "text-muted-foreground")}>
          {formatearHora(mensaje.created_at)}
          {mensaje.propio && (mensaje.leido ? " · Leído" : "")}
        </p>
      </div>
    </div>
  )
}

function formatearHora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}
