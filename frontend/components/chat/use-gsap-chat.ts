"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { RefObject } from "react"
import { CHAT_TOKENS } from "./chat-tokens"

/** true si el sistema pide reducir el movimiento (accesibilidad/prefers-reduced-motion). */
function prefiereMovimientoReducido(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

/** Entrada de un mensaje: aparición con rebote desde abajo. */
export function animateIn(el: Element) {
  if (prefiereMovimientoReducido()) {
    gsap.set(el, { opacity: 1, y: 0, scale: 1 })
    return
  }
  gsap.from(el, {
    y: 24,
    opacity: 0,
    scale: 0.96,
    ease: CHAT_TOKENS.SPRING_EASE,
    duration: CHAT_TOKENS.SPRING_DURATION,
  })
}

/** Salida de un mensaje: desvanecimiento rápido antes de desmontar. */
export function animateOut(el: Element, onComplete: () => void) {
  if (prefiereMovimientoReducido()) {
    gsap.set(el, { opacity: 1, y: 0, scale: 1 })
    onComplete()
    return
  }
  gsap.to(el, {
    y: 12,
    opacity: 0,
    scale: 0.95,
    duration: CHAT_TOKENS.FADE_DURATION,
    ease: "power2.in",
    onComplete,
  })
}

/** Apertura del panel completo: entra con un suave rebote. */
export function animatePanelOpen(el: Element) {
  if (prefiereMovimientoReducido()) {
    gsap.set(el, { opacity: 1, y: 0, scale: 1 })
    return
  }
  gsap.from(el, {
    scale: 0.92,
    opacity: 0,
    y: 16,
    ease: CHAT_TOKENS.SPRING_EASE,
    duration: CHAT_TOKENS.SPRING_DURATION + 0.05,
  })
}

/**
 * Anima la entrada de un mensaje al montar el nodo referenciado.
 * Solo corre en el primer render (dependencies vacío); con scope en el ref,
 * los tweens quedan atados al contexto del componente y se revierten al
 * desmontar. Respeta `prefers-reduced-motion` vía `animateIn`.
 */
export function useAnimateMessageIn(ref: RefObject<Element | null>) {
  useGSAP(
    () => {
      if (ref.current) animateIn(ref.current)
    },
    { scope: ref, dependencies: [] },
  )
}