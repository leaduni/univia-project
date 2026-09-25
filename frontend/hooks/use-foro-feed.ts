"use client"

// Hook del feed global del foro (Fase 5): paginación por cursor, búsqueda con
// debounce de 300 ms, votos y guardados optimistas sobre la lista en memoria.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { foroService } from "@/lib/foro-service"
import type {
  FeedParams,
  FiltroFeed,
  OrdenFeed,
  Publicacion,
} from "@/types/foro"

const PAGE_SIZE = 10

function leerFiltros(sp: ReturnType<typeof useSearchParams>): FeedParams {
  const params: FeedParams = {}
  const q = sp.get("q")
  const seccion = sp.get("seccion_id")
  const facultad = sp.get("facultad_id")
  const tag = sp.get("tag")
  const estado = sp.get("estado")
  const orden = sp.get("orden")
  const filtro = sp.get("filtro")
  if (q) params.q = q
  if (seccion) params.seccion_id = Number(seccion)
  if (facultad) params.facultad_id = Number(facultad)
  if (tag) params.tag = tag
  if (estado === "abierta" || estado === "resuelta" || estado === "cerrada") {
    params.estado = estado
  }
  if (orden === "recientes" || orden === "comentados" || orden === "tendencia") {
    params.orden = orden
  }
  if (
    filtro === "mis-hilos" ||
    filtro === "guardados" ||
    filtro === "sin-resolver" ||
    filtro === "mi-actividad"
  ) {
    params.filtro = filtro as FiltroFeed
  }
  return params
}

