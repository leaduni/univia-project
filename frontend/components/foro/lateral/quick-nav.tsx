"use client"

// Navegación rápida del foro (columna izquierda, Fase 5): filtros de acceso
// directo que escriben ?filtro= en la URL (fuente de verdad del feed).

import { useRouter, useSearchParams } from "next/navigation"
import {
  Activity,
  Bookmark,
  HelpCircle,
  LayoutGrid,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"

const OPCIONES = [
  { valor: null, etiqueta: "Todo el feed", icono: LayoutGrid },
  { valor: "mis-hilos", etiqueta: "Mis hilos", icono: MessageSquare },
  { valor: "guardados", etiqueta: "Guardados", icono: Bookmark },
  { valor: "sin-resolver", etiqueta: "Sin resolver", icono: HelpCircle },
  { valor: "mi-actividad", etiqueta: "Mi actividad", icono: Activity },
] as const

export function QuickNav() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activo = searchParams.get("filtro")

  const seleccionar = (valor: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor) params.set("filtro", valor)
    else params.delete("filtro")
    const qs = params.toString()
    router.replace(qs ? `/foro?${qs}` : "/foro", { scroll: false })
  }

  return (
    <nav aria-label="Accesos rápidos del foro" className="space-y-0.5">
      {OPCIONES.map(({ valor, etiqueta, icono: Icono }) => {
        const activoOpcion = (valor ?? null) === activo
        return (
          <button
            key={etiqueta}
            type="button"
            onClick={() => seleccionar(valor)}
            aria-current={activoOpcion ? "true" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
              activoOpcion
                ? "bg-[#7957f1]/15 text-[#a78bfa] font-medium"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            <Icono className="h-4 w-4 shrink-0" />
            {etiqueta}
          </button>
        )
      })}
    </nav>
  )
}
