// Empty state for resource library with AI suggestion card
"use client"

import { Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function RecursosEmptyState() {
  return (
    <div className="flex justify-center items-center min-h-96 py-12">
      <Card className="bg-gradient-to-br from-card via-secondary/50 to-card border-border max-w-md w-full">
        <CardContent className="pt-12 pb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-secondary">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron resultados</h3>
          <p className="text-sm text-muted-foreground mb-6">Intenta ajustar tus filtros o busca con otros términos</p>

          {/* AI Suggestion */}
          <div className="ai-card-neon rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg gradient-ai-neon-br">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground mb-1">Sugerencia IA</p>
                <p className="text-xs text-muted-foreground">
                  ¿No encuentras lo que buscas? Puedes solicitar a la IA que genere un examen de práctica basado en el
                  sílabo del curso.
                </p>
              </div>
            </div>
          </div>

          <Button className="w-full gradient-ai-neon-hover text-white gap-2 border-0">
            <Sparkles className="w-4 h-4" />
            Generar Examen con IA
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
