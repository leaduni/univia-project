"use client"

// Tarjeta de hilo del feed global (Fase 5). Vidrio + borde hairline, glow
// ambiental al hover. Acciones optimistas: voto y guardado. Navegación por
// Link a la página del hilo.

import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowBigDown,
  ArrowBigUp,
  CheckCircle2,
  Eye,
  MessageSquare,
} from "lucide-react"
import type { Publicacion } from "@/types/foro"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { BadgeModerador } from "../badge-moderador"
import { BotonDM } from "../boton-dm"

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
        "group relative overflow-hidden rounded-[20px] border border-white/[0.08]",
        "bg-white/[0.025] p-5 shadow-xl shadow-black/15 backdrop-blur-2xl anim-up",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.14]",
        "hover:bg-white/[0.035] hover:shadow-2xl hover:shadow-black/25",
      )}
      style={{ animationDelay: `${Math.min(indice, 8) * 45}ms` }}
    >
      {/* Top reflection */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.10] to-transparent opacity-0 transition group-hover:opacity-100" />

      {/* Hover ambient glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-violet-500/[0.045] opacity-0 blur-[70px] transition duration-500 group-hover:opacity-100" />

      <div className="relative">
        {/* AUTHOR */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 border border-fuchsia-400/20">
              <AvatarFallback className="bg-fuchsia-500/[0.12] text-xs font-semibold text-fuchsia-300">
                {iniciales(publicacion.autor_nombre)}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="min-w-0 flex-1">
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="font-semibold text-white/75">
                {publicacion.autor_nombre || "Estudiante"}
              </span>
              <BadgeModerador perfilId={publicacion.autor_perfil_id} />
              <BotonDM
                autorPerfilId={publicacion.autor_perfil_id}
                autorNombre={publicacion.autor_nombre}
                iconOnly
              />
              <span className="text-white/20" aria-hidden>
                ·
              </span>
              <time dateTime={publicacion.created_at} className="text-white/30">
                {tiempoRelativo(publicacion.created_at)}
              </time>

              {publicacion.seccion_titulo && (
                <>
                  <span className="text-white/15" aria-hidden>
                    ·
                  </span>
                  <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-0.5 text-[9px] text-white/35">
                    {publicacion.facultad_nombre || publicacion.seccion_titulo}
                  </span>
                </>
              )}

              {resuelta && (
                <span className="inline-flex items-center gap-1 text-emerald-400/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Resuelta
                </span>
              )}
            </div>

            {/* Título + extracto */}
            <Link
              href={href}
              className="mt-2 block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
            >
              <h3 className="text-base font-semibold tracking-[-0.025em] text-white/90 line-clamp-2 transition-colors group-hover:text-white">
                {publicacion.titulo}
              </h3>
              <p className="mt-1 text-sm leading-6 text-white/45 line-clamp-3 whitespace-pre-line">
                {publicacion.cuerpo}
              </p>
            </Link>

            {/* Portada opcional */}
            {url_portada && (
              <Link
                href={href}
                className="relative mt-3 block h-56 overflow-hidden rounded-xl border border-white/[0.08]"
              >
                <Image
                  src={url_portada}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </Link>
            )}

            {/* Tags */}
            {publicacion.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {publicacion.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 text-[10px] font-medium text-white/40 transition group-hover:border-violet-400/15 group-hover:bg-violet-400/[0.06] group-hover:text-violet-300/70"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-1">
            {/* Upvote */}
            <button
              type="button"
              aria-label="Voto positivo"
              aria-pressed={publicacion.mi_voto === 1}
              onClick={() => onVotar(publicacion.id, 1)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-white/35 transition hover:bg-emerald-400/[0.07] hover:text-emerald-400",
                publicacion.mi_voto === 1 && "text-emerald-400",
              )}
            >
              <ArrowBigUp
                className={cn("h-3.5 w-3.5", publicacion.mi_voto === 1 && "fill-emerald-400")}
              />
            </button>

            <span
              className={cn(
                "min-w-[2ch] text-center text-[11px] tabular-nums font-medium text-white/50",
                publicacion.mi_voto === 1 && "text-emerald-400",
                publicacion.mi_voto === -1 && "text-rose-400",
              )}
            >
              {publicacion.num_votos}
            </span>

            {/* Downvote */}
            <button
              type="button"
              aria-label="Voto negativo"
              aria-pressed={publicacion.mi_voto === -1}
              onClick={() => onVotar(publicacion.id, -1)}
              className={cn(
                "rounded-lg p-1.5 text-white/25 transition hover:bg-white/[0.04] hover:text-white/60",
                publicacion.mi_voto === -1 && "text-rose-400",
              )}
            >
              <ArrowBigDown
                className={cn("h-3.5 w-3.5", publicacion.mi_voto === -1 && "fill-rose-400")}
              />
            </button>

            {/* Comments */}
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-white/35 transition hover:bg-white/[0.04] hover:text-white/70"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="tabular-nums">{publicacion.num_comentarios}</span>
              <span className="hidden sm:inline">respuestas</span>
            </Link>

            {/* Views */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-white/25">
              <Eye className="h-3.5 w-3.5" />
              <span className="tabular-nums">{publicacion.num_vistas}</span>
            </span>
          </div>

          {/* Save */}
          <button
            type="button"
            aria-label={publicacion.guardado ? "Quitar de guardados" : "Guardar hilo"}
            aria-pressed={publicacion.guardado}
            onClick={() => onAlternarGuardado(publicacion.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-white/35 transition hover:bg-white/[0.04] hover:text-white/75",
              publicacion.guardado && "text-violet-300",
            )}
          >
            <svg
              className={cn("h-3.5 w-3.5", publicacion.guardado && "fill-violet-400")}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 4a2 2 0 012-2h8a2 2 0 012 2v17l-6-3-6 3V4z"
              />
            </svg>
            {publicacion.guardado ? "Guardado" : "Guardar"}
          </button>
        </div>
      </div>
    </article>
  )
}
