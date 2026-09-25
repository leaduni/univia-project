"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowBigDown, ArrowBigUp, Bookmark, CalendarDays, CheckCircle2, Eye, Loader2, MessageSquare, Send } from "lucide-react"
import { foroService } from "@/lib/foro-service"
import type { Comentario, Publicacion } from "@/types/foro"
import { Button } from "@/components/ui/button"
import MarkdownRenderer from "@/components/ui/markdown-renderer"
import { cn } from "@/lib/utils"
import { BadgeModerador } from "./badge-moderador"
import { BotonDM } from "./boton-dm"
import { SugerenciaIA } from "./sugerencia-ia"
import { useAuth } from "@/components/providers/auth-context"

// Profundidad máxima de renderizado de respuestas anidadas (confirmado: 3).
const PROFUNDIDAD_MAX = 3

interface HiloPublicacionProps {
  publicacionId: number
  publicacionInicial?: Publicacion
}

export function HiloPublicacion({ publicacionId, publicacionInicial }: HiloPublicacionProps) {
  const { user, supabaseUser } = useAuth()
  const usuarioActual = supabaseUser?.id
  const [publicacion, setPublicacion] = useState<Publicacion | null>(publicacionInicial ?? null)
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [cargando, setCargando] = useState(!publicacionInicial)
  const [cargandoComentarios, setCargandoComentarios] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [nuevoComentario, setNuevoComentario] = useState("")
  const [respondiendoA, setRespondiendoA] = useState<number | null>(null)
  const [respuesta, setRespuesta] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [envError, setEnvError] = useState<string | null>(null)

  // Voto sobre la publicación (optimista).
  const [votandoPub, setVotandoPub] = useState(false)

  useEffect(() => {
    let activo = true

    if (!publicacionInicial) {
      foroService
        .getPublicacion(publicacionId)
        .then((data) => {
          if (activo) setPublicacion(data)
        })
        .catch((e) => {
          if (activo) setError(e.message || "No se pudo cargar la publicación.")
        })
        .finally(() => {
          if (activo) setCargando(false)
        })
    }

    foroService
      .getComentarios(publicacionId)
      .then((data) => {
        if (activo) setComentarios(data)
      })
      .catch(() => {
        /* los comentarios son un extra; no bloquean el hilo */
      })
      .finally(() => {
        if (activo) setCargandoComentarios(false)
      })

    return () => {
      activo = false
    }
  }, [publicacionId, publicacionInicial])

  // Vista única (Fase 5): una por usuario e hilo, fire-and-forget; si el
  // backend confirma que fue nueva, se refleja el contador en pantalla.
  useEffect(() => {
    foroService
      .registrarVista(publicacionId)
      .then((resp) => {
        setPublicacion((p) =>
          p ? { ...p, num_vistas: Math.max(p.num_vistas ?? 0, resp.num_vistas) } : p,
        )
      })
      .catch(() => {})
  }, [publicacionId])

  // Árbol de comentarios: agrupa por parent_id.
  const arbol = useMemo(() => {
    const porPadre = new Map<number | null, Comentario[]>()
    for (const c of comentarios) {
      const clave = c.parent_id ?? null
      const lista = porPadre.get(clave) ?? []
      lista.push(c)
      porPadre.set(clave, lista)
    }
    return porPadre
  }, [comentarios])

  if (cargando) {
    return <div className="h-40 rounded-2xl bg-muted animate-pulse" />
  }

  if (error || !publicacion) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">{error || "No se pudo cargar la publicación."}</p>
      </div>
    )
  }

  const votarPublicacion = async (valor: 1 | -1) => {
    if (votandoPub || !publicacion) return
    setVotandoPub(true)
    // Optimista.
    const previo = publicacion.mi_voto
    const mismo = previo === valor
    setPublicacion({
      ...publicacion,
      mi_voto: mismo ? 0 : valor,
      num_votos: publicacion.num_votos + (mismo ? -previo : valor - previo),
    })
    try {
      const resultado = await foroService.votar({ publicacion_id: publicacion.id, valor })
      setPublicacion((p) => (p ? { ...p, num_votos: resultado.num_votos, mi_voto: resultado.mi_voto } : p))
    } catch {
      // Revertir el optimista.
      setPublicacion((p) => (p ? { ...p, mi_voto: previo, num_votos: publicacion.num_votos } : p))
    } finally {
      setVotandoPub(false)
    }
  }

  const votarComentario = async (comentario: Comentario, valor: 1 | -1) => {
    const previo = comentario.mi_voto
    const mismo = previo === valor
    const nuevo: Comentario = {
      ...comentario,
      mi_voto: mismo ? 0 : valor,
      num_votos: comentario.num_votos + (mismo ? -previo : valor - previo),
    }
    // Optimista.
    setComentarios((prev) => prev.map((c) => (c.id === comentario.id ? nuevo : c)))
    try {
      const resultado = await foroService.votar({ comentario_id: comentario.id, valor })
      setComentarios((prev) =>
        prev.map((c) =>
          c.id === comentario.id ? { ...c, num_votos: resultado.num_votos, mi_voto: resultado.mi_voto } : c,
        ),
      )
    } catch {
      setComentarios((prev) => prev.map((c) => (c.id === comentario.id ? { ...comentario } : c)))
    }
  }

  const enviarComentario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoComentario.trim() || enviando) return
    setEnviando(true)
    setEnvError(null)
    const cuerpo = nuevoComentario.trim()
    // Optimista: el comentario aparece en 0ms sin esperar al servidor.
    const temporal: Comentario = {
      id: -Date.now(),
      publicacion_id: publicacionId,
      autor_perfil_id: usuarioActual || "",
      autor_nombre: user?.nombre_completo || "Tú",
      cuerpo,
      created_at: new Date().toISOString(),
      num_votos: 0,
      mi_voto: 0,
      es_solucion: false,
    }
    setComentarios((prev) => [...prev, temporal])
    setPublicacion((p) => (p ? { ...p, num_comentarios: p.num_comentarios + 1 } : p))
    setNuevoComentario("")
    try {
      const creado = await foroService.crearComentario({ publicacion_id: publicacionId, cuerpo })
      setComentarios((prev) => prev.map((c) => (c.id === temporal.id ? creado : c)))
    } catch (err: any) {
      setEnvError(err.message || "No se pudo crear el comentario.")
      // Revertir el optimista.
      setComentarios((prev) => prev.filter((c) => c.id !== temporal.id))
      setPublicacion((p) => (p ? { ...p, num_comentarios: Math.max(0, p.num_comentarios - 1) } : p))
      setNuevoComentario(cuerpo)
    } finally {
      setEnviando(false)
    }
  }

  const responder = async (parentId: number) => {
    if (!respuesta.trim() || enviando) return
    setEnviando(true)
    setEnvError(null)
    const cuerpo = respuesta.trim()
    // Optimista: la respuesta aparece en 0ms sin esperar al servidor.
    const temporal: Comentario = {
      id: -Date.now(),
      publicacion_id: publicacionId,
      autor_perfil_id: usuarioActual || "",
      autor_nombre: user?.nombre_completo || "Tú",
      parent_id: parentId,
      cuerpo,
      created_at: new Date().toISOString(),
      num_votos: 0,
      mi_voto: 0,
      es_solucion: false,
    }
    setComentarios((prev) => [...prev, temporal])
    setPublicacion((p) => (p ? { ...p, num_comentarios: p.num_comentarios + 1 } : p))
    setRespuesta("")
    setRespondiendoA(null)
    try {
      const creado = await foroService.crearComentario({
        publicacion_id: publicacionId,
        parent_id: parentId,
        cuerpo,
      })
      setComentarios((prev) => prev.map((c) => (c.id === temporal.id ? creado : c)))
    } catch (err: any) {
      setEnvError(err.message || "No se pudo responder.")
      // Revertir el optimista.
      setComentarios((prev) => prev.filter((c) => c.id !== temporal.id))
      setPublicacion((p) => (p ? { ...p, num_comentarios: Math.max(0, p.num_comentarios - 1) } : p))
      setRespuesta(cuerpo)
      setRespondiendoA(parentId)
    } finally {
      setEnviando(false)
    }
  }

  const raices = arbol.get(null) ?? []

  // Marca un comentario como la solución oficial del hilo (solo el autor).
  const marcarComentarioSolucion = async (comentarioId: number) => {
    if (usuarioActual !== publicacion?.autor_perfil_id) return
    try {
      await foroService.resolverHilo(publicacion!.id, { comentario_id: comentarioId })
      setComentarios((prev) => prev.map((c) => ({ ...c, es_solucion: c.id === comentarioId })))
      setPublicacion((p) => (p ? { ...p, estado: "resuelta" } : p))
    } catch (e: any) {
      setEnvError(e.message || "No se pudo marcar la solución.")
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090a12] text-white">
      {/* Atmósfera / orbes de luz */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-32 h-[420px] w-[420px] rounded-full bg-fuchsia-500/[0.045] blur-[120px]" />
        <div className="absolute -right-40 top-[38%] h-[500px] w-[500px] rounded-full bg-violet-500/[0.04] blur-[120px]" />
        <div className="absolute left-1/2 top-[-180px] h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-cyan-500/[0.025] blur-[120px]" />
      </div>

      {/* Grid ambiental muy sutil */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Cuerpo de la publicación */}
      <article className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] shadow-2xl shadow-black/30 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.12]">
        {/* Glow interno superior */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/40 to-transparent opacity-60"
        />
        <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">{publicacion.titulo}</h1>
          {publicacion.estado === "resuelta" && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resuelta
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-slate-400">
          <span className="font-medium text-slate-300">{publicacion.autor_nombre || "Estudiante"}</span>
          <BadgeModerador perfilId={publicacion.autor_perfil_id} />
          <span className="text-white/20">•</span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
            {formatearFecha(publicacion.created_at)}
          </span>
          <BotonDM
              autorPerfilId={publicacion.autor_perfil_id}
              autorNombre={publicacion.autor_nombre}
            />
        </div>

        {publicacion.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {publicacion.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2.5 py-1 text-[11px] font-medium text-fuchsia-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Cuerpo con Markdown (bloques de código con sintaxis incluidos) */}
        <div className="mt-4 max-w-3xl pt-2 text-[15px] leading-7 text-slate-200/90">
          <MarkdownRenderer content={publicacion.cuerpo} />
        </div>

        {/* Votos, vistas y guardado de la publicación */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-4">
          <div className="flex items-center gap-1">
            <VotoBotones
              numVotos={publicacion.num_votos}
              miVoto={publicacion.mi_voto}
              deshabilitado={votandoPub}
              onVotar={votarPublicacion}
            />
            <span className="ml-1 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-500">
              <Eye className="h-4 w-4" />
              <span className="tabular-nums">{publicacion.num_vistas}</span>
            </span>
          </div>
          <button
            type="button"
            aria-label={publicacion.guardado ? "Quitar de guardados" : "Guardar hilo"}
            aria-pressed={publicacion.guardado}
            onClick={() => {
              const previo = publicacion.guardado
              setPublicacion((p) => (p ? { ...p, guardado: !previo } : p))
              const accion = previo
                ? foroService.quitarGuardado(publicacion.id)
                : foroService.guardarPublicacion(publicacion.id)
              accion.catch(() =>
                setPublicacion((p) => (p ? { ...p, guardado: previo } : p)),
              )
            }}
            className={cn(
              "group/save inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-200 hover:bg-white/[0.05]",
              publicacion.guardado ? "text-violet-300" : "text-slate-400 hover:text-white",
            )}
          >
            <Bookmark
              className={cn(
                "h-4 w-4 transition-transform duration-200 group-hover/save:-translate-y-0.5",
                publicacion.guardado && "fill-violet-400",
              )}
            />
            {publicacion.guardado ? "Guardado" : "Guardar"}
          </button>
        </div>

        {/* Sugerencia IA del bot (solo si existe) */}
        {publicacion.sugerencia_ia && (
          <div className="mt-4">
            <SugerenciaIA
              publicacionId={publicacion.id}
              sugerencia={publicacion.sugerencia_ia}
              esAutor={usuarioActual === publicacion.autor_perfil_id}
              onAceptada={() =>
                setPublicacion((p) =>
                  p?.sugerencia_ia ? { ...p, estado: "resuelta", sugerencia_ia: { ...p.sugerencia_ia, aceptada: true } } : p,
                )
              }
            />
          </div>
        )}
        </div>
      </article>

      {/* Caja de respuesta */}
      <form
        onSubmit={enviarComentario}
        className="relative mt-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.018] p-4 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-5"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-violet-500/[0.06] blur-[80px]"
        />
        <div className="relative">
        {envError && (
          <p className="mb-2 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs text-red-300">
            {envError}
          </p>
        )}
        <textarea
          value={nuevoComentario}
          onChange={(e) => setNuevoComentario(e.target.value)}
          placeholder="Aporta tu respuesta a la comunidad..."
          rows={3}
          maxLength={20000}
          aria-label="Nuevo comentario"
          className="w-full resize-none rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3.5 text-sm leading-6 text-white outline-none transition-all duration-200 placeholder:text-slate-500 hover:border-white/[0.12] focus:border-violet-500/50 focus:bg-black/25 focus:ring-4 focus:ring-violet-500/10"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={!nuevoComentario.trim() || enviando}
            className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-900/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            )}
            Comentar
          </button>
        </div>
        </div>
      </form>

      {/* Lista de comentarios (árbol anidado, máx. 3 niveles) */}
      <section className="mt-9">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Comentarios
          </span>
          <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-slate-300">
            {comentarios.length}
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>
        {cargandoComentarios ? (
          <div className="h-24 animate-pulse rounded-2xl bg-white/[0.03]" />
        ) : raices.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.065] bg-white/[0.015] p-6 text-center text-sm text-white/35">
            Sin comentarios todavía. ¡Sé el primero en responder!
          </p>
        ) : (
          <div className="space-y-3">
            {raices.map((comentario) => (
              <ComentarioNodo
                key={comentario.id}
                comentario={comentario}
                arbol={arbol}
                profundidad={0}
                esAutor={usuarioActual === publicacion.autor_perfil_id}
                respondiendoA={respondiendoA}
                respuesta={respuesta}
                setRespuesta={setRespuesta}
                enviando={enviando}
                onResponder={(id) => setRespondiendoA(id)}
                onCancelar={() => setRespondiendoA(null)}
                onEnviar={responder}
                onVotar={votarComentario}
                onResolver={marcarComentarioSolucion}
              />
            ))}
          </div>
        )}
      </section>
      </div>
    </main>
  )
}

