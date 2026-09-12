// Detalle de un ticket en un panel lateral (Sheet): estado, hilo y adjuntos.
"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Crown, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { mensajeAmigableError } from "@/lib/api-service"
import { picoCache } from "@/lib/api-cache"
import {
  claveDetalleFeedback,
  feedbackTicketsService,
  type AdjuntoFeedback,
  type EstadoFeedback,
  type TicketFeedback,
  type TicketFeedbackDetalle,
} from "@/lib/feedbackTicketsAdapter"
import { FeedbackMensajeForm } from "./feedback-mensaje-form"

const LABEL_ESTADO: Record<EstadoFeedback, string> = {
  recibido: "Recibido",
  en_revision: "En revisión",
  planeado: "Planeado",
  resuelto: "Resuelto",
  descartado: "Descartado",
}

const ESTADOS_ORDEN: EstadoFeedback[] = [
  "recibido",
  "en_revision",
  "planeado",
  "resuelto",
  "descartado",
]

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

function esImagen(tipo: string): boolean {
  return tipo.startsWith("image/")
}

interface TicketDetailSheetProps {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  ticket: TicketFeedback | null
  esDev: boolean
}

export function TicketDetailSheet({ abierto, onOpenChange, ticket, esDev }: TicketDetailSheetProps) {
  const [detalle, setDetalle] = useState<TicketFeedbackDetalle | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")
  const [enviando, setEnviando] = useState(false)

  const cargarDetalle = useCallback(async () => {
    if (!ticket) return
    setCargando(true)
    try {
      const data = await feedbackTicketsService.obtener(ticket.id)
      setDetalle(data)
      setError("")
    } catch (err) {
      setError(mensajeAmigableError(err))
    } finally {
      setCargando(false)
    }
  }, [ticket])

  useEffect(() => {
    setDetalle(null)
    setError("")
    if (abierto && ticket) {
      // Dibuja el detalle cacheado en el primer frame (0ms) y revalida en
      // segundo plano: apertura del Sheet sin parpadeos.
      const previo = picoCache<TicketFeedbackDetalle>(claveDetalleFeedback(ticket.id))
      if (previo) setDetalle(previo)
      void cargarDetalle()
    }
  }, [abierto, ticket, cargarDetalle])

  async function cambiarEstado(estado: EstadoFeedback) {
    if (!ticket) return
    try {
      const actualizado = await feedbackTicketsService.cambiarEstado(ticket.id, estado)
      setDetalle((prev) => (prev ? { ...prev, estado: actualizado.estado } : prev))
      toast.success(`Estado actualizado a "${LABEL_ESTADO[actualizado.estado]}".`)
    } catch (err) {
      toast.error(mensajeAmigableError(err))
    }
  }

  async function enviarMensaje(contenido: string, archivo?: File) {
    if (!ticket) return
    setEnviando(true)
    setError("")
    try {
      if (contenido.trim()) {
        await feedbackTicketsService.agregarMensaje(ticket.id, contenido)
      }
      if (archivo) {
        await feedbackTicketsService.subirAdjunto(ticket.id, archivo)
      }
      toast.success("Respuesta enviada. El equipo la verá pronto.")
      await cargarDetalle()
    } catch (err) {
      const msg = mensajeAmigableError(err)
      setError(msg)
      toast.error(msg)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{ticket ? `Ticket #${ticket.id}` : "Detalle del ticket"}</SheetTitle>
          <SheetDescription>
            Conversación con el equipo de desarrollo de UniVia.
          </SheetDescription>
        </SheetHeader>

        {!ticket ? null : cargando && !detalle ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 w-full rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : error && !detalle ? (
          <p role="alert" className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        ) : detalle ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">#{detalle.id}</Badge>
              <Badge variant="in-progress">{LABEL_ESTADO[detalle.estado]}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatearFecha(detalle.creado_en)}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">{detalle.titulo}</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {detalle.descripcion}
              </p>
            </div>

            {esDev && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Estado
                </span>
                <Select
                  value={detalle.estado}
                  onValueChange={(v) => void cambiarEstado(v as EstadoFeedback)}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_ORDEN.map((e) => (
                      <SelectItem key={e} value={e}>
                        {LABEL_ESTADO[e]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Conversación
              </h3>
              {detalle.mensajes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay respuestas en este hilo.
                </p>
              ) : (
                <ul className="space-y-3">
                  {detalle.mensajes.map((m) => (
                    <li
                      key={m.id}
                      className={cn(
                        "max-w-[85%] rounded-xl border px-3 py-2 text-sm",
                        m.autor_rol === "dev"
                          ? "ml-auto border-[#7957f1]/30 bg-[#7957f1]/10"
                          : "border-border bg-background/60",
                      )}
                    >
                      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {m.autor_rol === "dev" && <Crown className="h-3 w-3 text-[#7957f1]" />}
                        <span className="font-medium">
                          {m.autor_rol === "dev" ? "Equipo de desarrollo" : "Tú"}
                        </span>
                        <span aria-hidden>·</span>
                        <span>{formatearFecha(m.creado_en)}</span>
                      </div>
                      <p className="whitespace-pre-line text-foreground">{m.contenido}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {detalle.adjuntos.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Adjuntos
                </h3>
                <div className="flex flex-wrap gap-2">
                  {detalle.adjuntos.map((a: AdjuntoFeedback) =>
                    esImagen(a.tipo_mime) && a.url_firmada ? (
                      <a
                        key={a.id}
                        href={a.url_firmada}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-xl border border-border"
                      >
                        <img
                          src={a.url_firmada}
                          alt={a.nombre_original}
                          className="h-24 w-24 object-cover"
                        />
                      </a>
                    ) : (
                      <a
                        key={a.id}
                        href={a.url_firmada ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="max-w-[10rem] truncate">{a.nombre_original}</span>
                      </a>
                    ),
                  )}
                </div>
              </section>
            )}

            <section className="rounded-xl border border-border bg-background/60 p-3">
              {enviando && (
                <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Enviando…
                </p>
              )}
              <FeedbackMensajeForm enviando={enviando} error={error} onEnviar={enviarMensaje} />
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}