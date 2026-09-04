// Panel rediseñado del chat: superficie glassmorphism, chips de sugerencia y
// animaciones GSAP. Puramente presentacional: el estado (mensajes, input,
// streaming, SSE) vive en el contenedor del padre, que le pasa las props
// controladas.
"use client"

import { useEffect, useRef, type KeyboardEvent } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ChevronDown, Maximize2, Minimize2, Send, Sparkles, Square, Trash2, X } from "lucide-react"
import { MessageBubble } from "./message-bubble"
import type { MensajeChat, RecursoAdjuntoChat } from "@/types/chatbot"
import { CHAT_TOKENS } from "./chat-tokens"
import { ChatSkeleton } from "./chat-skeleton"
import { useSmartScroll } from "./use-smart-scroll"

// Espejo de MAX_CARACTERES_MENSAJE en backend/app/routers/chatbot.py.
const MAX_CARACTERES_MENSAJE = 4000

// El textarea crece hasta 5 filas (~20px por fila en text-sm) y luego scrollea.
const ALTO_LINEA_PX = 20
const MAX_FILAS_TEXTAREA = 5
const MAX_ALTO_INPUT_PX = ALTO_LINEA_PX * MAX_FILAS_TEXTAREA

// El contenedor del ChatBubble fija el tamaño del panel (w/h); aquí solo se
// rellena.
const PANEL_DIMENSIONES = "w-full h-full"

// Sugerencias rápidas del estado vacío.
const SUGERENCIAS_INICIALES = [
  "¿Qué facultades hay en la UNI?",
  "Ver carreras de la FIIS",
  "¿Dónde consulto el calendario académico?",
  "Malla curricular e información",
] as const

// Fondo glass del panel: claro en light mode, tinte blanco al 6% en dark.
// Tailwind no resuelve clases interpoladas por template literal, así que
// además de componerla con el token se deja el literal exacto declarado
// debajo para que el compilador genere la utilidad `dark:bg-white/[0.06]`.
const PANEL_BG = `${CHAT_TOKENS.PANEL_BG_LIGHT} dark:${CHAT_TOKENS.PANEL_BG_DARK}`
const PANEL_BG_DARK_LITERAL = "dark:bg-white/[0.06]"

/** Pasa el shape de API (RecursoAdjuntoChat) al contrato {titulo, url} que
 *  espera la burbuja del chat; los adjuntos sin enlace se descartan. */
function mapearRecursos(mensaje: MensajeChat): { titulo: string; url: string }[] {
  return (mensaje.adjuntos?.recursos ?? [])
    .filter(
      (recurso): recurso is RecursoAdjuntoChat & { url_drive: string } =>
        Boolean(recurso.url_drive),
    )
    .map((recurso) => ({ titulo: recurso.titulo, url: recurso.url_drive }))
}

interface ChatPanelProps {
  messages: MensajeChat[]
  inputValue: string
  isLoading: boolean
  isStreaming: boolean
  onSend: () => void
  onAbort: () => void
  onInputChange: (texto: string) => void
  onClear: () => void
  onClose: () => void
  isOnline: boolean
  conversacionId: number | null
  /** true cuando la conversación está en modo expandido (a pantalla casi
   *  completa); false (o undefined) para el tamaño compacto por defecto. */
  isExpanded?: boolean
  /** Alterna el modo expandido/compacto del chat desde la cabecera. */
  onToggleExpand?: () => void
}

