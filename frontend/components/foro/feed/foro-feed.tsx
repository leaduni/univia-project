"use client"

// Contenedor del feed global (columna central, Fase 5): infinite scroll por
// IntersectionObserver sobre el cursor del backend, skeletons y estado vacío.

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useForoFeed } from "@/hooks/use-foro-feed"
import { FeedEmpty } from "./feed-empty"
import { FeedHeader } from "./feed-header"
import { FeedSkeleton } from "./feed-skeleton"
import { NuevoHiloModal } from "./nuevo-hilo-modal"
import { PostCard } from "./post-card"

export function ForoFeed() {
  const feed = useForoFeed()
  const [modalAbierto, setModalAbierto] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const { cargarMas, hayMas, cargandoMas } = feed

  // Infinite scroll: el disparador observa un sentinel al final de la lista.
  useEffect(() => {
    const nodo = sentinelRef.current
    if (!nodo) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) cargarMas()
      },
      { rootMargin: "600px 0px" },
    )
    observer.observe(nodo)
    return () => observer.disconnect()
  }, [cargarMas])

  const hayFiltros = Boolean(
    feed.filtros.q ||
      feed.filtros.filtro ||
      feed.filtros.seccion_id ||
      feed.filtros.facultad_id ||
      feed.filtros.tag ||
      feed.filtros.estado ||
      (feed.filtros.orden && feed.filtros.orden !== "recientes"),
  )

  const limpiarFiltros = useCallback(() => {
    feed.setBusqueda("")
    feed.setFiltro({
      q: undefined,
      filtro: undefined,
      seccion_id: undefined,
      facultad_id: undefined,
      tag: undefined,
      estado: undefined,
      orden: "recientes",
    })
    // Los métodos de useForoFeed son useCallback estables: deps completas.
  }, [feed.setBusqueda, feed.setFiltro])

  return (
    // Buscador y publicaciones comparten el flujo, separados por el gap.
    <section aria-label="Feed del foro" className="flex flex-col gap-6">
      <FeedHeader
        busqueda={feed.busqueda}
        onBusqueda={feed.setBusqueda}
        orden={feed.orden}
        onOrden={(orden) => feed.setFiltro({ orden })}
        onNuevoHilo={() => setModalAbierto(true)}
      />

      {/* Lista en columna con gap: el aire barra→primera tarjeta sale del gap-6
          de la sección (única fuente) y aquí sólo se separan las tarjetas entre
          sí. Sin space-y-* (regla del repo: flex + gap, no márgenes entre hijos). */}
      <div className="flex flex-col gap-4">
        {feed.cargando && <FeedSkeleton />}

        {!feed.cargando && feed.error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {feed.error}
            <button
              type="button"
              onClick={feed.recargar}
              className="ml-auto rounded-lg bg-white/5 px-3 py-1 text-xs font-medium hover:bg-white/10"
            >
              Reintentar
            </button>
          </div>
        )}

        {!feed.cargando && !feed.error && feed.publicaciones.length === 0 && (
          <FeedEmpty
            hayFiltros={hayFiltros}
            onNuevoHilo={() => setModalAbierto(true)}
            onLimpiarFiltros={limpiarFiltros}
          />
        )}

        {!feed.cargando &&
          feed.publicaciones.map((publicacion, i) => (
            <PostCard
              key={publicacion.id}
              publicacion={publicacion}
              indice={i}
              onVotar={feed.votar}
              onAlternarGuardado={feed.alternarGuardado}
            />
          ))}

        {cargandoMas && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando más hilos…
          </div>
        )}
        <div ref={sentinelRef} aria-hidden className="h-1" />
      </div>

      <NuevoHiloModal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onCreada={feed.agregarAlInicio}
      />
    </section>
  )
}