export function useForoFeed() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Filtros derivados de la URL (fuente de verdad compartible).
  const filtrosUrl = useMemo(() => leerFiltros(searchParams), [searchParams])

  // Búsqueda local con debounce: el input es inmediato, la URL y la petición
  // se actualizan 300 ms después de dejar de teclear.
  const [busquedaLocal, setBusquedaLocal] = useState(filtrosUrl.q ?? "")
  const [filtros, setFiltros] = useState<FeedParams>(filtrosUrl)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Si cambia la URL desde fuera (p.ej. navegación de la barra lateral),
  // resincroniza el estado local. Los setters de useState son estables, así
  // que la lista de dependencias ya está completa.
  useEffect(() => {
    setFiltros(filtrosUrl)
    setBusquedaLocal(filtrosUrl.q ?? "")
  }, [filtrosUrl])

  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestSeq = useRef(0)

  /** Primera página (o recarga al cambiar filtros). */
  const cargar = useCallback(async (params: FeedParams) => {
    const seq = ++requestSeq.current
    setCargando(true)
    setError(null)
    try {
      const resp = await foroService.getFeed({ ...params, limit: PAGE_SIZE })
      if (seq !== requestSeq.current) return
      setPublicaciones(resp.publicaciones)
      setCursor(resp.siguiente_cursor ?? null)
    } catch (e: any) {
      if (seq !== requestSeq.current) return
      setPublicaciones([])
      setCursor(null)
      setError(e.message || "No se pudo cargar el feed.")
    } finally {
      if (seq === requestSeq.current) setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar(filtros)
  }, [cargar, filtros])

  /** Siguiente página (infinite scroll). */
  const cargarMas = useCallback(async () => {
    if (!cursor || cargandoMas || cargando) return
    setCargandoMas(true)
    try {
      const resp = await foroService.getFeed({ ...filtros, limit: PAGE_SIZE, cursor })
      setPublicaciones((prev) => {
        const ids = new Set(prev.map((p) => p.id))
        return [...prev, ...resp.publicaciones.filter((p) => !ids.has(p.id))]
      })
      setCursor(resp.siguiente_cursor ?? null)
    } catch (e: any) {
      setError(e.message || "No se pudo cargar más contenido.")
    } finally {
      setCargandoMas(false)
    }
  }, [cursor, cargando, cargandoMas, filtros])

  const hayMas = cursor != null

  /** Escribe filtros en la URL (para compartir/deep-link). */
  const actualizarUrl = useCallback(
    (nuevos: FeedParams) => {
      const qs = new URLSearchParams()
      Object.entries(nuevos).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, String(v))
      })
      const qsStr = qs.toString()
      router.replace(qsStr ? `/foro?${qsStr}` : "/foro", { scroll: false })
    },
    [router],
  )

  /** Cambia filtros excepto la búsqueda (que va con debounce aparte). */
  const setFiltro = useCallback(
    (cambio: Partial<FeedParams>) => {
      const nuevos = { ...filtros, ...cambio }
      // Limpiar claves que vienen como undefined.
      Object.keys(nuevos).forEach((k) => {
        if ((nuevos as any)[k] === undefined) delete (nuevos as any)[k]
      })
      actualizarUrl(nuevos)
    },
    [actualizarUrl, filtros],
  )

  /** Búsqueda con debounce de 300 ms. */
  const setBusqueda = useCallback(
    (q: string) => {
      setBusquedaLocal(q)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const nuevos = { ...filtros, q: q.trim() || undefined }
        if (nuevos.q === undefined) delete nuevos.q
        actualizarUrl(nuevos)
      }, 300)
    },
    [actualizarUrl, filtros],
  )

  /** Voto optimista sobre un hilo de la lista. */
  const votar = useCallback((publicacionId: number, valor: 1 | -1) => {
    setPublicaciones((prev) =>
      prev.map((p) => {
        if (p.id !== publicacionId) return p
        const nuevoVoto = p.mi_voto === valor ? 0 : valor
        const delta = nuevoVoto - (p.mi_voto || 0)
        return { ...p, mi_voto: nuevoVoto, num_votos: p.num_votos + delta }
      }),
    )
    foroService
      .votar({ publicacion_id: publicacionId, valor })
      .then((res) => {
        setPublicaciones((prev) =>
          prev.map((p) =>
            p.id === publicacionId
              ? { ...p, mi_voto: res.mi_voto, num_votos: res.num_votos }
              : p,
          ),
        )
      })
      .catch(() => {
        // Revertir el optimismo: recargar la página 1 silenciosamente.
        cargar(filtros)
      })
  }, [cargar, filtros])

  // Ref espejo de la lista para leer el estado actual dentro de callbacks
  // estables sin arrastrar `publicaciones` como dependencia en cada render.
  const publicacionesRef = useRef<Publicacion[]>([])
  useEffect(() => {
    publicacionesRef.current = publicaciones
  }, [publicaciones])

  /** Guardar / quitar guardado optimista. */
  const alternarGuardado = useCallback((publicacionId: number) => {
    const guardadoPrevio =
      publicacionesRef.current.find((p) => p.id === publicacionId)?.guardado ?? false
    setPublicaciones((prev) =>
      prev.map((p) => (p.id === publicacionId ? { ...p, guardado: !guardadoPrevio } : p)),
    )
    const accion = guardadoPrevio
      ? foroService.quitarGuardado(publicacionId)
      : foroService.guardarPublicacion(publicacionId)
    accion.catch(() => {
      // Revertir al estado previo capturado, no al opuesto de ahora.
      setPublicaciones((prev) =>
        prev.map((p) => (p.id === publicacionId ? { ...p, guardado: guardadoPrevio } : p)),
      )
    })
  }, [])

  /** Agrega una publicación recién creada al tope del feed. */
  const agregarAlInicio = useCallback((publicacion: Publicacion) => {
    setPublicaciones((prev) => [publicacion, ...prev])
  }, [])

  return {
    publicaciones,
    cargando,
    cargandoMas,
    error,
    hayMas,
    filtros,
    orden: (filtros.orden ?? "recientes") as OrdenFeed,
    busqueda: busquedaLocal,
    setBusqueda,
    setFiltro,
    cargarMas,
    recargar: () => cargar(filtros),
    votar,
    alternarGuardado,
    agregarAlInicio,
  }
}
