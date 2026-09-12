// Tipos del Foro de la comunidad. Espejo de `backend/app/schemas/foro.py`:
// si cambia un campo allá, cambia aquí.

export type TipoSeccion = "global" | "facultad"

/** Espejo de `SeccionOut`. */
export interface Seccion {
  id: number
  tipo: TipoSeccion
  titulo: string
  descripcion?: string | null
  facultad_id?: number | null
  activa: boolean
  num_publicaciones: number
  facultad_nombre?: string | null
}

export type EstadoPublicacion = "abierta" | "resuelta" | "cerrada"

/** Espejo de la columna `sugerencia_ia` de foro_publicaciones (Fase 4). */
export interface SugerenciaIA {
  respuesta: string
  fuentes: { curso_id?: number | null; recurso_id?: number | null; similitud: number }[]
  aceptada: boolean
}

/** Espejo de `PublicacionOut`. */
export interface Publicacion {
  id: number
  seccion_id: number
  autor_perfil_id: string
  autor_nombre?: string | null
  titulo: string
  cuerpo: string
  tags: string[]
  estado: EstadoPublicacion
  created_at: string
  num_comentarios: number
  num_votos: number
  mi_voto: number
  sugerencia_ia?: SugerenciaIA | null
}

/** Espejo de `ComentarioOut`. */
export interface Comentario {
  id: number
  publicacion_id: number
  autor_perfil_id: string
  autor_nombre?: string | null
  parent_id?: number | null
  cuerpo: string
  created_at: string
  num_votos: number
  mi_voto: number
  es_solucion: boolean
}

/** Espejo de `SeccionCreate`. */
export interface SeccionNueva {
  tipo: TipoSeccion
  titulo: string
  descripcion?: string
  facultad_id?: number
}

/** Espejo de `PublicacionCreate`. */
export interface PublicacionNueva {
  seccion_id: number
  titulo: string
  cuerpo: string
  tags?: string[]
}

/** Espejo de `ComentarioCreate`. */
export interface ComentarioNuevo {
  publicacion_id: number
  parent_id?: number | null
  cuerpo: string
}

/** Espejo de `VotoCreate`. */
export interface VotoNuevo {
  publicacion_id?: number
  comentario_id?: number
  valor: 1 | -1
}

/** Espejo de `VotoOut`. */
export interface VotoResultado {
  id: number
  autor_perfil_id: string
  publicacion_id?: number | null
  comentario_id?: number | null
  valor: number
  num_votos: number
  mi_voto: number
}

/** Espejo de `ResolverRequest` (Fase 4). */
export interface ResolverRequest {
  comentario_id?: number
  aceptar_sugerencia_ia?: boolean
}