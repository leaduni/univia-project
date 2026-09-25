import { useState } from "react"
import Image from "next/image"
import { Download, Eye, FileCheck, Star, FileText, BookOpen, GraduationCap, Video, Sparkles, FolderArchive, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Recurso } from "@/types/recurso"

interface RecursoCardProps {
  recurso: Recurso
  // Permite a quien use la tarjeta (ej. el banco de exámenes de un curso)
  // sobreescribir la descarga para recursos que no vienen de Drive, como las
  // planchas locales de Geometría Analítica.
  onDownload?: () => void
  // true mientras la descarga de este recurso está en curso: deshabilita las
  // acciones de la tarjeta y muestra un spinner en el botón principal.
  descargando?: boolean
}

export function RecursoCard({ recurso, onDownload, descargando }: RecursoCardProps) {
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
  // Usa los colores de marca (violet, magenta, carmin) como base
  const thumbGradients: Record<string, string> = {
    Examen: "linear-gradient(135deg, #d93340 0%, #bf2a51 100%)",      // brand-red → brand-carmin
    Practica: "linear-gradient(135deg, #f59e0b 0%, #d93340 100%)",    // Amber → brand-red
    Silabo: "linear-gradient(135deg, #7957f1 0%, #a6249d 100%)",      // brand-violet → brand-magenta
    PDF: "linear-gradient(135deg, #64748b 0%, #334155 100%)",         // Slate
    Compendio: "linear-gradient(135deg, #a6249d 0%, #7957f1 100%)",   // brand-magenta → brand-violet
    Libro: "linear-gradient(135deg, #ec4899 0%, #a6249d 100%)",       // Pink → brand-magenta
    Apunte: "linear-gradient(135deg, #10b981 0%, #047857 100%)",      // Emerald
    Video: "linear-gradient(135deg, #d93340 0%, #a6249d 100%)",       // brand-red → brand-magenta
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
      return <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm text-rose-300 bg-rose-950/60 border border-rose-800/40">Difícil</span>
    }
    if (recurso.tipo === "Practica") {
      return <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm text-amber-300 bg-amber-950/60 border border-amber-800/40">Media</span>
    }
    return <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm text-brand-lila bg-brand-violet/20 border border-brand-violet/30">Ciclo {recurso.ciclo ?? "—"}</span>
  }

  const thumbBackground = thumbGradients[recurso.tipo] || "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"

  return (
    <div className="group flex flex-col rounded-2xl bg-card border border-border/60 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand-violet/10 hover:border-brand-violet/30">
      {/* Header / Thumbnail */}
      <div className="relative h-44 overflow-hidden" style={{ background: thumbBackground }}>
        {/* Previsualización real del archivo (miniatura de Drive) */}
        {previewSrc && (
          <Image
            src={previewSrc}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            onError={() => setPreviewError(true)}
            className="object-cover"
          />
        )}
        {/* Overlay de gradiente inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {/* Highlight radial */}
        {!previewSrc && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
        )}

        {/* Badge Tipo (Superior Izquierda) */}
        <div className="absolute left-3 top-3 text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md text-white border border-white/10 shadow-sm uppercase tracking-wider">
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
          <span className="text-[10px] font-bold text-white/80 block uppercase tracking-widest mb-0.5">
            {recurso.codigo_curso || recurso.nombre_curso || "General"}
          </span>
        </div>
      </div>

      {/* Cuerpo de la tarjeta */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-heading font-bold text-[14px] leading-snug text-foreground line-clamp-2 group-hover:text-brand-violet transition-colors duration-200">
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
                  className="text-[10px] font-semibold bg-brand-violet/10 text-brand-lila border-brand-violet/20"
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
            className="w-full gap-1.5 h-8 text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 font-bold rounded-xl transition-colors"
            disabled={!urlSolucionario && !recurso.url_drive}
            onClick={abrirSolucionario}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Ver Solucionario
          </Button>
        )}

        {/* Footer de la tarjeta */}
        <div className="mt-auto pt-3 border-t border-border/40 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 text-[11px] text-muted-foreground font-medium">
              <span className="shrink-0">{recurso.year ?? "—"}</span>
              <span className="shrink-0 text-border">•</span>
              <span className="flex items-center gap-1 shrink-0">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {recurso.rating.toFixed(1)}
              </span>
              <span className="shrink-0 text-border">•</span>
              <span className="truncate">{recurso.downloads} descargas</span>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-brand-violet hover:bg-brand-violet/10 transition-colors"
              disabled={!puedeAbrir || descargando}
              onClick={previsualizar}
              title="Previsualizar"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          <Button
            size="sm"
            className="w-full gap-1.5 h-9 text-[12px] font-bold gradient-brand text-white rounded-xl border-0 shadow-md shadow-brand-violet/15 hover:shadow-lg hover:shadow-brand-violet/25 transition-all duration-200"
            disabled={!puedeAbrir || descargando}
            onClick={descargar}
          >
            {descargando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {descargando ? "Descargando..." : "Descargar"}
          </Button>
        </div>
      </div>
    </div>
  )
}