"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowBigDown, ArrowBigUp, CalendarDays, CheckCircle2, Loader2, MessageSquare, Send } from "lucide-react"
import { foroService } from "@/lib/foro-service"
import type { Comentario, Publicacion } from "@/types/foro"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  const { user } = useAuth()
  const usuarioActual = user?.id || user?.estudiante?.id || (user as any)?.perfil_id
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
    <div className="space-y-6">
      {/* Cuerpo de la publicación */}
      <article className="rounded-2xl border border-border bg-card p-6">
        <h1 className="font-poppins font-semibold text-xl text-foreground">{publicacion.titulo}</h1>
        <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
          <span>{publicacion.autor_nombre || "Estudiante"}</span>
          <BadgeModerador perfilId={publicacion.autor_perfil_id} />
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {formatearFecha(publicacion.created_at)}
          </span>
          <BotonDM autorPerfilId={publicacion.autor_perfil_id} />
        </div>

        {publicacion.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {publicacion.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] font-normal bg-secondary/60 text-muted-foreground border-border/60">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mt-4">
          {publicacion.cuerpo}
        </p>

        {/* Votos de la publicación */}
        <div className="flex items-center gap-1 mt-4 pt-4 border-t border-border/60">
          <VotoBotones
            numVotos={publicacion.num_votos}
            miVoto={publicacion.mi_voto}
            deshabilitado={votandoPub}
            onVotar={votarPublicacion}
          />
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
      </article>

      {/* Formulario de comentario */}
      <form onSubmit={enviarComentario} className="rounded-2xl border border-border bg-card p-4">
        {envError && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-2">
            {envError}
          </p>
        )}
        <textarea
          value={nuevoComentario}
          onChange={(e) => setNuevoComentario(e.target.value)}
          placeholder="Aporta tu respuesta a la comunidad…"
          rows={3}
          maxLength={20000}
          aria-label="Nuevo comentario"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
        />
        <div className="flex justify-end mt-2">
          <Button type="submit" disabled={!nuevoComentario.trim() || enviando} className="gap-1.5">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Comentar
          </Button>
        </div>
      </form>

      {/* Lista de comentarios (árbol anidado, máx. 3 niveles) */}
      <section>
        <h2 className="font-poppins font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          Comentarios ({comentarios.length})
        </h2>
        {cargandoComentarios ? (
          <div className="h-24 rounded-2xl bg-muted animate-pulse" />
        ) : raices.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-card border border-border rounded-2xl p-6 text-center">
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
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
          <span className="font-medium text-foreground">{comentario.autor_nombre || "Estudiante"}</span>
          <BadgeModerador perfilId={comentario.autor_perfil_id} />
          <span>•</span>
          <span>{formatearFecha(comentario.created_at)}</span>
          <BotonDM autorPerfilId={comentario.autor_perfil_id} />
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{comentario.cuerpo}</p>

        <div className="flex items-center gap-3 mt-2">
          <VotoBotones
            numVotos={comentario.num_votos}
            miVoto={comentario.mi_voto}
            onVotar={(valor) => onVotar(comentario, valor)}
          />
          {puedeAnidar && (
            <button
              onClick={() => onResponder(comentario.id)}
              className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Responder
            </button>
          )}
          {comentario.es_solucion && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-lg">
              <CheckCircle2 className="w-3 h-3" />
              Solución
            </span>
          )}
          {esAutor && !comentario.es_solucion && (
            <button
              onClick={() => onResolver(comentario.id)}
              className="text-[11px] font-medium text-emerald-400 hover:underline inline-flex items-center gap-1 ml-auto"
            >
              <CheckCircle2 className="w-3 h-3" />
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
        onClick={() => onVotar(1)}
        disabled={deshabilitado}
        aria-label="Votar a favor"
        aria-pressed={miVoto === 1}
        className={cn(
          "p-1 rounded-md transition-colors",
          miVoto === 1
            ? "text-emerald-400 bg-emerald-950/60"
            : "text-muted-foreground hover:text-emerald-400 hover:bg-secondary",
        )}
      >
        <ArrowBigUp className={cn("w-4 h-4", miVoto === 1 && "fill-emerald-400")} />
      </button>
      <span className="text-xs font-semibold tabular-nums min-w-[1.5rem] text-center">{numVotos}</span>
      <button
        onClick={() => onVotar(-1)}
        disabled={deshabilitado}
        aria-label="Votar en contra"
        aria-pressed={miVoto === -1}
        className={cn(
          "p-1 rounded-md transition-colors",
          miVoto === -1
            ? "text-rose-400 bg-rose-950/60"
            : "text-muted-foreground hover:text-rose-400 hover:bg-secondary",
        )}
      >
        <ArrowBigDown className={cn("w-4 h-4", miVoto === -1 && "fill-rose-400")} />
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
          "flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary/40",
        )}
      />
      <Button size="sm" onClick={onEnviar} disabled={!respuesta.trim() || enviando}>
        {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Enviar"}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancelar}>
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