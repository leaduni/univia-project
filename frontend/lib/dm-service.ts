// Cliente de la Mensajería Directa (DM): CRUD HTTP contra /api/dm/* + suscripción
// Supabase Realtime para recibir mensajes en vivo.
//
// HTTP: reutiliza `fetchWithAuth` de api-service.ts (token, timeout, reintentos).
// Realtime: se suscribe con `supabase.channel()` + `postgres_changes` filtrando
// por conversacion_dm_id. La RLS de mensajes_dm garantiza que solo se reciben
// mensajes de conversaciones donde el usuario participa.

import { supabase } from "./supabase"
import { fetchWithAuth } from "./api-service"
import { leerOCache, TTL, invalidarClave } from "./api-cache"
import type { ConversacionDM, EnviarMensajeDM, IniciarDM, MensajeDM } from "@/types/dm"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const API_URL = BASE_URL.endsWith("/api") ? BASE_URL : `${BASE_URL}/api`

function extraerMensaje(body: any): string {
  return (
    body?.errors?.[0]?.message ||
    body?.detail ||
    "Ocurrió un error al procesar la solicitud."
  )
}

async function leer<T>(url: string, fallback: string): Promise<T> {
  const response = await fetchWithAuth(url)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(extraerMensaje(body) || fallback)
  }
  return response.json()
}

async function enviar<T>(url: string, method: string, body: unknown, fallback: string): Promise<T> {
  const response = await fetchWithAuth(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(extraerMensaje(data) || fallback)
  }
  return data as T
}

export const dmService = {
  /** Bandeja: conversaciones del usuario, más recientes primero. */
  getConversaciones(): Promise<ConversacionDM[]> {
    return leerOCache<ConversacionDM[]>(
      "dm:conversaciones",
      () =>
        leer<ConversacionDM[]>(
          `${API_URL}/dm/conversaciones`,
          "No se pudieron cargar tus mensajes.",
        ),
      { ttl: TTL.UN_MINUTO },
    )
  },

  /** Inicia (o reutiliza) una conversación 1 a 1 y envía el primer mensaje. */
  iniciarConversacion(datos: IniciarDM): Promise<ConversacionDM> {
    invalidarClave("dm:conversaciones")
    return enviar<ConversacionDM>(
      `${API_URL}/dm/conversaciones`,
      "POST",
      datos,
      "No se pudo iniciar la conversación.",
    )
  },

  /** Historial de una conversación. */
  getMensajes(conversacionId: number): Promise<MensajeDM[]> {
    // Sin caché a propósito: el historial debe estar siempre al día y ya se
    // mantiene en vivo con Realtime.
    return leer<MensajeDM[]>(
      `${API_URL}/dm/conversaciones/${conversacionId}/mensajes`,
      "No se pudieron cargar los mensajes.",
    )
  },

  /** Envía un mensaje. */
  enviarMensaje(conversacionId: number, datos: EnviarMensajeDM): Promise<MensajeDM> {
    invalidarClave("dm:conversaciones")
    return enviar<MensajeDM>(
      `${API_URL}/dm/conversaciones/${conversacionId}/mensajes`,
      "POST",
      datos,
      "No se pudo enviar el mensaje.",
    )
  },

  /** Marca como leídos los mensajes recibidos de otros. */
  marcarLeido(conversacionId: number): Promise<{ ok: boolean }> {
    return enviar<{ ok: boolean }>(
      `${API_URL}/dm/conversaciones/${conversacionId}/leer`,
      "POST",
      {},
      "No se pudo actualizar el estado.",
    )
  },

  /**
   * Suscribe la conversación a Supabase Realtime para recibir mensajes nuevos.
   *
   * Devuelve una función de cancelación. `onNuevoMensaje` recibe el mensaje
   * insertado tal cual viene de la RPC (sin el campo `propio` calculado).
   */
  suscribirConversacion(
    conversacionId: number,
    onNuevoMensaje: (mensaje: MensajeDM) => void,
  ): () => void {
    const canal = supabase
      .channel(`dm:${conversacionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes_dm",
          filter: `conversacion_dm_id=eq.${conversacionId}`,
        },
        (payload) => {
          const fila = payload.new as MensajeDM
          if (fila) onNuevoMensaje(fila)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  },
}