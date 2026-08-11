// Malla curricular: tipos espejo del contrato del backend (GET /api/malla).
// Fuente de verdad: backend/app/schemas/malla.py. No definir aquí campos que
// el backend no envía; si cambia el contrato, esto debe fallar en build.

export type StatusCurso = "completed" | "in_progress" | "available" | "locked"

export interface PrerrequisitoInfo {
  id: string
  code: string
  name: string
  completado: boolean
}

export interface CourseDetail {
  id: string
  code: string
  name: string
  credits: number
  status: StatusCurso
  description?: string | null
  // Binario, derivado del estado. El avance fino por unidades es RF-11.
  progreso: number
  // Solo vienen si el estudiante tiene registro en progreso_cursos.
  nota?: number | null
  fecha_completado?: string | null
  // Prerrequisitos DIRECTOS (RF-06): de qué cursos cuelga este.
  prerequisitos: PrerrequisitoInfo[]
  // De toda la cadena, los que aún no aprueba (explican el candado).
  prerequisitos_faltantes: PrerrequisitoInfo[]
  prerequisitos_cumplidos: boolean
}

export interface ResumenCiclo {
  total: number
  aprobados: number
  en_curso: number
  disponibles: number
  bloqueados: number
  creditos_aprobados: number
}

export interface CicloDetail {
  // Etiqueta lista para mostrar ("Ciclo 3").
  ciclo: string
  // Número en crudo; el frontend no debe parsear el string.
  ciclo_num: number
  credits: number
  resumen: ResumenCiclo
  courses: CourseDetail[]
}

// Respuesta de GET /api/malla/avance (RF-07). La cifra oficial del plan.
export interface AvanceCarrera {
  carrera_id?: number
  malla_id?: number
  porcentaje_avance: number
  creditos_aprobados: number
  creditos_en_curso: number
  creditos_totales: number
  creditos_restantes: number
  cursos_aprobados: number
  cursos_en_curso: number
  cursos_totales: number
}
