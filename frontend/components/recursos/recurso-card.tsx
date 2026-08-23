import { useState } from "react"
import { Download, Eye, FileCheck, Star, FileText, BookOpen, GraduationCap, Video, Sparkles, FolderArchive } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  const puedeAbrir = Boolean(onDownload || recurso.url_drive)
  const [previewError, setPreviewError] = useState(false)

  // Miniatura real del archivo de Drive (primera página del PDF / frame del
  // video). Solo disponible para recursos ingeridos desde Drive.
  const previewSrc =
    !previewError && recurso.drive_file_id
      ? `https://drive.google.com/thumbnail?id=${recurso.drive_file_id}&sz=w400`
      : null

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

    const fileId = recurso.drive_file_id
    if (fileId) {
      window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, "_blank")
    } else if (recurso.url_drive) {
      window.open(recurso.url_drive, "_blank", "noopener,noreferrer")
    }
  }

  // Gradientes semánticos de fondo para la cabecera/thumbnail según tipo
  const thumbGradients: Record<string, string> = {
    Examen: "linear-gradient(135deg, #451219 0%, #1e1b4b 100%)",
    Practica: "linear-gradient(135deg, #1e1b4b 0%, #31103f 100%)",
    Silabo: "linear-gradient(135deg, #0c4a6e 0%, #1e1b4b 100%)",
    PDF: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    Compendio: "linear-gradient(135deg, #3b0764 0%, #1e1b4b 100%)",
    Libro: "linear-gradient(135deg, #451a03 0%, #1e1b4b 100%)",
    Apunte: "linear-gradient(135deg, #064e3b 0%, #0f172a 100%)",
    Video: "linear-gradient(135deg, #831843 0%, #31103f 100%)",
  }

  // Iconos de marca de agua por tipo
  const WatermarkIcon = () => {
    const iconClass = "absolute right-4 bottom-3 w-14 h-14 text-white/20 pointer-events-none transition-transform duration-300 group-hover:scale-110"
    switch (recurso.tipo) {
      case "Examen": return <GraduationCap className={iconClass} />
      case "Practica": return <FileText className={iconClass} />
      case "Silabo": return <Sparkles className={iconClass} />
      case "Compendio": return <FolderArchive className={iconClass} />
      case "Libro": return <BookOpen className={iconClass} />
      case "Video": return <Video className={iconClass} />
      default: return <FileText className={iconClass} />
    }
  }

  // Nivel / badge de dificultad inferido para el prototipo visual
  const getDificultadBadge = () => {
    if (recurso.tipo === "Examen") {
      return <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm text-rose-300 bg-rose-950/60 border border-rose-800/40">Difícil</span>
    }
    if (recurso.tipo === "Practica") {
      return <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm text-amber-300 bg-amber-950/60 border border-amber-800/40">Media</span>
    }
    return <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm text-emerald-300 bg-emerald-950/60 border border-emerald-800/40">Ciclo {recurso.ciclo ?? "—"}</span>
  }

  const thumbBackground = thumbGradients[recurso.tipo] || "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"

  return (
    <div className="group flex flex-col rounded-2xl bg-card border border-border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-primary/40">
      {/* Header / Thumbnail */}
      <div className="relative h-44 overflow-hidden" style={{ background: thumbBackground }}>
        {/* Previsualización real del archivo (miniatura de Drive) */}
        {previewSrc && (
          <img
            src={previewSrc}
            alt=""
            loading="lazy"
            onError={() => setPreviewError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Overlay de gradiente inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {/* Highlight radial */}
        {!previewSrc && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
        )}

        {/* Badge Tipo (Superior Izquierda) */}
        <div className="absolute left-3 top-3 text-[10.5px] font-semibold px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md text-white border border-white/10 shadow-sm">
          {recurso.tipo}
        </div>

        {/* Badge Dificultad/Ciclo (Superior Derecha) */}
        <div className="absolute right-3 top-3">
          {getDificultadBadge()}
        </div>

        {/* Marca de agua / Icono (Inferior Derecha): solo si no hay previsualización real */}
        {!previewSrc && <WatermarkIcon />}

        {/* Título en thumbnail overlay */}
        <div className="absolute left-3 right-16 bottom-3 z-10">
          <span className="text-[11px] font-medium text-white/80 block uppercase tracking-wider mb-0.5">
            {recurso.codigo_curso || recurso.nombre_curso || "General"}
          </span>
        </div>
      </div>

      {/* Cuerpo de la tarjeta */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-poppins font-semibold text-[14px] leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {recurso.titulo}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1">
            {recurso.nombre_curso || recurso.codigo_curso || "Material académico digital"}
          </p>

          {/* Badges de especialidades (si aplica) */}
          {(recurso.especialidades?.length ?? 0) > 1 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {recurso.especialidades!.map((esp, index) => (
                <Badge
                  key={esp.codigo_curso ?? esp.curso_id ?? index}
                  variant="outline"
                  className="text-[10px] font-normal bg-secondary/60 text-muted-foreground border-border/60"
                >
                  {[esp.codigo_curso, esp.nombre_curso].filter(Boolean).join(" · ")}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Botón Ver Solucionario */}
        {tieneSolucionario && (
          <Button
            size="sm"
            variant="secondary"
            className="w-full gap-1.5 h-8 text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 font-medium rounded-xl transition-colors"
            disabled={!urlSolucionario && !recurso.url_drive}
            onClick={abrirSolucionario}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Ver Solucionario
          </Button>
        )}

        {/* Footer de la tarjeta */}
        <div className="mt-auto pt-3 border-t border-border/60 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 text-[11px] text-muted-foreground">
              <span className="shrink-0">{recurso.year ?? "—"}</span>
              <span className="shrink-0">•</span>
              <span className="flex items-center gap-1 shrink-0">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {recurso.rating.toFixed(1)}
              </span>
              <span className="shrink-0">•</span>
              <span className="truncate">{recurso.downloads} descargas</span>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
              disabled={!puedeAbrir}
              onClick={previsualizar}
              title="Previsualizar"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          <Button
            size="sm"
            className="w-full gap-1.5 h-8 text-[11.5px] font-semibold gradient-brand-hover text-white rounded-xl border-0 shadow-sm"
            disabled={!puedeAbrir}
            onClick={descargar}
          >
            <Download className="w-3.5 h-3.5" />
            Descargar
          </Button>
        </div>
      </div>
    </div>
  )
}