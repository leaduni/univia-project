// Boundary de ruta: captura los fallos de render de las páginas y evita que la
// app quede en blanco. Queda envuelto por el root layout, así que aquí sí se
// pueden usar el tema, las fuentes y los componentes del design system.
"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RotateCcw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Error capturado por el boundary de ruta:", error)
  }, [error])

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 sm:mb-8 w-16 h-16 rounded-full gradient-brand flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-3 text-balance">
          Algo no salió como esperábamos
        </h1>

        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          No pudimos mostrar esta sección. Tus datos están a salvo: puedes
          reintentar o volver al inicio y seguir desde ahí.
        </p>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto min-h-10 gradient-brand-hover text-white border-0 gap-2 px-6"
          >
            <RotateCcw className="w-4 h-4" />
            Reintentar
          </Button>

          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto min-h-10 gap-2 px-6">
              <Home className="w-4 h-4" />
              Ir al inicio
            </Button>
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 text-xs text-muted-foreground/70 break-all">
            Código de referencia: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  )
}
