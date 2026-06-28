// Dynamic icon renderer for auth form fields
import type { LucideIcon } from "lucide-react"

/**
 * Icono de prefijo dentro de un input (ej. sobre para email, candado para
 * contraseña). Antes vivía duplicado dentro de signup.tsx — se extrajo aquí
 * para que login.tsx use exactamente la misma iconografía sin copiar código.
 */
export function FieldIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  )
}