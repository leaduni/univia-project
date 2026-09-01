// Chatbot-related TypeScript type definitions. Espejo del contrato de
// backend/app/routers/chatbot.py y backend/app/chatbot/handlers.py.

export type IntentChat =
  | "recurso"
  | "duda_academica"
  | "estado_academico"
  | "navegacion_ayuda"
  | "general"
  | "soporte_humano"

export interface RecursoAdjuntoChat {
  id: number
  titulo: string
  tipo: string
  year: number | null
  url_drive: string | null
  has_solucionario: boolean
}

export interface CursoAdjuntoChat {
  id: number
  code: string | null
  name: string | null
}

export interface AdjuntosChat {
  recursos?: RecursoAdjuntoChat[]
  curso?: CursoAdjuntoChat
  /** Cantidad de fragmentos de RAG usados en `duda_academica`; no se pinta en la UI. */
  fragmentos?: number
}

/** Mensaje tal como vive en el estado del panel (no el shape crudo de la BD). */
export interface MensajeChat {
  id: string
  rol: "user" | "assistant"
  contenido: string
  intent?: IntentChat
  adjuntos?: AdjuntosChat
  /** true mientras la respuesta del asistente todavía se está escribiendo. */
  enCurso?: boolean
  /** true si `contenido` es un mensaje de error y no una respuesta real. */
  esError?: boolean
  /**
   * Texto del turno del usuario que originó este mensaje de error, para el
   * botón "Reintentar". Solo se llena en mensajes de error (rol assistant).
   */
  textoOrigen?: string
}
