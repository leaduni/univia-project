// Resource card with type badge, metadata, and download
"use client"

import { Download, Eye, FileCheck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Recurso } from "@/types/recurso"

interface RecursoCardProps {
  recurso: Recurso
  // Permite a quien use la tarjeta (ej. el banco de exámenes de un curso)
  // sobreescribir la descarga para recursos que no vienen de Drive, como las
  // planchas locales de Geometría Analítica.
  onDownload?: () => void
}

export function RecursoCard({ recurso, onDownload }: RecursoCardProps) {
  const typeColors: Record<string, string> = {
    Examen: "bg-red-500/15 text-red-400 border-red-500/30",
    Practica: "bg-primary/15 text-primary border-primary/30",
    Silabo: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    PDF: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    Compendio: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    Libro: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Apunte: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Video: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  }

  const puedeAbrir = Boolean(onDownload || recurso.url_drive)

  const urlSolucionario =
    recurso.url_solucionario ||
    (recurso.drive_id_solucionario
      ? `https://drive.google.com/file/d/${recurso.drive_id_solucionario}/view`
      : null)

  const tieneSolucionario = Boolean(
    recurso.has_solucionario || recurso.url_solucionario || recurso.drive_id_solucionario
  )

  const previsualizar = () => {
    if (onDownload) {
      onDownload()
    } else if (recurso.url_drive) {
      window.open(recurso.url_drive, "_blank", "noopener,noreferrer")
    }
  }

  const abrirSolucionario = () => {
    if (urlSolucionario) {
      window.open(urlSolucionario, "_blank", "noopener,noreferrer")
    } else if (recurso.url_drive) {
      window.open(recurso.url_drive, "_blank", "noopener,noreferrer")
    }
  }

  const descargar = () => {
    if (onDownload) {
      onDownload()
      return
    }

    const fileId = (recurso as any).drive_file_id
    if (fileId) {
      // Fuerza el inicio de descarga automática del archivo desde Google Drive
      window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, "_blank")
    } else if (recurso.url_drive) {
      window.open(recurso.url_drive, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <Card className="bg-card border-border hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-2 text-foreground">{recurso.titulo}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {recurso.codigo_curso || recurso.nombre_curso || "—"}
            </CardDescription>
            {(recurso.especialidades?.length ?? 0) > 1 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {recurso.especialidades!.map((esp, index) => (
                  <Badge
                    key={esp.codigo_curso ?? esp.curso_id ?? index}
                    variant="outline"
                    className="text-[10px] font-normal bg-secondary/60 text-muted-foreground"
                  >
                    {[esp.codigo_curso, esp.nombre_curso].filter(Boolean).join(" · ")}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Badge className={typeColors[recurso.tipo]} variant="secondary">
            {recurso.tipo}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{recurso.year ?? "—"}</span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            {recurso.rating.toFixed(1)}
          </span>
        </div>

        <div>
          <Badge variant="outline" className="bg-secondary text-foreground">
            Ciclo {recurso.ciclo ?? "—"}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">{recurso.downloads.toLocaleString()} descargas</div>

        <div className="space-y-2 mt-auto pt-2">
          {tieneSolucionario && (
            <Button
              size="sm"
              variant="secondary"
              className="w-full gap-1.5 h-8 text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 font-medium"
              disabled={!urlSolucionario && !recurso.url_drive}
              onClick={abrirSolucionario}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Ver Solucionario
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-8 text-xs bg-transparent border-border"
              disabled={!puedeAbrir}
              onClick={previsualizar}
            >
              <Eye className="w-3 h-3" />
              Previsualizar
            </Button>
            <Button
              size="sm"
              className="gap-1 h-8 text-xs gradient-brand-hover text-white border-0"
              disabled={!puedeAbrir}
              onClick={descargar}
            >
              <Download className="w-3 h-3" />
              Descargar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}