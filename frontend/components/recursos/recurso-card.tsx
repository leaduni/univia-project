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
    Examen: "bg-[#d93340]/10 text-[#d93340] border-[#d93340]/20",
    Práctica: "bg-[#7957f1]/10 text-[#7957f1] border-[#7957f1]/20",
    Libro: "bg-[#d7cef7]/10 text-[#d7cef7] border-[#d7cef7]/20",
    Apunte: "bg-[#a6249d]/10 text-[#a6249d] border-[#a6249d]/20",
  }

  return (
    <Card className="bg-card border-border hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col font-sans">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-2 text-foreground font-poppins font-semibold">{recurso.title}</CardTitle>
            <CardDescription className="text-xs mt-1">{recurso.code}</CardDescription>
          </div>
          <Badge className={typeColors[recurso.type as keyof typeof typeColors]} variant="outline">
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
          <Badge variant="outline" className="bg-secondary text-secondary-foreground font-poppins border-border">
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
              className="gap-1 h-8 text-xs bg-transparent border-[#a6249d] text-[#a6249d] hover:bg-[#a6249d]/5 font-bold font-poppins"
              disabled={!recurso.preview}
            >
              <Eye className="w-3 h-3" />
              Previsualizar
            </Button>
            <Button
              size="sm"
              className="gap-1 h-8 text-xs bg-primary hover:bg-[#bf2a51] text-white font-bold font-poppins border-0 shadow-sm"
            >
              <Download className="w-3 h-3" />
              Descargar
            </Button>
          </div>
          {recurso.hasSolucionario && (
            <Button size="sm" variant="secondary" className="w-full gap-1 h-8 text-xs font-poppins font-semibold">
              <FileCheck className="w-3 h-3" />
              Ver Solucionario
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
