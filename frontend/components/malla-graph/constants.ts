// Constantes del grafo de malla y estilos por estado, alineados con los
// tokens del proyecto (globals.css) en lugar de la paleta del prototipo.
import type { StatusCurso } from "@/types/malla"

// Layout determinista: un ciclo = una columna (spec malla-graph §2.2).
export const COLUMN_WIDTH = 220
export const NODE_HEIGHT = 90
export const VERTICAL_GAP = 40

// Aristas: violeta del brand si el prerrequisito está aprobado, gris si falta.
export const EDGE_COLOR_PREREQ_OK = "#7957f1" // --accent / brand-violet
export const EDGE_COLOR_PREREQ_PENDING = "#475569" // slate-600

// Resaltado de cadenas (igual que el prototipo): prerequisitos violeta,
// descendientes sky, selección blanco.
export const HIGHLIGHT_COLOR_PRE = "#7957f1"
export const HIGHLIGHT_COLOR_POST = "#38bdf8"
export const HIGHLIGHT_COLOR_SELF = "#ffffff"

export interface GraphStatusStyle {
  node: string
  badge: string
  dot: string
}

export const GRAPH_STATUS: Record<StatusCurso, GraphStatusStyle> = {
  completed: {
    node: "border-emerald-500/40 bg-emerald-500/10",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  in_progress: {
    node: "border-primary/40 bg-primary/10",
    badge: "bg-primary/15 text-primary border-primary/30",
    dot: "bg-primary",
  },
  available: {
    node: "border-sky-400/40 bg-sky-400/10",
    badge: "bg-sky-400/15 text-sky-400 border-sky-400/30",
    dot: "bg-sky-400",
  },
  locked: {
    node: "border-slate-700/50 bg-slate-800/20 opacity-75",
    badge: "bg-muted/50 text-muted-foreground/80 border-border/50",
    dot: "bg-slate-500",
  },
}

export const STATUS_LABEL: Record<StatusCurso, string> = {
  completed: "Completado",
  in_progress: "En curso",
  available: "Disponible",
  locked: "Bloqueado",
}

export const ROMAN: string[] = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV",
]

export function toRoman(n: number): string {
  return ROMAN[n - 1] ?? String(n)
}
