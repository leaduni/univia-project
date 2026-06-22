import { AlertCircle } from "lucide-react"

/**
 * Banner de error con el mismo estilo (tokens de --destructive) en login y
 * signup. login.tsx tenía su propia versión con colores rojo-50/rojo-700
 * hardcodeados y un punto pulsante en vez de icono — se unificó al patrón
 * que ya existía en signup.tsx.
 */
export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 p-4 rounded-xl bg-destructive/10 text-destructive mb-8 text-sm font-medium border border-destructive/20"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}