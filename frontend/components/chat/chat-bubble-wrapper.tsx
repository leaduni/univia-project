// Puente cliente para el chat flotante.
//
// `ssr: false` no está permitido dentro de un Server Component como
// app/layout.tsx: la carga diferida del ChatBubble (react-markdown, KaTeX,
// GSAP) vive aquí, en un Client Component, para que el layout raíz siga
// siendo servidor y la landing pública no pague ese bundle.
"use client"

import dynamic from "next/dynamic"

const ChatBubbleLazy = dynamic(
  () => import("@/components/chat/chat-bubble").then((m) => m.ChatBubble),
  { ssr: false },
)

export function ChatBubbleWrapper() {
  return <ChatBubbleLazy />
}
