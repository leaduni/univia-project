export interface Recurso {
  id: string
  title: string
  code: string
  semester: string
  type: "Examen" | "Práctica" | "Libro" | "Apunte"
  ciclo: number
  facultad: string
  year: number
  downloads: number
  rating: number
  preview: boolean
  hasSolucionario: boolean
}
