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
  const typeColors = {
    Examen: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    Práctica: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    Libro: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    Apunte: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  }

  return (
    <Card className="bg-card border-border hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-2 text-foreground">{recurso.title}</CardTitle>
            <CardDescription className="text-xs mt-1">{recurso.code}</CardDescription>
          </div>
          <Badge className={typeColors[recurso.type as keyof typeof typeColors]} variant="secondary">
            {recurso.type}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1 flex flex-col">
        {/* Semester and Meta Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{recurso.semester}</span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            {recurso.rating.toFixed(1)}
          </span>
        </div>

        {/* Ciclo Badge */}
        <div>
          <Badge variant="outline" className="bg-secondary">
            Ciclo {recurso.ciclo}
          </Badge>
        </div>

        {/* Download Stats */}
        <div className="text-xs text-muted-foreground">{recurso.downloads.toLocaleString()} descargas</div>

        {/* Action Buttons */}
        <div className="space-y-2 mt-auto pt-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-8 text-xs bg-transparent"
              disabled={!recurso.preview}
            >
              <Eye className="w-3 h-3" />
              Previsualizar
            </Button>
            <Button
              size="sm"
              className="gap-1 h-8 text-xs bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
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
