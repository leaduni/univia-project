// Paginador numérico para las grillas de recursos.
"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginacionProps {
  paginaActual: number
  totalPaginas: number
  onCambiar: (pagina: number) => void
}

// Devuelve las páginas a mostrar, con "…" donde se omiten tramos. Con 21
// páginas (el catálogo completo) pintarlas todas desbordaría la fila.
function construirRango(paginaActual: number, totalPaginas: number): (number | "…")[] {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1)
  }

  const paginas: (number | "…")[] = [1]
  const desde = Math.max(2, paginaActual - 1)
  const hasta = Math.min(totalPaginas - 1, paginaActual + 1)

  if (desde > 2) paginas.push("…")
  for (let p = desde; p <= hasta; p++) paginas.push(p)
  if (hasta < totalPaginas - 1) paginas.push("…")

  paginas.push(totalPaginas)
  return paginas
}

export function Paginacion({ paginaActual, totalPaginas, onCambiar }: PaginacionProps) {
  if (totalPaginas <= 1) return null

  const rango = construirRango(paginaActual, totalPaginas)
  const btnBase =
    "h-9 min-w-9 px-3 rounded-xl text-sm font-medium transition-colors border disabled:opacity-40 disabled:pointer-events-none"

  return (
    <nav
      className="flex items-center justify-center gap-1.5 flex-wrap mt-8"
      aria-label="Paginación de recursos"
    >
      <button
        type="button"
        className={`${btnBase} bg-[#232532] text-muted-foreground border-[#3f424d]/60 hover:border-primary/50 hover:text-foreground flex items-center gap-1`}
        onClick={() => onCambiar(paginaActual - 1)}
        disabled={paginaActual === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {rango.map((pagina, idx) =>
        pagina === "…" ? (
          <span key={`gap-${idx}`} className="px-2 text-sm text-muted-foreground select-none">
            …
          </span>
        ) : (
          <button
            key={pagina}
            type="button"
            className={`${btnBase} ${
              pagina === paginaActual
                ? "bg-primary text-primary-foreground border-primary font-semibold shadow-sm"
                : "bg-[#232532] text-muted-foreground border-[#3f424d]/60 hover:border-primary/50 hover:text-foreground"
            }`}
            onClick={() => onCambiar(pagina)}
            aria-current={pagina === paginaActual ? "page" : undefined}
          >
            {pagina}
          </button>
        ),
      )}

      <button
        type="button"
        className={`${btnBase} bg-[#232532] text-muted-foreground border-[#3f424d]/60 hover:border-primary/50 hover:text-foreground flex items-center gap-1`}
        onClick={() => onCambiar(paginaActual + 1)}
        disabled={paginaActual === totalPaginas}
        aria-label="Página siguiente"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  )
}
