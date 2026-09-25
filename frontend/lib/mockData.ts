// Fallback del banco de recursos del dashboard. Es el UNICO export que se
// conserva a proposito: lo usa components/dashboard/recent-resources.tsx
// cuando no hay sesion, la respuesta viene vacia o el backend no responde
// (regla de mantenimiento de mock de AGENTE.md seccion 2).
//
// Eliminados en la Fase 2 de RUTA_DESPLIEGUE_MVP.md por no tener ningun
// consumidor en el codigo fuente: CAREERS, CURRICULUM_DATA,
// LEARNING_PATH_DATA, TIMELINE_DATA, AI_INSIGHTS_DATA, EXAM_BANK_DATA,
// DASHBOARD_STATS y ACHIEVEMENTS.

import type { Recurso } from "@/types/recurso"

export const RECURSOS_DATA: Recurso[] = [
  {
    id: 1,
    titulo: "Estructuras de Datos",
    codigo_curso: "CS201",
    nombre_curso: null,
    tipo: "Examen",
    curso_id: null,
    ciclo: 2,
    facultad_nombre: "Ingeniería",
    year: 2024,
    downloads: 2450,
    rating: 4.8,
    preview_url: null,
    url_drive: null,
    has_solucionario: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    titulo: "Algoritmos Avanzados",
    codigo_curso: "CS301",
    nombre_curso: null,
    tipo: "Practica",
    curso_id: null,
    ciclo: 3,
    facultad_nombre: "Ingeniería",
    year: 2024,
    downloads: 1890,
    rating: 4.6,
    preview_url: null,
    url_drive: null,
    has_solucionario: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    titulo: "Cálculo II - Parcial 1",
    codigo_curso: "MAT201",
    nombre_curso: null,
    tipo: "Examen",
    curso_id: null,
    ciclo: 2,
    facultad_nombre: "Ingeniería",
    year: 2024,
    downloads: 3200,
    rating: 4.7,
    preview_url: null,
    url_drive: null,
    has_solucionario: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 4,
    titulo: "Introducción a Bases de Datos",
    codigo_curso: "DB301",
    nombre_curso: null,
    tipo: "Libro",
    curso_id: null,
    ciclo: 3,
    facultad_nombre: "Ingeniería",
    year: 2023,
    downloads: 1450,
    rating: 4.5,
    preview_url: null,
    url_drive: null,
    has_solucionario: false,
    created_at: "2023-01-01T00:00:00Z",
  },
  {
    id: 5,
    titulo: "Apunte de Física I",
    codigo_curso: "FIS101",
    nombre_curso: null,
    tipo: "Apunte",
    curso_id: null,
    ciclo: 1,
    facultad_nombre: "Ingeniería",
    year: 2023,
    downloads: 980,
    rating: 4.3,
    preview_url: null,
    url_drive: null,
    has_solucionario: false,
    created_at: "2023-01-01T00:00:00Z",
  },
  {
    id: 6,
    titulo: "Seguridad Informática - Final",
    codigo_curso: "SEC401",
    nombre_curso: null,
    tipo: "Examen",
    curso_id: null,
    ciclo: 4,
    facultad_nombre: "Ingeniería",
    year: 2023,
    downloads: 756,
    rating: 4.4,
    preview_url: null,
    url_drive: null,
    has_solucionario: true,
    created_at: "2023-01-01T00:00:00Z",
  },
  {
    id: 7,
    titulo: "Física II - Guía de Problemas",
    codigo_curso: "FIS201",
    nombre_curso: null,
    tipo: "Practica",
    curso_id: null,
    ciclo: 2,
    facultad_nombre: "Ingeniería",
    year: 2024,
    downloads: 1123,
    rating: 4.5,
    preview_url: null,
    url_drive: null,
    has_solucionario: false,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 8,
    titulo: "Álgebra Lineal - Apuntes Completos",
    codigo_curso: "ALG101",
    nombre_curso: null,
    tipo: "Apunte",
    curso_id: null,
    ciclo: 2,
    facultad_nombre: "Ingeniería",
    year: 2024,
    downloads: 1567,
    rating: 4.7,
    preview_url: null,
    url_drive: null,
    has_solucionario: false,
    created_at: "2024-01-01T00:00:00Z",
  },
]

