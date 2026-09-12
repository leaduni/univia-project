// Cliente del módulo de Feedback y Sugerencias (Fase 1): CRUD contra /api/feedback/*
//
// HTTP: reutiliza `fetchWithAuth` de api-service.ts (token de sesión, timeout,
// reintentos de GET y redirección en 401), igual que dm-service.ts.

import { fetchWithAuth } from "./api-service"
import { leerOCache, TTL, invalidarClave, invalidarPrefijo } from "./api-cache"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const API_URL = BASE_URL.endsWith("/api") ? BASE_URL : `${BASE_URL}/api`

export type CategoriaFeedback = "funcion" | "bug" | "respuesta_chatbot" | "ui_ux"
export type EstadoFeedback = "recibido" | "en_revision" | "planeado" | "resuelto" | "descartado"
export type PrioridadFeedback = "baja" | "media" | "alta" | "critica"

export interface TicketFeedback {
  id: number
  perfil_id: string
  categoria: CategoriaFeedback
  prioridad: PrioridadFeedback
  estado: EstadoFeedback
  titulo: string
  descripcion: string
  creado_en: string | null
  actualizado_en: string | null
}

export interface NuevoTicketFeedback {
  categoria: CategoriaFeedback
  titulo: string
  descripcion: string
}

export interface MensajeFeedback {
  id: number
  ticket_id: number
  autor_id: string
  autor_rol: "estudiante" | "dev"
  contenido: string
  creado_en: string | null
}

export interface AdjuntoFeedback {
  id: string
  ticket_id: number
  mensaje_id: number | null
  path: string
  nombre_original: string
  tipo_mime: string
  size_bytes: number
  creado_en: string | null
  url_firmada?: string | null
}

export interface TicketFeedbackDetalle extends TicketFeedback {
  mensajes: MensajeFeedback[]
  adjuntos: AdjuntoFeedback[]
}

export interface FiltrosTickets {
  estado?: EstadoFeedback | "todos"
  categoria?: CategoriaFeedback | "todos"
}

/** Clave de caché del detalle (compartida entre adapter y componentes). */
export function claveDetalleFeedback(id: number): string {
  return `feedback:ticket:${id}`
}

function extraerError(body: any): string {
  return (
    body?.errors?.[0]?.message ||
    body?.detail ||
    "No se pudo procesar tu solicitud. Inténtalo de nuevo."
  )
}

export const feedbackTicketsService = {
  /** Crea un ticket desde el formulario multicriterio. */
  async crear(datos: NuevoTicketFeedback): Promise<TicketFeedback> {
    const response = await fetchWithAuth(`${API_URL}/feedback/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(extraerError(data))
    }
    invalidarPrefijo("feedback:tickets:")
    return data as TicketFeedback
  },

  /** Historial de tickets del estudiante autenticado, más recientes primero. */
  async listar(): Promise<TicketFeedback[]> {
    const response = await fetchWithAuth(`${API_URL}/feedback/tickets`)
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(extraerError(body))
    }
    return response.json()
  },

  /** Historial con filtros opcionales por estado/categoría (cacheado). */
  async listarFiltrados(filtros: FiltrosTickets = {}): Promise<TicketFeedback[]> {
    const estado =
      filtros.estado && filtros.estado !== "todos" ? filtros.estado : undefined
    const categoria =
      filtros.categoria && filtros.categoria !== "todos" ? filtros.categoria : undefined
    const clave = `feedback:tickets:${estado ?? "*"}:${categoria ?? "*"}`

    return leerOCache(
      clave,
      async () => {
        const params = new URLSearchParams()
        if (estado) params.set("estado", estado)
        if (categoria) params.set("categoria", categoria)
        params.set("limite", "50")
        const query = params.toString()
        const response = await fetchWithAuth(
          `${API_URL}/feedback/tickets${query ? `?${query}` : ""}`,
        )
        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new Error(extraerError(body))
        }
        return response.json()
      },
      { ttl: TTL.UN_MINUTO },
    )
  },

  /** Detalle consolidado (ticket + hilo + adjuntos) con caché de apertura instantánea. */
  async obtener(ticketId: number): Promise<TicketFeedbackDetalle> {
    const clave = claveDetalleFeedback(ticketId)

    return leerOCache(
      clave,
      async () => {
        const response = await fetchWithAuth(`${API_URL}/feedback/tickets/${ticketId}`)
        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new Error(extraerError(body))
        }
        return response.json()
      },
      { ttl: TTL.UN_MINUTO },
    )
  },

  /** Cambia el estado del ticket (solo miembros de feedback_devs). */
  async cambiarEstado(ticketId: number, estado: EstadoFeedback): Promise<TicketFeedback> {
    const response = await fetchWithAuth(`${API_URL}/feedback/tickets/${ticketId}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(extraerError(data))
    invalidarClave(claveDetalleFeedback(ticketId))
    invalidarPrefijo("feedback:tickets:")
    return data as TicketFeedback
  },

  /** Agrega un mensaje al hilo del ticket (estudiante titular o dev). */
  async agregarMensaje(ticketId: number, contenido: string): Promise<MensajeFeedback> {
    const response = await fetchWithAuth(`${API_URL}/feedback/tickets/${ticketId}/mensajes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(extraerError(data))
    invalidarClave(claveDetalleFeedback(ticketId))
    return data as MensajeFeedback
  },

  /** Sube un adjunto (imagen o PDF, máx 5 MB) al ticket. */
  async subirAdjunto(ticketId: number, archivo: File): Promise<AdjuntoFeedback> {
    // FormData: fetchWithAuth solo añade el header de Authorization, así el
    // navegador fija el Content-Type multipart con su boundary correcto.
    const form = new FormData()
    form.append("archivo", archivo, archivo.name)
    const response = await fetchWithAuth(`${API_URL}/feedback/tickets/${ticketId}/adjuntos`, {
      method: "POST",
      body: form,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(extraerError(data))
    invalidarClave(claveDetalleFeedback(ticketId))
    return data as AdjuntoFeedback
  },

  /** Indica si el usuario autenticado pertenece al equipo de desarrolladores. */
  async esDev(): Promise<boolean> {
    return leerOCache(
      "feedback:es_dev",
      async () => {
        const response = await fetchWithAuth(`${API_URL}/feedback/dev`)
        if (!response.ok) return false
        const data = await response.json().catch(() => null)
        return Boolean(data?.es_dev)
      },
      { ttl: TTL.CINCO_MINUTOS },
    )
  },
}