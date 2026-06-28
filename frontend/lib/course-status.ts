export const COURSE_STATUS_MAP = {
  completed: {
    label: "Completado",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    card: "border-emerald-500/30 bg-emerald-500/5",
    icon: "CheckCircle2",
  },
  in_progress: {
    label: "En Curso",
    badge: "bg-primary/15 text-primary border-primary/30",
    card: "border-primary/30 bg-primary/5",
    icon: "PlayCircle",
  },
  available: {
    label: "Disponible",
    badge: "bg-muted text-muted-foreground border-border",
    card: "border-dashed border-primary/20 bg-card",
    icon: "Circle",
  },
  locked: {
    label: "Bloqueado",
    badge: "bg-muted/50 text-muted-foreground/80 border-border/50 opacity-60",
    card: "border-border/50 bg-muted/30 opacity-60",
    icon: "Lock",
  },
} as const

export type CourseStatus = keyof typeof COURSE_STATUS_MAP
