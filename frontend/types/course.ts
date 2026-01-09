export interface Course {
  id: string
  code: string
  name: string
  credits: number
  status: "completed" | "in_progress" | "available" | "locked"
  description: string
}
