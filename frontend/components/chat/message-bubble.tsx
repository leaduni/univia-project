// Burbuja de un turno del chat (usuario o asistente) del módulo nuevo
// `components/chat/`: entrada animada con GSAP al montar, indicador de
// escritura y tarjetas de recursos debajo de la respuesta del asistente.
// Puramente presentacional: el estado vive en el contenedor, que pasa
// `message`, `isTyping` y `recursos`.
"use client"

import { useRef } from "react"
import { BookOpen } from "lucide-react"
import dynamic from "next/dynamic"
import { LuniMascot } from "@/components/ui/LuniMascot"
import { CHAT_TOKENS } from "./chat-tokens"
import { useAnimateMessageIn } from "./use-gsap-chat"

// KaTeX + react-markdown solo se descargan cuando hay un mensaje que renderizar:
// mientras tanto el texto plano del markdown queda legible sin estilos.
const MarkdownRenderer = dynamic(() => import("./markdown-renderer"), {
  ssr: false,
  loading: () => null,
})

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
  // Mientras el asistente redacta (llegó el turno pero todavía no hay texto) la
  // cara de Luni es "pensando"; en cuanto hay contenido vuelve al reposo.
  const escribiendo = isTyping && !message.content

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
      {/* Luni habla por el asistente. Ancho fijo: los assets tienen relación
          de aspecto distinta y sin esto el ancho de la burbuja saltaría al
          pasar de reposo a pensando. */}
      <LuniMascot
        variant={escribiendo ? "thinking" : "idle"}
        size={28}
        animated={escribiendo}
        alt={null}
        className="mt-0.5 w-5"
      />

      <div className="min-w-0 flex flex-col items-start gap-1.5">
        <div
          ref={burbujaRef}
          className={`${CHAT_TOKENS.RADIUS_BUBBLE_AI} ${PANEL_BG} ${CHAT_TOKENS.PANEL_BLUR} ${CHAT_TOKENS.BORDER} px-4 py-3 max-w-[82%] text-sm leading-relaxed`}
        >
          {escribiendo ? (
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
