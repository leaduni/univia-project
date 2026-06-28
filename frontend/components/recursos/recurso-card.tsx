"use client"

import { Download, Eye, FileCheck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Recurso } from "@/types/recurso"

interface RecursoCardProps {
  recurso: Recurso
}

export function RecursoCard({ recurso }: RecursoCardProps) {
  const typeColors: Record<string, string> = {
    Examen: "bg-red-500/15 text-red-400 border-red-500/30",
    Práctica: "bg-primary/15 text-primary border-primary/30",
    Libro: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Apunte: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  }

  return (
    <Card className="bg-card border-border hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-2 text-foreground">{recurso.title}</CardTitle>
            <CardDescription className="text-xs mt-1">{recurso.code}</CardDescription>
          </div>
          <Badge className={typeColors[recurso.type]} variant="secondary">
            {recurso.type}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{recurso.semester}</span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            {recurso.rating.toFixed(1)}
          </span>
        </div>

        <div>
          <Badge variant="outline" className="bg-secondary text-foreground">
            Ciclo {recurso.ciclo}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">{recurso.downloads.toLocaleString()} descargas</div>

        <div className="space-y-2 mt-auto pt-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-8 text-xs bg-transparent border-border"
              disabled={!recurso.preview}
            >
              <Eye className="w-3 h-3" />
              Previsualizar
            </Button>
            <Button
              size="sm"
              className="gap-1 h-8 text-xs gradient-brand-hover text-white border-0"
            >
              <Download className="w-3 h-3" />
              Descargar
            </Button>
          </div>
          {recurso.hasSolucionario && (
            <Button size="sm" variant="secondary" className="w-full gap-1 h-8 text-xs">
              <FileCheck className="w-3 h-3" />
              Ver Solucionario
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
