// Burbuja de un turno del chat (usuario o asistente) del módulo nuevo
// `components/chat/`: entrada animada con GSAP al montar, indicador de
// escritura y tarjetas de recursos debajo de la respuesta del asistente.
// Puramente presentacional: el estado vive en el contenedor, que pasa
// `message`, `isTyping` y `recursos`.
"use client"

import { useRef } from "react"
import { BookOpen, Sparkles } from "lucide-react"
import { CHAT_TOKENS } from "./chat-tokens"
import MarkdownRenderer from "./markdown-renderer"
import { useAnimateMessageIn } from "./use-gsap-chat"

/** Recurso descargable asociado a una respuesta del asistente. */
export interface Recurso {
  titulo: string
  url: string
}

interface MessageBubbleProps {
  /** Turno a dibujar: rol y texto plano. */
  message: { role: "user" | "assistant"; content: string }
  /** true mientras el asistente está escribiendo; pinta 3 puntos animados. */
  isTyping?: boolean
  /** Material descargable que acompaña la respuesta del asistente. */
  recursos?: Recurso[]
}

// Fondo glass de la burbuja del asistente. El `dark:` en runtime combina
// `CHAT_TOKENS.PANEL_BG_DARK`, pero Tailwind solo genera utilidades si la clase
// completa aparece como texto plano en el fuente: por eso el literal
// `dark:bg-white/[0.06]` se declara aquí y no se arma por interpolación.
const PANEL_BG = `${CHAT_TOKENS.PANEL_BG_LIGHT} dark:bg-white/[0.06]`

export function MessageBubble({ message, isTyping = false, recursos }: MessageBubbleProps) {
  const esUsuario = message.role === "user"
  const burbujaRef = useRef<HTMLDivElement | null>(null)

  // Entrada animada (y:24, opacity:0, scale:0.96) solo en el primer montaje de
  // la burbuja; el tween queda atado al scope del ref y se revierte al
  // desmontar.
  useAnimateMessageIn(burbujaRef)

  if (esUsuario) {
    return (
      <div className="flex justify-end">
        <div
          ref={burbujaRef}
          className={`${CHAT_TOKENS.RADIUS_BUBBLE_USER} bg-primary text-primary-foreground px-4 py-2.5 max-w-[78%] text-sm leading-relaxed shadow-md`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-2.5">
      {/* Avatar oficial del asistente */}
      <div
        className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d93340] via-[#a6249d] to-[#7957f1] flex items-center justify-center shrink-0 shadow-sm"
        aria-hidden="true"
      >
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>

      <div className="min-w-0 flex flex-col items-start gap-1.5">
        <div
          ref={burbujaRef}
          className={`${CHAT_TOKENS.RADIUS_BUBBLE_AI} ${PANEL_BG} ${CHAT_TOKENS.PANEL_BLUR} ${CHAT_TOKENS.BORDER} px-4 py-3 max-w-[82%] text-sm leading-relaxed`}
        >
          {isTyping && !message.content ? (
            <span className="flex gap-1 items-center py-1 px-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </span>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        {/* Tarjetas de recursos: una por enlace, debajo de la respuesta. */}
        {recursos && recursos.length > 0 && (
          <div className="flex flex-col gap-1.5 max-w-[82%]">
            {recursos.map((recurso) => {
              const esPortalUni = recurso.url.includes("uni.edu.pe")
              return (
                <button
                  key={recurso.url}
                  type="button"
                  onClick={() => window.open(recurso.url, "_blank", "noopener,noreferrer")}
                  className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/60 backdrop-blur-md px-3 py-2 text-xs cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <BookOpen className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{recurso.titulo}</span>
                  {esPortalUni && (
                    <span className="ml-auto rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium shrink-0">
                      uni.edu.pe
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