export function ChatPanel({
  messages,
  inputValue,
  isLoading,
  isStreaming,
  onSend,
  onAbort,
  onInputChange,
  onClear,
  onClose,
  isOnline,
  conversacionId,
  isExpanded = false,
  onToggleExpand,
}: ChatPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const chipsRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const haloRef = useRef<HTMLDivElement | null>(null)

  const mostrarSugerencias = messages.length === 0 && !isLoading
  const inputListo = inputValue.trim().length > 0

  // Scroll inteligente: pegado al fondo salvo que el usuario haya subido a
  // leer mensajes anteriores (>80px); el pill "Ver mensajes nuevos" lo
  // devuelve al fondo de forma forzada.
  const { isUserScrolling, scrollToBottom } = useSmartScroll(scrollRef, messages)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Halo OLED de la cabecera: resplandor radial violeta que "respira" (yoyo
  // infinito) sin bloquear la interacción con el header.
  useGSAP(
    () => {
      if (haloRef.current) {
        // Movimiento reducido: se deja el halo en su estado reposado (opacity
        // 0.12) sin la animación de "respiración" (yoyo infinito).
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          gsap.set(haloRef.current, { opacity: 0.12 })
          return
        }
        gsap.to(haloRef.current, {
          opacity: 0.12,
          duration: 2.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        })
      }
    },
    { scope: panelRef, dependencies: [] },
  )

  // Textarea autoresizable: crece hasta 5 filas y vuelve a encogerse al borrar
  // texto (se resetea a "auto" antes de medir: si no, scrollHeight solo sabe
  // crecer y el textarea quedaría con altura fija al borrar).
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_ALTO_INPUT_PX)}px`
  }, [inputValue])

  // Chips de sugerencia: entran escalonados cada vez que se monta el estado
  // vacío (primera visita o tras limpiar la conversación).
  useGSAP(
    () => {
      if (!mostrarSugerencias) return
      // Movimiento reducido: los chips aparecen ya en su estado final.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(".chat-chip", { opacity: 1, y: 0, scale: 1 })
        return
      }
      gsap.from(".chat-chip", {
        y: 16,
        opacity: 0,
        stagger: 0.08,
        ease: CHAT_TOKENS.SPRING_EASE,
        duration: CHAT_TOKENS.SPRING_DURATION,
      })
    },
    { scope: chipsRef, dependencies: [mostrarSugerencias] },
  )
  const enviar = () => {
    if (!inputListo || isStreaming || !isOnline) return
    onSend()
  }

  const alPresionarTecla = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  // El chip llena el input y dispara el envío en el siguiente ciclo del event
  // loop, para que el padre ya tenga el inputValue recién actualizado.
  const elegirSugerencia = (texto: string) => {
    onInputChange(texto)
    setTimeout(() => onSend(), 0)
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Asistente de UniVia"
      className={`${PANEL_BG} ${CHAT_TOKENS.PANEL_BLUR} ${CHAT_TOKENS.BORDER} ${CHAT_TOKENS.SHADOW} ${CHAT_TOKENS.RADIUS_PANEL} ${PANEL_DIMENSIONES} relative flex flex-col overflow-hidden`}
    >
      {/* Banner de sin conexión */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-destructive/10 text-destructive text-xs text-center py-1.5 shrink-0"
        >
          Sin conexión — el asistente no está disponible.
        </div>
      )}

      {/* Cabecera glassmorphism */}
      <header
        className={`${PANEL_BG} ${CHAT_TOKENS.PANEL_BLUR} relative overflow-hidden flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 shrink-0`}
      >
        {/* Halo OLED: resplandor radial violeta que "respira" sin bloquear. */}
        <div
          ref={haloRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 120% at 20% 0%, rgba(121,87,241,0.45), transparent 60%)",
            opacity: 0,
          }}
        />
        <div className="relative flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d93340] via-[#a6249d] to-[#7957f1] flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-wordmark text-sm font-semibold text-foreground truncate">
              Asistente UniVia
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isOnline ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/60"
                }`}
                aria-hidden="true"
              />
              {isOnline ? "En línea" : "Sin conexión"}
            </p>
          </div>
        </div>
        <div className="relative flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={isExpanded ? "Restaurar tamaño de chat" : "Maximizar chat"}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all active:scale-[0.90]"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClear}
            aria-label="Limpiar conversación"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all active:scale-[0.90]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar el asistente"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all active:scale-[0.90]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>
      {/* Mensajes */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Conversación con el asistente"
        className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-3"
      >
        {isLoading && messages.length === 0 ? (
          <ChatSkeleton count={4} />
        ) : mostrarSugerencias ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 px-4 text-center">
            <Sparkles className="w-8 h-8 text-primary/80" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-foreground">¿En qué te ayudo?</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Pídeme un sílabo, una duda de un curso, tu avance académico o cómo moverte por la
                plataforma.
              </p>
            </div>
            <div ref={chipsRef} className="flex flex-wrap justify-center gap-2">
              {SUGERENCIAS_INICIALES.map((sugerencia) => (
                <button
                  key={sugerencia}
                  type="button"
                  onClick={() => elegirSugerencia(sugerencia)}
                  className={`chat-chip ${CHAT_TOKENS.CHIP_BASE}`}
                >
                  {sugerencia}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((mensaje) => (
            <MessageBubble
              key={mensaje.id}
              message={{ role: mensaje.rol, content: mensaje.contenido }}
              isTyping={mensaje.enCurso}
              recursos={mapearRecursos(mensaje)}
            />
          ))
        )}
        {isLoading && messages.length > 0 && <ChatSkeleton count={1} />}
      </div>

      {/* Pill "Ver mensajes nuevos": solo mientras el usuario está leyendo
          mensajes anteriores del hilo. */}
      {isUserScrolling && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Bajar al último mensaje"
          className="absolute bottom-[72px] left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-lg text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all active:scale-[0.96]"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Ver mensajes nuevos
        </button>
      )}

      {/* Input */}
      <div className="border-t border-white/10 p-3 shrink-0">
        <div
          className="relative flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/30 dark:bg-card/60 backdrop-blur-xl px-3 py-2 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/30 transition-all"
        >
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value.slice(0, MAX_CARACTERES_MENSAJE))}
            onKeyDown={alPresionarTecla}
            aria-label="Escribe tu pregunta"
            placeholder="Pregunta algo sobre la UNI..."
            rows={1}
            disabled={!isOnline || isStreaming}
            className="text-foreground placeholder:text-muted-foreground/70 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 resize-none w-full leading-relaxed align-middle"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onAbort}
              aria-label="Detener respuesta"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-destructive hover:bg-destructive/10 transition-transform active:scale-[0.88] shrink-0"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={enviar}
              disabled={!inputListo || !isOnline}
              aria-label="Enviar mensaje"
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform active:scale-[0.88] shrink-0 ${
                inputListo && isOnline
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
