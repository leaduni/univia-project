// Cliente del Foro de la comunidad: CRUD de secciones, publicaciones y
// comentarios contra /api/foro/*.
//
// Reutiliza `fetchWithAuth` de api-service.ts (token, timeout y reintentos de
// GET) y el mismo shape de errores `{errors:[{message}]}` / `{detail}`.

import { fetchWithAuth } from "./api-service"
import { leerOCache, TTL, invalidarClave, invalidarPrefijo } from "./api-cache"
import type {
  Comentario,
  ComentarioNuevo,
  Publicacion,
  PublicacionNueva,
  ResolverRequest,
  Seccion,
  SeccionNueva,
  VotoNuevo,
  VotoResultado,
} from "@/types/foro"

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

/** Lectura con caché Stale-While-Revalidate para no repetir descargas al navegar. */
async function leerCache<T>(clave: string, url: string, fallback: string, ttl: number): Promise<T> {
  return leerOCache<T>(clave, () => leer<T>(url, fallback), { ttl })
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

export const foroService = {
  /** Secciones visibles para el estudiante (globales + su facultad). */
  getSecciones(): Promise<Seccion[]> {
    return leerCache<Seccion[]>(
      "foro:secciones",
      `${API_URL}/foro/secciones`,
      "No se pudieron cargar las secciones.",
      TTL.CINCO_MINUTOS,
    )
  },

  /** Crea una sección. Solo moderadores. */
  crearSeccion(datos: SeccionNueva): Promise<Seccion> {
    invalidarClave("foro:secciones")
    return enviar<Seccion>(
      `${API_URL}/foro/secciones`,
      "POST",
      datos,
      "No se pudo crear la sección.",
    )
  },

  /** Hilos de una sección, del más reciente al más antiguo. */
  getPublicaciones(seccionId: number): Promise<Publicacion[]> {
    return leerCache<Publicacion[]>(
      `foro:publicaciones:${seccionId}`,
      `${API_URL}/foro/secciones/${seccionId}/publicaciones`,
      "No se pudieron cargar las publicaciones.",
      TTL.UN_MINUTO,
    )
  },

  /** Detalle de un hilo. */
  getPublicacion(publicacionId: number): Promise<Publicacion> {
    return leerCache<Publicacion>(
      `foro:publicacion:${publicacionId}`,
      `${API_URL}/foro/publicaciones/${publicacionId}`,
      "No se pudo cargar la publicación.",
      TTL.UN_MINUTO,
    )
  },

  /** Crea una publicación en una sección. */
  crearPublicacion(datos: PublicacionNueva): Promise<Publicacion> {
    invalidarPrefijo("foro:publicaciones:")
    invalidarClave("foro:secciones")
    return enviar<Publicacion>(
      `${API_URL}/foro/publicaciones`,
      "POST",
      datos,
      "No se pudo crear la publicación.",
    )
  },

  /** Comentarios de un hilo. */
  getComentarios(publicacionId: number): Promise<Comentario[]> {
    return leerCache<Comentario[]>(
      `foro:comentarios:${publicacionId}`,
      `${API_URL}/foro/publicaciones/${publicacionId}/comentarios`,
      "No se pudieron cargar los comentarios.",
      TTL.UN_MINUTO,
    )
  },

  /** Crea un comentario (opcionalmente respuesta a otro). */
  crearComentario(datos: ComentarioNuevo): Promise<Comentario> {
    invalidarPrefijo("foro:comentarios:")
    invalidarPrefijo("foro:publicacion:")
    invalidarPrefijo("foro:publicaciones:")
    return enviar<Comentario>(
      `${API_URL}/foro/publicaciones/${datos.publicacion_id}/comentarios`,
      "POST",
      datos,
      "No se pudo crear el comentario.",
    )
  },

  /** Borra una publicación (propia o de moderador). */
  borrarPublicacion(publicacionId: number): Promise<{ ok: boolean }> {
    invalidarClave(`foro:publicacion:${publicacionId}`)
    invalidarPrefijo("foro:publicaciones:")
    return enviar<{ ok: boolean }>(
      `${API_URL}/foro/publicaciones/${publicacionId}`,
      "DELETE",
      {},
      "No se pudo borrar la publicación.",
    )
  },

  /** Borra un comentario (propio o de moderador). */
  borrarComentario(comentarioId: number): Promise<{ ok: boolean }> {
    invalidarPrefijo("foro:comentarios:")
    invalidarPrefijo("foro:publicacion:")
    return enviar<{ ok: boolean }>(
      `${API_URL}/foro/comentarios/${comentarioId}`,
      "DELETE",
      {},
      "No se pudo borrar el comentario.",
    )
  },

  /** Vota (up/down) con toggle sobre una publicación o un comentario. */
  votar(datos: VotoNuevo): Promise<VotoResultado> {
    if (datos.publicacion_id != null) {
      invalidarClave(`foro:publicacion:${datos.publicacion_id}`)
      invalidarPrefijo("foro:publicaciones:")
    } else if (datos.comentario_id != null) {
      invalidarPrefijo("foro:comentarios:")
      invalidarPrefijo("foro:publicacion:")
    }
    return enviar<VotoResultado>(
      `${API_URL}/foro/votos`,
      "POST",
      datos,
      "No se pudo registrar el voto.",
    )
  },

  /** Perfil_ids de los moderadores del foro (para el badge). */
  getModeradores(): Promise<string[]> {
    return leerCache<string[]>(
      "foro:moderadores",
      `${API_URL}/foro/moderadores`,
      "No se pudieron cargar los moderadores.",
      TTL.CINCO_MINUTOS,
    )
  },

  /** Marca una respuesta (o la sugerencia IA) como la solución del hilo. */
  resolverHilo(publicacionId: number, datos: ResolverRequest): Promise<{ ok: boolean; estado: string }> {
    invalidarClave(`foro:publicacion:${publicacionId}`)
    invalidarPrefijo("foro:publicaciones:")
    invalidarPrefijo("foro:comentarios:")
    return enviar<{ ok: boolean; estado: string }>(
      `${API_URL}/foro/publicaciones/${publicacionId}/resolver`,
      "POST",
      datos,
      "No se pudo marcar la solución.",
    )
  },
}