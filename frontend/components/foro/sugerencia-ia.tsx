"use client"

import { useState } from "react"
import { Bot, CheckCircle2, Loader2, Sparkles } from "lucide-react"
import { foroService } from "@/lib/foro-service"
import type { SugerenciaIA } from "@/types/foro"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SugerenciaIAProps {
  publicacionId: number
  sugerencia: SugerenciaIA
  /** true si el usuario actual es el autor del hilo (puede resolver). */
  esAutor: boolean
  onAceptada: () => void
}

/**
 * Bloque destacado "Sugerencia UniVia Bot" que se muestra en hilos de duda con
 * sugerencia generada por el RAG. Permite al autor aceptarla como solución.
 */
export function SugerenciaIA({ publicacionId, sugerencia, esAutor, onAceptada }: SugerenciaIAProps) {
  const [aceptando, setAceptando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const aceptada = sugerencia.aceptada

  const aceptar = async () => {
    if (!esAutor || aceptada || aceptando) return
    setAceptando(true)
    setError(null)
    try {
      await foroService.resolverHilo(publicacionId, { aceptar_sugerencia_ia: true })
      onAceptada()
    } catch (e: any) {
      setError(e.message || "No se pudo aceptar la sugerencia.")
    } finally {
      setAceptando(false)
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        aceptada
          ? "border-emerald-500/40 bg-emerald-950/20"
          : "border-[#7957f1]/40 bg-gradient-to-br from-[#1a1233] to-[#14101f]",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7957f1] to-[#a6249d] flex items-center justify-center shrink-0">
          <Bot className="w-3.5 h-3.5 text-white" />
        </span>
        <span className="font-poppins font-semibold text-xs text-primary flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          Sugerencia UniVia Bot
        </span>
        {aceptada && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-lg">
            <CheckCircle2 className="w-3 h-3" />
            Solución aceptada
          </span>
        )}
      </div>

      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {sugerencia.respuesta}
      </p>

      {sugerencia.fuentes.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Basado en {sugerencia.fuentes.length} fuente(s) del material
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sugerencia.fuentes.slice(0, 3).map((f, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-md bg-secondary/60 text-muted-foreground border border-border/60"
              >
                Recurso #{f.recurso_id ?? "—"} · {Math.round(f.similitud * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {esAutor && !aceptada && (
        <div className="mt-3 flex items-center gap-3">
          <Button size="sm" onClick={aceptar} disabled={aceptando} className="gap-1.5">
            {aceptando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Esta sugerencia resuelve mi duda
          </Button>
          {error && <span className="text-[11px] text-destructive">{error}</span>}
        </div>
      )}
    </div>
  )
}