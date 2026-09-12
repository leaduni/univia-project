// Sugerencias y reportes al equipo (Fase 1): formulario multicriterio + historial
"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, ChevronRight, Loader2, MessageSquarePlus, Send } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { mensajeAmigableError } from "@/lib/api-service"
import {
  feedbackTicketsService,
  type CategoriaFeedback,
  type EstadoFeedback,
  type FiltrosTickets,
  type PrioridadFeedback,
  type TicketFeedback,
} from "@/lib/feedbackTicketsAdapter"
import { TicketDetailSheet } from "./ticket-detail-sheet"

const CATEGORIAS: Record<CategoriaFeedback, string> = {
  funcion: "Sugerencia de función",
  bug: "Error / Bug",
  respuesta_chatbot: "Mejora en respuestas del Chatbot",
  ui_ux: "UI / UX",
}

const ESTADOS_FILTRO: (EstadoFeedback | "todos")[] = [
  "todos",
  "recibido",
  "en_revision",
  "planeado",
  "resuelto",
  "descartado",
]

const LABEL_ESTADO: Record<EstadoFeedback, string> = {
  recibido: "Recibido",
  en_revision: "En revisión",
  planeado: "Planeado",
  resuelto: "Resuelto",
  descartado: "Descartado",
}

function varianteEstado(
  estado: EstadoFeedback,
): "default" | "in-progress" | "available" | "completed" | "locked" {
  switch (estado) {
    case "en_revision":
      return "in-progress"
    case "planeado":
      return "available"
    case "resuelto":
      return "completed"
    case "descartado":
      return "locked"
    default:
      return "default"
  }
}

function variantePrioridad(
  prioridad: PrioridadFeedback,
): "easy" | "medium" | "hard" | "destructive" {
  switch (prioridad) {
    case "baja":
      return "easy"
    case "alta":
      return "hard"
    case "critica":
      return "destructive"
    default:
      return "medium"
  }
}

function formatearFecha(iso: string | null): string {
  if (!iso) return ""
  try {
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function FeedbackPanel() {
  const [categoria, setCategoria] = useState<CategoriaFeedback>("funcion")
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [errorForm, setErrorForm] = useState("")

  const [tickets, setTickets] = useState<TicketFeedback[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorLista, setErrorLista] = useState("")

  const [filtroEstado, setFiltroEstado] = useState<EstadoFeedback | "todos">("todos")
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaFeedback | "todos">("todos")
  const [esDev, setEsDev] = useState(false)

  const [ticketSeleccionado, setTicketSeleccionado] = useState<TicketFeedback | null>(null)
  const [detalleAbierto, setDetalleAbierto] = useState(false)

  const cargarTickets = useCallback(async () => {
    const filtros: FiltrosTickets = {
      estado: filtroEstado,
      categoria: filtroCategoria,
    }
    try {
      const data = await feedbackTicketsService.listarFiltrados(filtros)
      setTickets(data)
      setErrorLista("")
    } catch (err) {
      setErrorLista(mensajeAmigableError(err))
    } finally {
      setCargando(false)
    }
  }, [filtroEstado, filtroCategoria])

  useEffect(() => {
    cargarTickets()
  }, [cargarTickets])

  useEffect(() => {
    let activo = true
    feedbackTicketsService
      .esDev()
      .then((value) => {
        if (activo) setEsDev(value)
      })
      .catch(() => {
        if (activo) setEsDev(false)
      })
    return () => {
      activo = false
    }
  }, [])

  async function enviar(event: React.FormEvent) {
    event.preventDefault()
    setEnviando(true)
    setErrorForm("")
    try {
      await feedbackTicketsService.crear({
        categoria,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
      })
      toast.success("Sugerencia enviada. El equipo la revisará pronto.")
      setCategoria("funcion")
      setTitulo("")
      setDescripcion("")
      cargarTickets()
      setCategoria("funcion")
    } catch (err) {
      const msg = mensajeAmigableError(err)
      setErrorForm(msg)
      toast.error(msg)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Sugerencias y reportes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuéntanos qué mejorar, qué falla o qué te gustaría ver en UniVia. Tu
          reporte llega directo al equipo de desarrollo.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-foreground">
          <MessageSquarePlus className="h-5 w-5 text-accent" />
          Nuevo reporte
        </h2>

        <form onSubmit={enviar} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tipo
            </label>
            <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaFeedback)}>
              <SelectTrigger className="mt-2 w-full">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORIAS) as CategoriaFeedback[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {CATEGORIAS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Título
            </label>
            <input
              required
              maxLength={120}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumen breve del reporte"
              className="mt-2 w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.10] rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7957f1] focus:ring-[#7957f1]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Descripción
            </label>
            <textarea
              required
              rows={4}
              maxLength={4000}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Cuéntanos qué ocurrió, qué esperabas y qué pasos reprodujeron el problema."
              className="mt-2 w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.10] rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7957f1] focus:ring-[#7957f1]/50 resize-y"
            />
          </div>

          {errorForm && (
            <p role="alert" className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorForm}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="brand" disabled={enviando}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar sugerencia
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-heading text-base font-bold text-foreground">Tus reportes</h2>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as EstadoFeedback | "todos")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_FILTRO.map((e) => (
                <SelectItem key={e} value={e}>
                  {e === "todos" ? "Todos los estados" : LABEL_ESTADO[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filtroCategoria}
            onValueChange={(v) => setFiltroCategoria(v as CategoriaFeedback | "todos")}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las categorías</SelectItem>
              {(Object.keys(CATEGORIAS) as CategoriaFeedback[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORIAS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {cargando ? (
          <div className="mt-4 space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 w-full rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : errorLista ? (
          <p role="alert" className="mt-4 flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorLista}
          </p>
        ) : tickets.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aún no has enviado sugerencias. ¡Anímate a dejar la primera!
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {tickets.map((t) => (
              <li
                key={t.id}
                onClick={() => {
                  setTicketSeleccionado(t)
                  setDetalleAbierto(true)
                }}
                className="group cursor-pointer rounded-xl border border-border bg-background/60 p-4 transition-colors hover:border-[#7957f1]/40 hover:bg-[#7957f1]/5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">#{t.id}</Badge>
                  <Badge variant={varianteEstado(t.estado)}>{LABEL_ESTADO[t.estado]}</Badge>
                  <Badge variant={variantePrioridad(t.prioridad)}>{t.prioridad}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatearFecha(t.creado_en)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {CATEGORIAS[t.categoria]}: {t.titulo}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.descripcion}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TicketDetailSheet
        abierto={detalleAbierto}
        onOpenChange={(abierto) => {
          setDetalleAbierto(abierto)
          if (!abierto) cargarTickets()
        }}
        ticket={ticketSeleccionado}
        esDev={esDev}
      />
    </div>
  )
}