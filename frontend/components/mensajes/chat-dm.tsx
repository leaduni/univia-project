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
    <div className="flex flex-col h-[calc(100vh-11rem)] rounded-2xl border border-border bg-card overflow-hidden">
      {/* Cabecera */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
        <Button variant="ghost" size="icon" onClick={onVolver} aria-label="Volver a la bandeja">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-poppins font-semibold text-sm truncate">
            {conversacion.otro_nombre || "Estudiante"}
          </span>
          <BadgeModerador perfilId={conversacion.otro_id} />
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {cargando ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : mensajes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center pt-10">
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
      <form onSubmit={enviar} className="p-3 border-t border-border/60">
        {envError && (
          <p className="text-xs text-destructive mb-2">{envError}</p>
        )}
        <div className="flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un mensaje…"
            maxLength={5000}
            aria-label="Mensaje"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
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