// DASHBOARD STATS
export const DASHBOARD_STATS = {
  activeCourses: 5,
  semesterProgress: 68,
  masterSkills: 12,
}

// ACHIEVEMENTS/LOGROS
export const ACHIEVEMENTS = [
  {
    id: "1",
    name: "Primer Paso",
    description: "Completar el primer curso",
    icon: "🎓",
    unlockedAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Ritmo Acelerado",
    description: "Aprobar 3 cursos en un ciclo",
    icon: "⚡",
    unlockedAt: "2024-03-20",
  },
  {
    id: "3",
    name: "Dedicación Premium",
    description: "Completar 90 horas de estudio",
    icon: "🏆",
    unlockedAt: null,
  },
  {
    id: "4",
    name: "Perfeccionista",
    description: "Obtener nota perfecto en 2 exámenes",
    icon: "⭐",
    unlockedAt: null,
  },
  {
    id: "5",
    name: "Experto en Datos",
    description: "Completar todos los cursos de Data Science",
    icon: "📊",
    unlockedAt: null,
  },
]

// ── Carga Horaria Universitaria ──────────────────────────────────────────

export interface FacultyScheduleRow {
  codigo: string           // "BEF01"
  nombre_curso: string     // "FÍSICA I"
  seccion: string          // "U"
  docente: string          // "QUISPE RAMOS, JUAN"
  tipo_clase: "T" | "P" | "LAB"
  aula: string             // "A-301"
  dia: string              // "LU" | "MA" | "MI" | "JU" | "VI" | "SA"
  hora_inicio: string      // "07:00"
  hora_fin: string         // "09:00"
}

/** Convierte código de día a número de la semana (lunes=1 … sábado=6). */
export function dayCodeToWeekday(day: string): number {
  const map: Record<string, number> = {
    LU: 1, MA: 2, MI: 3, JU: 4, VI: 5, SA: 6,
  }
  return map[day.toUpperCase()] ?? 1
}

/** Convierte "HH:MM" a horas decimales (ej. "07:30" → 7.5). */
export function timeToDecimal(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h + (m || 0) / 60
}

export interface CourseGroup {
  codigo: string
  nombre_curso: string
  secciones: Record<string, {
    docentes: string[]
    bloques: FacultyScheduleRow[]
  }>
}

/** Agrupa filas de carga horaria por curso y sección. */
export function groupSchedulesByCourse(rows: FacultyScheduleRow[]): CourseGroup[] {
  const map = new Map<string, CourseGroup>()

  for (const row of rows) {
    let group = map.get(row.codigo)
    if (!group) {
      group = { codigo: row.codigo, nombre_curso: row.nombre_curso, secciones: {} }
      map.set(row.codigo, group)
    }
    if (!group.secciones[row.seccion]) {
      group.secciones[row.seccion] = { docentes: [], bloques: [] }
    }
    const sec = group.secciones[row.seccion]
    sec.bloques.push(row)
    if (!sec.docentes.includes(row.docente)) {
      sec.docentes.push(row.docente)
    }
  }

  return Array.from(map.values()).sort((a, b) => a.codigo.localeCompare(b.codigo))
}

