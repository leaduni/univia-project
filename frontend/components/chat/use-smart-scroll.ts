// Scroll inteligente del contenedor de mensajes: se mantiene pegado al fondo
// mientras el usuario no haya subido a leer contenido previo (más de 80px), y
// solo entonces deja de seguirlo. `scrollToBottom` baja forzosamente y
// reanuda el seguimiento.
"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

/** Distancia al fondo (px) a partir de la cual se considera que el usuario
 *  está leyendo mensajes anteriores y no debe forzarse el autoscroll. */
const UMBRAL_USUARIO_SCROLLING = 80

export function useSmartScroll(
  scrollContainerRef: RefObject<HTMLElement | null>,
  dependency: unknown,
): { isUserScrolling: boolean; scrollToBottom: () => void } {
  const [isUserScrolling, setIsUserScrolling] = useState(false)

  // Espejo del estado para usarlo dentro de listeners y efectos sin
  // re-suscribirlos ni quedarnos con un valor obsoleto en el cierre.
  const isUserScrollingRef = useRef(isUserScrolling)
  isUserScrollingRef.current = isUserScrolling

  useEffect(() => {
    const contenedor = scrollContainerRef.current
    if (!contenedor) return

    const alDesplazar = () => {
      const { scrollTop, clientHeight, scrollHeight } = contenedor
      const distanciaAlFondo = scrollHeight - (scrollTop + clientHeight)
      setIsUserScrolling(distanciaAlFondo > UMBRAL_USUARIO_SCROLLING)
    }

    contenedor.addEventListener("scroll", alDesplazar, { passive: true })
    return () => contenedor.removeEventListener("scroll", alDesplazar)
  }, [scrollContainerRef])

  // En cada cambio de `dependency` (nuevo mensaje, delta del stream, etc.):
  // si el usuario no está leyendo mensajes anteriores, baja suavemente al
  // fondo para mostrar el contenido nuevo.
  useEffect(() => {
    const contenedor = scrollContainerRef.current
    if (!contenedor || isUserScrollingRef.current) return
    contenedor.scrollTo({ top: contenedor.scrollHeight, behavior: "smooth" })
  }, [dependency, scrollContainerRef])

  const scrollToBottom = useCallback(() => {
    setIsUserScrolling(false)
    const contenedor = scrollContainerRef.current
    if (!contenedor) return
    contenedor.scrollTo({ top: contenedor.scrollHeight, behavior: "smooth" })
  }, [scrollContainerRef])

  return { isUserScrolling, scrollToBottom }
}