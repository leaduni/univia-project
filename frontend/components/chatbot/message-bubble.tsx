// Burbuja de un turno del chat (usuario o asistente), con variante para las
// tarjetas de recurso descargable que trae el intent `recurso`.
"use client"

import {
  AlertCircle,
  BookOpen,
  Download,
  FileText,
  FolderArchive,
  GraduationCap,
  RotateCw,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import MarkdownRenderer from "@/components/ui/markdown-renderer"
import { cn } from "@/lib/utils"
import type { MensajeChat, RecursoAdjuntoChat } from "@/types/chatbot"

const ICONO_POR_TIPO: Record<string, typeof FileText> = {
  Examen: GraduationCap,
  Practica: FileText,
  Silabo: Sparkles,
  Compendio: FolderArchive,
  Libro: BookOpen,
  Apunte: FileText,
}

function TarjetaRecursoChat({ recurso }: { recurso: RecursoAdjuntoChat }) {
  const puedeAbrir = Boolean(recurso.url_drive)
  const Icono = ICONO_POR_TIPO[recurso.tipo] || FileText

  return (
    <a
      href={puedeAbrir ? recurso.url_drive! : undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!puedeAbrir}
      onClick={(e) => {
        if (!puedeAbrir) e.preventDefault()
      }}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition-colors",
        puedeAbrir
          ? "hover:bg-white/10 hover:border-white/20 cursor-pointer"
          : "opacity-60 cursor-not-allowed",
      )}
    >
      <div className="shrink-0 w-8 h-8 rounded-lg gradient-brand-br flex items-center justify-center">
        <Icono className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{recurso.titulo}</p>
        <p className="text-[10.5px] text-muted-foreground truncate">
          {recurso.tipo}
          {recurso.year ? ` · ${recurso.year}` : ""}
          {recurso.has_solucionario ? " · con solucionario" : ""}
        </p>
      </div>
      {puedeAbrir && <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
    </a>
  )
}

function IndicadorEscribiendo() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="El asistente está escribiendo" role="status">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
    </div>
  )
}

interface MessageBubbleProps {
  mensaje: MensajeChat
  /** Reenvía `mensaje.textoOrigen` como un turno nuevo. Solo aplica a errores. */
  onReintentar?: (texto: string) => void
}

export function MessageBubble({ mensaje, onReintentar }: MessageBubbleProps) {
  const esUsuario = mensaje.rol === "user"
  const sinTextoTodavia = !mensaje.contenido && mensaje.enCurso && !mensaje.esError
  const recursos = mensaje.adjuntos?.recursos
  const curso = mensaje.adjuntos?.curso
  const puedeReintentar = mensaje.esError && !!mensaje.textoOrigen && !!onReintentar

  return (
    <div className={cn("flex", esUsuario ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] flex flex-col gap-2", esUsuario && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
            esUsuario
              ? "gradient-brand-hover text-white rounded-br-sm"
              : mensaje.esError
                ? "bg-rose-950/30 border border-rose-800/40 text-rose-300 rounded-bl-sm"
                : "bg-white/5 border border-white/10 text-foreground rounded-bl-sm",
          )}
        >
          {mensaje.esError && (
            <div className="flex items-center gap-1.5 mb-1 text-rose-400 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              No se pudo responder
            </div>
          )}
          {sinTextoTodavia ? (
            <IndicadorEscribiendo />
          ) : esUsuario ? (
            <p className="whitespace-pre-wrap break-words">{mensaje.contenido}</p>
          ) : (
            <MarkdownRenderer content={mensaje.contenido} className="prose-sm prose-p:my-1 prose-ul:my-1" />
          )}
          {puedeReintentar && (
            <button
              type="button"
              onClick={() => onReintentar!(mensaje.textoOrigen!)}
              className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-300 hover:text-rose-200 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Reintentar
            </button>
          )}
        </div>

        {!!recursos?.length && (
          <div className="w-full flex flex-col gap-1.5">
            {curso && (
              <Badge variant="outline" className="self-start text-[10.5px] border-white/15 text-muted-foreground">
                {[curso.code, curso.name].filter(Boolean).join(" — ")}
              </Badge>
            )}
            {recursos.map((recurso) => (
              <TarjetaRecursoChat key={recurso.id} recurso={recurso} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