export const mockFacultySchedules: FacultyScheduleRow[] = [
  // ── BEF01 — FÍSICA I ──
  { codigo: "BEF01", nombre_curso: "FÍSICA I", seccion: "U", docente: "QUISPE RAMOS, JUAN", tipo_clase: "T", aula: "A-301", dia: "LU", hora_inicio: "07:00", hora_fin: "09:00" },
  { codigo: "BEF01", nombre_curso: "FÍSICA I", seccion: "U", docente: "QUISPE RAMOS, JUAN", tipo_clase: "P", aula: "LAB-F1", dia: "MI", hora_inicio: "09:00", hora_fin: "11:00" },
  { codigo: "BEF01", nombre_curso: "FÍSICA I", seccion: "V", docente: "TORRES LUNA, MARÍA", tipo_clase: "T", aula: "A-302", dia: "MA", hora_inicio: "07:00", hora_fin: "09:00" },
  { codigo: "BEF01", nombre_curso: "FÍSICA I", seccion: "V", docente: "TORRES LUNA, MARÍA", tipo_clase: "P", aula: "LAB-F2", dia: "JU", hora_inicio: "09:00", hora_fin: "11:00" },

  // ── BMA02 — CÁLCULO II ──
  { codigo: "BMA02", nombre_curso: "CÁLCULO II", seccion: "U", docente: "GARCÍA MEDINA, CARLOS", tipo_clase: "T", aula: "B-201", dia: "LU", hora_inicio: "09:00", hora_fin: "11:00" },
  { codigo: "BMA02", nombre_curso: "CÁLCULO II", seccion: "U", docente: "GARCÍA MEDINA, CARLOS", tipo_clase: "P", aula: "B-202", dia: "MI", hora_inicio: "11:00", hora_fin: "13:00" },
  { codigo: "BMA02", nombre_curso: "CÁLCULO II", seccion: "V", docente: "FERNÁNDEZ DÍAZ, ANA", tipo_clase: "T", aula: "B-203", dia: "MA", hora_inicio: "09:00", hora_fin: "11:00" },
  { codigo: "BMA02", nombre_curso: "CÁLCULO II", seccion: "V", docente: "FERNÁNDEZ DÍAZ, ANA", tipo_clase: "P", aula: "B-204", dia: "JU", hora_inicio: "11:00", hora_fin: "13:00" },

  // ── BQU01 — QUÍMICA GENERAL ──
  { codigo: "BQU01", nombre_curso: "QUÍMICA GENERAL", seccion: "U", docente: "MENDOZA CRUZ, ROBERTO", tipo_clase: "T", aula: "C-101", dia: "MA", hora_inicio: "13:00", hora_fin: "15:00" },
  { codigo: "BQU01", nombre_curso: "QUÍMICA GENERAL", seccion: "U", docente: "MENDOZA CRUZ, ROBERTO", tipo_clase: "LAB", aula: "LAB-Q1", dia: "JU", hora_inicio: "15:00", hora_fin: "17:00" },
  { codigo: "BQU01", nombre_curso: "QUÍMICA GENERAL", seccion: "V", docente: "SALAZAR VEGA, PATRICIA", tipo_clase: "T", aula: "C-102", dia: "MI", hora_inicio: "13:00", hora_fin: "15:00" },
  { codigo: "BQU01", nombre_curso: "QUÍMICA GENERAL", seccion: "V", docente: "SALAZAR VEGA, PATRICIA", tipo_clase: "LAB", aula: "LAB-Q2", dia: "VI", hora_inicio: "15:00", hora_fin: "17:00" },

  // ── BCS03 — PROGRAMACIÓN ORIENTADA A OBJETOS ──
  { codigo: "BCS03", nombre_curso: "PROGRAMACIÓN ORIENTADA A OBJETOS", seccion: "U", docente: "HERRERA VARGAS, LUIS", tipo_clase: "T", aula: "D-401", dia: "LU", hora_inicio: "11:00", hora_fin: "13:00" },
  { codigo: "BCS03", nombre_curso: "PROGRAMACIÓN ORIENTADA A OBJETOS", seccion: "U", docente: "HERRERA VARGAS, LUIS", tipo_clase: "LAB", aula: "LAB-C1", dia: "MI", hora_inicio: "15:00", hora_fin: "17:00" },
  { codigo: "BCS03", nombre_curso: "PROGRAMACIÓN ORIENTADA A OBJETOS", seccion: "V", docente: "ROJAS POMA, DANIELA", tipo_clase: "T", aula: "D-402", dia: "MA", hora_inicio: "11:00", hora_fin: "13:00" },
  { codigo: "BCS03", nombre_curso: "PROGRAMACIÓN ORIENTADA A OBJETOS", seccion: "V", docente: "ROJAS POMA, DANIELA", tipo_clase: "LAB", aula: "LAB-C2", dia: "JU", hora_inicio: "15:00", hora_fin: "17:00" },
]
