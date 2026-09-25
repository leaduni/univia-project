"use client"

// Navegación rápida del foro (columna izquierda, Fase 5): filtros de acceso
// directo que escriben ?filtro= en la URL (fuente de verdad del feed).

import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
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
    <nav aria-label="Accesos rápidos del foro" className="space-y-1">
      {OPCIONES.map(({ valor, etiqueta, icono: Icono }) => {
        const activoOpcion = (valor ?? null) === activo
        return (
          <button
            key={etiqueta}
            type="button"
            onClick={() => seleccionar(valor)}
            aria-current={activoOpcion ? "true" : undefined}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all duration-200",
              activoOpcion
                ? "border-violet-400/10 bg-violet-500/[0.12] font-medium text-violet-200 hover:bg-violet-500/[0.16]"
                : "border-transparent text-white/45 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white/80",
            )}
          >
            {activoOpcion ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-400/[0.10] text-violet-300">
                <Icono className="h-4 w-4" />
              </span>
            ) : (
              <Icono className="h-4 w-4 shrink-0 text-white/35 transition-colors group-hover:text-white/65" />
            )}
            {etiqueta}
          </button>
        )
      })}
    </nav>
  )
}