/** Render recursivo de un comentario y sus respuestas (máx. PROFUNDIDAD_MAX). */
function ComentarioNodo({
  comentario,
  arbol,
  profundidad,
  esAutor,
  respondiendoA,
  respuesta,
  setRespuesta,
  enviando,
  onResponder,
  onCancelar,
  onEnviar,
  onVotar,
  onResolver,
}: {
  comentario: Comentario
  arbol: Map<number | null, Comentario[]>
  profundidad: number
  esAutor: boolean
  respondiendoA: number | null
  respuesta: string
  setRespuesta: (v: string) => void
  enviando: boolean
  onResponder: (id: number) => void
  onCancelar: () => void
  onEnviar: (parentId: number) => void
  onVotar: (comentario: Comentario, valor: 1 | -1) => void
  onResolver: (comentarioId: number) => void
}) {
  const hijos = (arbol.get(comentario.id) ?? []).slice(0, PROFUNDIDAD_MAX === profundidad ? 0 : Infinity)
  const puedeAnidar = profundidad < PROFUNDIDAD_MAX - 1

  return (
    <div className={cn(profundidad > 0 && "ml-6")}>
      <div className="group/comment relative overflow-hidden rounded-2xl border border-white/[0.065] bg-white/[0.015] p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.10] hover:bg-white/[0.02]">
        {/* Línea luminosa al hover */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent opacity-0 transition-opacity duration-300 group-hover/comment:opacity-100"
        />

        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
          <span className="font-semibold text-slate-200">{comentario.autor_nombre || "Estudiante"}</span>
          <BadgeModerador perfilId={comentario.autor_perfil_id} />
          <span className="text-white/20">•</span>
          <span className="text-slate-500">{formatearFecha(comentario.created_at)}</span>
          <BotonDM
            autorPerfilId={comentario.autor_perfil_id}
            autorNombre={comentario.autor_nombre}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-200/90 whitespace-pre-wrap">{comentario.cuerpo}</p>

        <div className="mt-4 flex items-center gap-1">
          <VotoBotones
            numVotos={comentario.num_votos}
            miVoto={comentario.mi_voto}
            onVotar={(valor) => onVotar(comentario, valor)}
          />
          {puedeAnidar && (
            <button
              type="button"
              onClick={() => onResponder(comentario.id)}
              className="ml-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition-all hover:bg-fuchsia-500/10 hover:text-fuchsia-300"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Responder
            </button>
          )}
          {comentario.es_solucion && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              Solución
            </span>
          )}
          {esAutor && !comentario.es_solucion && (
            <button
              type="button"
              onClick={() => onResolver(comentario.id)}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400/90 transition-colors hover:text-emerald-300"
            >
              <CheckCircle2 className="h-3 w-3" />
              Esta respuesta resuelve mi duda
            </button>
          )}
        </div>

        {respondiendoA === comentario.id && (
          <RespuestaForm
            respuesta={respuesta}
            setRespuesta={setRespuesta}
            enviando={enviando}
            onCancelar={onCancelar}
            onEnviar={() => onEnviar(comentario.id)}
          />
        )}
      </div>

      {hijos.length > 0 && (
        <div className="mt-2 space-y-2">
          {hijos.map((hijo) => (
            <ComentarioNodo
              key={hijo.id}
              comentario={hijo}
              arbol={arbol}
              profundidad={profundidad + 1}
              respondiendoA={respondiendoA}
              respuesta={respuesta}
              setRespuesta={setRespuesta}
              enviando={enviando}
              esAutor={esAutor}
              onResponder={onResponder}
              onCancelar={onCancelar}
              onEnviar={onEnviar}
              onVotar={onVotar}
              onResolver={onResolver}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Botones up/down con el acumulado y el voto vigente del usuario. */
function VotoBotones({
  numVotos,
  miVoto,
  deshabilitado = false,
  onVotar,
}: {
  numVotos: number
  miVoto: number
  deshabilitado?: boolean
  onVotar: (valor: 1 | -1) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onVotar(1)}
        disabled={deshabilitado}
        aria-label="Votar a favor"
        aria-pressed={miVoto === 1}
        className={cn(
          "group/action inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition-all duration-200",
          miVoto === 1
            ? "text-emerald-400"
            : "text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400",
        )}
      >
        <ArrowBigUp
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200 group-hover/action:-translate-y-0.5",
            miVoto === 1 && "fill-emerald-400",
          )}
        />
      </button>
      <span
        className={cn(
          "min-w-[1.5rem] text-center text-xs font-semibold tabular-nums",
          miVoto === 1 && "text-emerald-400",
          miVoto === -1 && "text-rose-400",
          miVoto === 0 && "text-slate-400",
        )}
      >
        {numVotos}
      </span>
      <button
        type="button"
        onClick={() => onVotar(-1)}
        disabled={deshabilitado}
        aria-label="Votar en contra"
        aria-pressed={miVoto === -1}
        className={cn(
          "rounded-xl p-1.5 transition-all duration-200",
          miVoto === -1
            ? "text-rose-400"
            : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-300",
        )}
      >
        <ArrowBigDown className={cn("h-3.5 w-3.5", miVoto === -1 && "fill-rose-400")} />
      </button>
    </div>
  )
}

function RespuestaForm({
  respuesta,
  setRespuesta,
  enviando,
  onCancelar,
  onEnviar,
}: {
  respuesta: string
  setRespuesta: (v: string) => void
  enviando: boolean
  onCancelar: () => void
  onEnviar: () => void
}) {
  return (
    <div className="mt-3 flex gap-2">
      <input
        value={respuesta}
        onChange={(e) => setRespuesta(e.target.value)}
        placeholder="Escribe tu respuesta…"
        maxLength={20000}
        aria-label="Respuesta"
        className={cn(
          "flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white",
          "placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10",
        )}
      />
      <Button size="sm" onClick={onEnviar} disabled={!respuesta.trim() || enviando}>
        {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Enviar"}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancelar} type="button">
        Cancelar
      </Button>
    </div>
  )
}

function formatearFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}