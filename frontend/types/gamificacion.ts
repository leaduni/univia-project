// Contratos del módulo de gamificación, notas inmutables y ranking (Fase 10).
// Espejan los modelos Pydantic de backend/app/schemas/gamificacion.py. Las
// fechas llegan como strings ISO (el backend las serializa al cruzar la API).

export type PeriodoRanking = "global" | "semanal"

export interface ProgresoNivel {
  xp_actual_nivel: number
  xp_requerido: number
  porcentaje: number
}

export interface ResumenGamificacion {
  xp_total: number
  nivel: number
  racha_actual: number
  racha_maxima: number
  ultima_fecha_actividad: string | null
  alias_publico: string | null
  codigo_referido: string | null
  pueda_checkin: boolean
  bono_proximo_checkin: number
  progreso_siguiente: ProgresoNivel
}

export interface ResultadoCheckIn {
  racha_actual: number
  racha_maxima: number
  xp_otorgado: number
  ya_registrado: boolean
}

export interface EntradaRanking {
  alias_publico: string
  avatar_url: string | null
  xp_total: number
  nivel: number
  puesto: number | null
}

export interface RespuestaRanking {
  periodo: PeriodoRanking
  items: EntradaRanking[]
  next_cursor: string | null
  tiene_mas: boolean
}

export interface MiPosicionRanking {
  alias_publico: string | null
  avatar_url: string | null
  xp_total: number
  nivel: number
  puesto: number | null
}

export interface ResultadoReferido {
  registrado: boolean
  ya_registrado: boolean
  referente_alias: string | null
  xp_otorgado: number
}

export interface ResultadoCompartir {
  registrado: boolean
  canal: string
  limite_diario: boolean
}

export interface IntentoHistorico {
  id: string
  evaluacion_id: number
  curso_id: number
  nota: number
  puntaje_obtenido: number
  puntaje_maximo: number
  fecha_completado: string
}

export interface HistorialCurso {
  curso_id: number
  nota_promedio: number | null
  total_intentos: number
  ultima_fecha: string | null
  intentos: IntentoHistorico[]
}

export interface NotaPorCurso {
  curso_id: number
  curso: string | null
  codigo: string | null
  nota_promedio: number | null
  intentos: number
  ultima_fecha: string | null
}

export interface ResumenNotas {
  promedio_academico: number | null
  total_intentos: number
  cursos_con_nota: number
  por_curso: NotaPorCurso[]
}

export interface PreguntaSnapshot {
  pregunta_id: string
  enunciado?: string
  opciones?: unknown[]
  tipo?: string
  valor?: number
}

export interface SesionCalificable {
  id: string
  evaluacion_id: number
  curso_id: number
  titulo: string
  peso: number
  puntaje_maximo: number
  version: number
  max_intentos: number
  preguntas_snapshot: { version: number; preguntas: PreguntaSnapshot[] }
  iniciada_at: string
  vence_at: string | null
}

export interface ResultadoEntrega {
  intento: IntentoHistorico
  nota_curso_promedio: number | null
  xp_otorgado: number
}