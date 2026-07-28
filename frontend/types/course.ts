export interface PrerrequisitoInfo {
  id: string
  code: string
  name: string
  completado: boolean
}

export interface Course {
  id: string
  code: string
  name: string
  credits: number
  status: 'completed' | 'in_progress' | 'available' | 'locked'
  description?: string
  progreso?: number
  prerequisitos?: PrerrequisitoInfo[]
  prerequisitosCumplidos?: boolean
}
