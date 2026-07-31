// Resource/exam-related TypeScript type definitions
export interface Recurso {
  id: number
  titulo: string
  tipo: "Examen" | "Practica" | "Silabo" | "PDF" | "Compendio" | "Libro" | "Apunte" | "Video"
  curso_id: number | null
  codigo_curso: string | null
  nombre_curso: string | null
  ciclo: number | null
  year: number | null
  downloads: number
  rating: number
  preview_url: string | null
  has_solucionario: boolean
  url_drive: string | null
  facultad_nombre: string | null
  created_at: string
}
