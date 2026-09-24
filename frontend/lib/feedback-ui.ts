// Utilidades compartidas de UI para el módulo de feedback/sugerencias.
// Fuente única del label y la variante visual del badge de estado, usada
// tanto en la lista (feedback-panel) como en el detalle (ticket-detail-sheet).
import type { EstadoFeedback } from "@/lib/feedbackTicketsAdapter"

export const LABEL_ESTADO: Record<EstadoFeedback, string> = {
  recibido: "Recibido",
  en_revision: "En revisión",
  planeado: "Planeado",
  resuelto: "Resuelto",
  descartado: "Descartado",
}

export function varianteEstado(
  estado: EstadoFeedback,
): "default" | "in-progress" | "available" | "completed" | "locked" {
  switch (estado) {
    case "en_revision":
      return "in-progress"
    case "planeado":
      return "available"
    case "resuelto":
      return "completed"
    case "descartado":
      return "locked"
    default:
      return "default"
  }
}
