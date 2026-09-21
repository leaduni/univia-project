// Tipos de la Mensajería Directa (DM). Espejo de `backend/app/schemas/dm.py`:
// si cambia un campo allá, cambia aquí.

/** Espejo de `ConversacionDMOut`. */
export interface ConversacionDM {
  id: number
  usuario_a: string
  usuario_b: string
  creado_por?: string | null
  created_at: string
  updated_at: string
  otro_id?: string | null
  otro_nombre?: string | null
  ultimo_mensaje?: string | null
  ultimo_mensaje_fecha?: string | null
  no_leidos: number
}

/** Espejo de `MensajeDMOut`. */
export interface MensajeDM {
  id: number
  conversacion_dm_id: number
  remitente_id: string
  remitente_nombre?: string | null
  cuerpo: string
  leido: boolean
  created_at: string
  propio: boolean
}

/** Espejo de `IniciarDMRequest`. */
export interface IniciarDM {
  usuario_id: string
  primer_mensaje: string
}

/** Espejo de `EnviarMensajeDMRequest`. */
export interface EnviarMensajeDM {
  cuerpo: string
}