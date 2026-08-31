// Panel del chat: lista de mensajes, input y estado de "escribiendo…".
// Puramente presentacional: el estado de la conversación vive en ChatBubble,
// que es quien habla con el backend.
"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Send, Sparkles, WifiOff, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MessageBubble } from "./message-bubble"
import type { MensajeChat } from "@/types/chatbot"

// Espejo de MAX_CARACTERES_MENSAJE en backend/app/routers/chatbot.py: no
// tiene sentido dejar escribir más de lo que el backend va a aceptar.
const MAX_CARACTERES_MENSAJE = 4000

// Alto máximo del textarea en píxeles, en espejo de la clase max-h-24 de
// abajo: JS necesita el número para no seguir creciendo el scrollHeight más
// allá de lo que el CSS ya tapa.
const ALTO_MAXIMO_INPUT_PX = 96

interface ChatPanelProps {
  mensajes: MensajeChat[]
  enviando: boolean
  /** false mientras el navegador no tiene conexión (ver lib/use-online.ts). */
  enLinea: boolean
  onEnviar: (texto: string) => void
  onCerrar: () => void
}

export function ChatPanel({ mensajes, enviando, enLinea, onEnviar, onCerrar }: ChatPanelProps) {
  const [texto, setTexto] = useState("")
  const finRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Autoscroll al último mensaje (o al siguiente fragmento de uno en curso).
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [mensajes])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // El textarea crece con el contenido en vez de quedar fijo a una línea.
  // Se resetea a "auto" antes de medir: si no, scrollHeight solo puede crecer
  // (nunca se achica al borrar texto, porque mide contra el alto ya fijado).
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, ALTO_MAXIMO_INPUT_PX)}px`
  }, [texto])

  const enviar = () => {
    const limpio = texto.trim()
    if (!limpio || enviando || !enLinea) return
    onEnviar(limpio)
    setTexto("")
  }

  const alPresionarTecla = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Asistente de UniVia"
      className="w-[min(92vw,380px)] h-[min(70vh,560px)] flex flex-col rounded-3xl bg-[#0d0e1b]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 overflow-hidden anim-up"
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 gradient-ai-neon shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Asistente UniVia</p>
            <p className="text-[11px] text-white/80 truncate">Recursos, dudas y tu avance académico</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar el asistente"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/90 hover:bg-white/15 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-3">
        {mensajes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-4">
            <Sparkles className="w-8 h-8 gradient-brand-text" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">¿En qué te ayudo?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pídeme un sílabo, una duda de un curso, tu avance académico o cómo moverte por la plataforma.
            </p>
          </div>
        ) : (
          mensajes.map((mensaje) => (
            <MessageBubble key={mensaje.id} mensaje={mensaje} onReintentar={onEnviar} />
          ))
        )}
        <div ref={finRef} />
      </div>

      {/* Aviso de sin conexión: mismo criterio que el banner de DashboardLayout,
          pero acotado al panel (el widget vive fuera de ese layout). */}
      {!enLinea && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-4 py-2 border-t border-amber-500/20 bg-amber-500/10 shrink-0"
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <p className="text-[11px] font-medium text-amber-200">Sin conexión a internet.</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/10 p-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, MAX_CARACTERES_MENSAJE))}
            onKeyDown={alPresionarTecla}
            placeholder={enLinea ? "Escribe tu mensaje…" : "Sin conexión…"}
            rows={1}
            disabled={enviando || !enLinea}
            className="flex-1 resize-none max-h-24 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7957f1]/60 disabled:opacity-60 custom-scrollbar"
          />
          <Button
            type="button"
            size="icon"
            onClick={enviar}
            disabled={enviando || !enLinea || !texto.trim()}
            className="shrink-0 rounded-full gradient-ai-neon border-0 text-white h-9 w-9"
            aria-label="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
