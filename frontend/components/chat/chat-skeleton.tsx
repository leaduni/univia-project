// Esqueleto de carga del chat: filas alternadas assistant/usuario con el
// mismo trazado geométrico (avatar + burbujas con radios asimétricos) que las
// burbujas reales, rellenadas con rectángulos pulsantes.
"use client"

import { CHAT_TOKENS } from "./chat-tokens"

interface ChatSkeletonProps {
  /** Número de filas alternadas (assistant/usuario) a dibujar. */
  count?: number
}

export function ChatSkeleton({ count = 3 }: ChatSkeletonProps) {
  return (
    <div className="flex flex-col gap-3 px-3 py-4" aria-hidden="true">
      {Array.from({ length: count }, (_, indice) => {
        const esAsistente = indice % 2 === 0

        return esAsistente ? (
          <div key={indice} className="flex justify-start gap-2.5">
            {/* Avatar del asistente */}
            <div className="w-7 h-7 shrink-0 rounded-full bg-muted animate-pulse" />
            <div className="min-w-0 flex flex-col gap-1.5">
              {/* Burbuja del asistente */}
              <div
                className={`${CHAT_TOKENS.RADIUS_BUBBLE_AI} bg-muted animate-pulse h-14 w-[80%] min-w-0`}
              />
              <div className="h-2.5 w-24 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        ) : (
          <div key={indice} className="flex justify-end">
            {/* Burbuja del usuario */}
            <div
              className={`${CHAT_TOKENS.RADIUS_BUBBLE_USER} bg-muted animate-pulse h-10 w-[55%] max-w-[78%]`}
            />
          </div>
        )
      })}
    </div>
  )
}