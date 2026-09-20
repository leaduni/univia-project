"use client"

// Tarjeta de hilo del feed global (Fase 5). Estética Apple-Grade Dark UI:
// vidrio (bg-card/80 + backdrop-blur), borde hairline blanco/10 y estados de
// hover con glow de acento. Acciones optimistas: voto y guardado.

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowBigDown,
  ArrowBigUp,
  Bookmark,
  CheckCircle2,
  Eye,
  MessageSquare,
} from "lucide-react"
import type { Publicacion } from "@/types/foro"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { BadgeModerador } from "../badge-moderador"

interface PostCardProps {
  publicacion: Publicacion
  indice?: number
  onVotar: (publicacionId: number, valor: 1 | -1) => void
  onAlternarGuardado: (publicacionId: number) => void
}

function iniciales(nombre?: string | null): string {
  if (!nombre) return "U"
  return nombre
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

function tiempoRelativo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es })
  } catch {
    return iso
  }
}

export function PostCard({ publicacion, indice = 0, onVotar, onAlternarGuardado }: PostCardProps) {
  const href = `/foro/seccion/${publicacion.seccion_id}/publicacion/${publicacion.id}`
  const resuelta = publicacion.estado === "resuelta"
  const url_portada = publicacion.portada_url

  return (
    <article
      className={cn(
        "group relative rounded-2xl border border-white/10 bg-card/80 backdrop-blur-md",
        "p-4 sm:p-5 transition-all duration-200 anim-up",
        "hover:-translate-y-0.5 hover:border-[#7957f1]/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.35),0_0_20px_-8px_var(--ai-glow)]",
      )}
      style={{ animationDelay: `${Math.min(indice, 8) * 45}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar + autor */}
        <Avatar className="h-9 w-9 shrink-0 border border-white/10">
          <AvatarFallback className="bg-secondary text-[11px] font-semibold text-foreground">
            {iniciales(publicacion.autor_nombre)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/90 truncate max-w-[140px]">
              {publicacion.autor_nombre || "Estudiante"}
            </span>
            <BadgeModerador perfilId={publicacion.autor_perfil_id} />
            <span aria-hidden>·</span>
            <time dateTime={publicacion.created_at}>{tiempoRelativo(publicacion.created_at)}</time>
            {publicacion.seccion_titulo && (
              <>
                <span aria-hidden>·</span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-normal border-white/10 bg-white/5 text-muted-foreground"
                >
                  {publicacion.facultad_nombre || publicacion.seccion_titulo}
                </Badge>
              </>
            )}
            {resuelta && (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                Resuelta
              </span>
            )}
          </div>

          {/* Título + extracto */}
          <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7957f1] rounded-lg mt-1.5">
            <h3 className="font-poppins font-semibold text-[15px] leading-snug text-foreground line-clamp-2 group-hover:text-white transition-colors">
              {publicacion.titulo}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">
              {publicacion.cuerpo}
            </p>
          </Link>

          {/* Portada opcional */}
          {url_portada && (
            <Link href={href} className="block mt-3 overflow-hidden rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url_portada}
                alt=""
                loading="lazy"
                className="w-full max-h-56 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </Link>
          )}

          {/* Tags */}
          {publicacion.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {publicacion.tags.slice(0, 5).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] font-normal border-white/10 bg-white/5 text-muted-foreground"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Acciones */}
          <div className="mt-3.5 flex items-center gap-1 text-xs text-muted-foreground">
            <button
              type="button"
              aria-label="Voto positivo"
              aria-pressed={publicacion.mi_voto === 1}
              onClick={() => onVotar(publicacion.id, 1)}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-white/5",
                publicacion.mi_voto === 1 && "text-emerald-400",
              )}
            >
              <ArrowBigUp
                className={cn("h-4 w-4", publicacion.mi_voto === 1 && "fill-emerald-400")}
              />
            </button>
            <span
              className={cn(
                "min-w-[2ch] text-center tabular-nums font-medium",
                publicacion.mi_voto === 1 && "text-emerald-400",
                publicacion.mi_voto === -1 && "text-rose-400",
              )}
            >
              {publicacion.num_votos}
            </span>
            <button
              type="button"
              aria-label="Voto negativo"
              aria-pressed={publicacion.mi_voto === -1}
              onClick={() => onVotar(publicacion.id, -1)}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-white/5",
                publicacion.mi_voto === -1 && "text-rose-400",
              )}
            >
              <ArrowBigDown
                className={cn("h-4 w-4", publicacion.mi_voto === -1 && "fill-rose-400")}
              />
            </button>

            <Link
              href={href}
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-white/5"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="tabular-nums">{publicacion.num_comentarios}</span>
              <span className="hidden sm:inline">respuestas</span>
            </Link>

            <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1">
              <Eye className="h-4 w-4" />
              <span className="tabular-nums">{publicacion.num_vistas}</span>
            </span>

            <button
              type="button"
              aria-label={publicacion.guardado ? "Quitar de guardados" : "Guardar hilo"}
              aria-pressed={publicacion.guardado}
              onClick={() => onAlternarGuardado(publicacion.id)}
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-white/5",
                publicacion.guardado && "text-[#7957f1]",
              )}
            >
              <Bookmark className={cn("h-4 w-4", publicacion.guardado && "fill-[#7957f1]")} />
              <span className="hidden sm:inline">{publicacion.guardado ? "Guardado" : "Guardar"}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
