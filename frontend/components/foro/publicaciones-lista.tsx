"use client"

import Link from "next/link"
import { ArrowBigUp, CalendarDays, MessageSquare, Plus } from "lucide-react"
import type { Publicacion } from "@/types/foro"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { BadgeModerador } from "./badge-moderador"
import { BotonDM } from "./boton-dm"

interface PublicacionesListaProps {
  publicaciones: Publicacion[]
  seccionId: number
  onNuevaPublicacion: () => void
}

export function PublicacionesLista({
  publicaciones,
  seccionId,
  onNuevaPublicacion,
}: PublicacionesListaProps) {
  if (publicaciones.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground mb-4">Todavía no hay publicaciones en esta sección.</p>
        <button
          onClick={onNuevaPublicacion}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#7957f1] to-[#a6249d] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Crear la primera publicación
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {publicaciones.map((publicacion) => (
        <Link
          key={publicacion.id}
          href={`/foro/seccion/${seccionId}/publicacion/${publicacion.id}`}
          className="block rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-poppins font-semibold text-[15px] text-foreground line-clamp-2">
              {publicacion.titulo}
            </h3>
            <EstadoBadge estado={publicacion.estado} />
          </div>

          <p className="text-sm text-muted-foreground line-clamp-3 mt-1.5">{publicacion.cuerpo}</p>

          {publicacion.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {publicacion.tags.slice(0, 5).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] font-normal bg-secondary/60 text-muted-foreground border-border/60"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 min-w-0">
              <span className="truncate">{publicacion.autor_nombre || "Estudiante"}</span>
              <BadgeModerador perfilId={publicacion.autor_perfil_id} />
              <BotonDM autorPerfilId={publicacion.autor_perfil_id} />
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <CalendarDays className="w-3 h-3" />
              {formatearFecha(publicacion.created_at)}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <ArrowBigUp className={cn("w-3 h-3", publicacion.mi_voto === 1 && "fill-emerald-400 text-emerald-400")} />
              {publicacion.num_votos}
            </span>
            <span className="flex items-center gap-1 shrink-0 ml-auto">
              <MessageSquare className="w-3 h-3" />
              {publicacion.num_comentarios}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function EstadoBadge({ estado }: { estado: Publicacion["estado"] }) {
  const clases = {
    abierta: "text-emerald-300 bg-emerald-950/60 border-emerald-800/40",
    resuelta: "text-sky-300 bg-sky-950/60 border-sky-800/40",
    cerrada: "text-slate-300 bg-slate-900/60 border-slate-700/40",
  }
  return (
    <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-lg border shrink-0", clases[estado])}>
      {estado}
    </span>
  )
}

function formatearFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}