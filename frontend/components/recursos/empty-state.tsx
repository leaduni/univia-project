// Empty state for resource library with AI suggestion card
"use client"

import { Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RecursosEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center max-w-md mx-auto">
      <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-md">
        <Search className="w-8 h-8 text-primary" />
      </div>

      <h3 className="font-poppins font-semibold text-lg text-foreground mt-2">No se encontraron resultados</h3>
      <p className="text-sm text-muted-foreground max-w-sm">Intenta ajustar tus filtros o busca con otros términos para encontrar materiales académicos.</p>

      {/* AI Suggestion */}
      <div className="ai-card-neon rounded-2xl p-4 mt-3 w-full border border-primary/20 bg-card/90 shadow-lg text-left">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl gradient-ai-neon-br shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Sugerencia IA</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ¿No encuentras lo que buscas? Puedes solicitar a la IA que genere un examen de práctica basado en el sílabo del curso.
            </p>
          </div>
        </div>
      </div>

      <Button className="w-full h-11 rounded-xl font-semibold gradient-ai-neon-hover text-white gap-2 border-0 shadow-md mt-2">
        <Sparkles className="w-4 h-4" />
        Generar Examen con IA
      </Button>
    </div>
  )
}
