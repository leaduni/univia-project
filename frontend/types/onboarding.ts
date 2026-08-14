// Tipos del onboarding. Los que describen respuestas del backend son espejo de
// `backend/app/schemas/onboarding.py`: si cambia un campo allá, cambia aquí.
export interface OnboardingData {
  career: number
  semester: number
  malla_id?: number
  cursosInscritos: number[]
  /** Créditos de los cursos elegidos. Solo para el resumen final. */
  creditosInscritos?: number
}

/** Espejo de `FacultadItem`. */
export interface Facultad {
  id: number
  codigo: string
  nombre: string
}

/** Espejo de `CarreraItem` (GET /onboarding/data). */
export interface Carrera {
  id: number
  codigo: string
  name: string
  description?: string | null
  /** Largo del plan: hasta qué ciclo puede declararse el estudiante. */
  duracion_ciclos: number
  facultad?: Facultad | null
}

/** Espejo de `RangoCiclos`. */
export interface RangoCiclos {
  min: number
  max: number
}

/** Espejo de `OnboardingDataResponse`. */
export interface OnboardingDataResponse {
  carreras: Carrera[]
  facultades: Facultad[]
  ciclos: RangoCiclos
}

/** Espejo de `MallaItem`. */
export interface MallaItem {
  id: number
  carrera_id: number
  nombre: string
  codigo_plan?: string | null
  es_vigente: boolean
}
