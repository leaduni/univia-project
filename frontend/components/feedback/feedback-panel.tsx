// Sugerencias y reportes al equipo (Fase 1): formulario multicriterio + historial
"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

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
import { LABEL_ESTADO } from "@/lib/feedback-ui"

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

const ESTILO_PRIORIDAD: Record<PrioridadFeedback, string> = {
  baja: "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300",
  media: "border-amber-400/15 bg-amber-400/[0.08] text-amber-300",
  alta: "border-orange-400/15 bg-orange-400/[0.08] text-orange-300",
  critica: "border-red-400/15 bg-red-400/[0.08] text-red-300",
}

const ESTILO_ESTADO_DOT: Record<EstadoFeedback, string> = {
  recibido: "bg-sky-400 shadow-[0_0_7px_rgba(56,189,248,0.7)]",
  en_revision: "bg-amber-400 shadow-[0_0_7px_rgba(251,191,36,0.7)]",
  planeado: "bg-violet-400 shadow-[0_0_7px_rgba(167,139,250,0.7)]",
  resuelto: "bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.7)]",
  descartado: "bg-zinc-400",
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

function FlechaDesplegable() {
  return (
    <svg
      className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
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

  function abrirTicket(ticket: TicketFeedback) {
    setTicketSeleccionado(ticket)
    setDetalleAbierto(true)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090a12] text-white">
      {/* =========================================================
          ATMÓSFERA / BACKGROUND
      ========================================================== */}

      {/* Orbes de luz */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-fuchsia-600/10 blur-[120px]" />
        <div className="absolute right-[-180px] top-[15%] h-[520px] w-[520px] rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute bottom-[-300px] left-[35%] h-[600px] w-[600px] rounded-full bg-purple-700/[0.07] blur-[150px]" />
      </div>

      {/* Grid sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#090a12_85%)]" />

      {/* =========================================================
          CONTENT
      ========================================================== */}

      <div className="relative mx-auto w-full max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">

        {/* Header */}
        <header className="mb-8 max-w-3xl lg:mb-10">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_12px_rgba(232,121,249,0.8)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300/80">
              Feedback
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-[42px]">
            Sugerencias y reportes
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45 sm:text-[15px]">
            Cuéntanos qué mejorar, qué falla o qué te gustaría ver en UniVia.
            Tu reporte llega directamente al equipo de desarrollo.
          </p>
        </header>

        {/* =======================================================
            BENTO LAYOUT
        ======================================================== */}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">

          {/* =====================================================
              LEFT — NUEVO REPORTE
          ====================================================== */}

          <section className="group relative lg:col-span-5">
            {/* Glow exterior */}
            <div className="pointer-events-none absolute -inset-px rounded-[24px] bg-gradient-to-br from-fuchsia-500/20 via-transparent to-violet-500/10 opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-6 lg:p-7">

              {/* Highlight superior */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/30 to-transparent" />

              {/* Header card */}
              <div className="mb-7 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/[0.08] text-fuchsia-300">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 3.5a2.121 2.121 0 013 3L8 18l-4 1 1-4L16.5 3.5z"
                    />
                  </svg>
                </div>

                <div>
                  <h2 className="text-base font-semibold tracking-[-0.02em] text-white">
                    Nuevo reporte
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-white/35">
                    Ayúdanos a mejorar la experiencia de aprendizaje.
                  </p>
                </div>
              </div>

              <form onSubmit={enviar} className="space-y-5">

                {/* Tipo */}
                <div>
                  <label
                    htmlFor="report-type"
                    className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40"
                  >
                    Tipo
                  </label>

                  <div className="relative">
                    <select
                      id="report-type"
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value as CategoriaFeedback)}
                      className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all duration-200 hover:border-white/[0.14] focus:border-fuchsia-400/30 focus:ring-4 focus:ring-fuchsia-500/10 [&>option]:bg-zinc-900"
                    >
                      {(Object.keys(CATEGORIAS) as CategoriaFeedback[]).map((key) => (
                        <option key={key} value={key}>
                          {CATEGORIAS[key]}
                        </option>
                      ))}
                    </select>

                    <svg
                      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>

                {/* Título */}
                <div>
                  <label
                    htmlFor="report-title"
                    className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40"
                  >
                    Título
                  </label>

                  <input
                    id="report-title"
                    type="text"
                    required
                    maxLength={120}
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Resumen breve del reporte"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-200 hover:border-white/[0.14] focus:border-fuchsia-400/30 focus:ring-4 focus:ring-fuchsia-500/10"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label
                    htmlFor="report-description"
                    className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40"
                  >
                    Descripción
                  </label>

                  <textarea
                    id="report-description"
                    required
                    rows={7}
                    maxLength={4000}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Cuéntanos qué ocurrió, qué esperabas y qué pasos reprodujeron el problema."
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white placeholder:text-white/25 outline-none transition-all duration-200 hover:border-white/[0.14] focus:border-fuchsia-400/30 focus:ring-4 focus:ring-fuchsia-500/10"
                  />
                </div>

                {errorForm && (
                  <p role="alert" className="flex items-center gap-2 text-xs text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errorForm}
                  </p>
                )}

                {/* Footer formulario */}
                <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-5">
                  <span className="hidden text-xs text-white/25 sm:block">
                    Tu feedback nos ayuda a mejorar UniVia.
                  </span>

                  <button
                    type="submit"
                    disabled={enviando}
                    className="group/button ml-auto inline-flex items-center gap-2 rounded-xl border border-fuchsia-300/20 bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(168,85,247,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-fuchsia-300/40 hover:shadow-[0_14px_40px_rgba(168,85,247,0.30)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enviando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg
                        className="h-4 w-4 transition-transform duration-200 group-hover/button:translate-x-0.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M22 2l-7 20-4-9-9-4 20-7z"
                        />
                      </svg>
                    )}

                    Enviar sugerencia
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* =====================================================
              RIGHT — REPORTES
          ====================================================== */}

          <section className="group relative lg:col-span-7">
            <div className="pointer-events-none absolute -inset-px rounded-[24px] bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-6">

              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Header + filtros */}
              <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold tracking-[-0.02em] text-white">
                      Tus reportes
                    </h2>

                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/40">
                      {tickets.length}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-white/30">
                    Historial de tus sugerencias y reportes.
                  </p>
                </div>

                {/* Filtros */}
                <div className="flex gap-2">
                  <div className="relative">
                    <select
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value as EstadoFeedback | "todos")}
                      className="h-9 appearance-none rounded-lg border border-white/[0.08] bg-white/[0.03] py-0 pl-3 pr-8 text-xs text-white/60 outline-none transition hover:border-white/[0.14] focus:border-fuchsia-400/30 focus:ring-2 focus:ring-fuchsia-500/10 [&>option]:bg-zinc-900"
                    >
                      {ESTADOS_FILTRO.map((e) => (
                        <option key={e} value={e}>
                          {e === "todos" ? "Todos los estados" : LABEL_ESTADO[e]}
                        </option>
                      ))}
                    </select>

                    <FlechaDesplegable />
                  </div>

                  <div className="relative">
                    <select
                      value={filtroCategoria}
                      onChange={(e) => setFiltroCategoria(e.target.value as CategoriaFeedback | "todos")}
                      className="h-9 appearance-none rounded-lg border border-white/[0.08] bg-white/[0.03] py-0 pl-3 pr-8 text-xs text-white/60 outline-none transition hover:border-white/[0.14] focus:border-fuchsia-400/30 focus:ring-2 focus:ring-fuchsia-500/10 [&>option]:bg-zinc-900"
                    >
                      <option value="todos">Todas las categorías</option>
                      {(Object.keys(CATEGORIAS) as CategoriaFeedback[]).map((c) => (
                        <option key={c} value={c}>
                          {CATEGORIAS[c]}
                        </option>
                      ))}
                    </select>

                    <FlechaDesplegable />
                  </div>
                </div>
              </div>

              {/* =================================================
                  LISTA
              ================================================== */}

              <div className="space-y-2.5">

                {cargando ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-white/[0.04]" />
                    ))}
                  </div>
                ) : errorLista ? (
                  <p role="alert" className="flex items-center gap-2 rounded-2xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-xs text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errorLista}
                  </p>
                ) : (
                  tickets.map((t) => (
                    <article
                      key={t.id}
                      className="group/report relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-[1px] hover:border-white/[0.12] hover:bg-white/[0.035] sm:p-5"
                    >
                      {/* Línea luminosa al hover */}
                      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-fuchsia-400/50 to-transparent opacity-0 transition-opacity group-hover/report:opacity-100" />

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0 flex-1">

                          {/* Badges */}
                          <div className="mb-3 flex flex-wrap items-center gap-1.5">

                            {/* Estado */}
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/70">
                              <span className={`h-1.5 w-1.5 rounded-full ${ESTILO_ESTADO_DOT[t.estado]}`} />
                              {LABEL_ESTADO[t.estado]}
                            </span>

                            {/* Prioridad */}
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium capitalize ${ESTILO_PRIORIDAD[t.prioridad]}`}>
                              {t.prioridad}
                            </span>

                            {/* Categoría */}
                            <span className="inline-flex items-center rounded-full border border-fuchsia-400/15 bg-fuchsia-400/[0.08] px-2.5 py-1 text-[10px] font-medium text-fuchsia-300">
                              {CATEGORIAS[t.categoria]}
                            </span>
                          </div>

                          {/* Título */}
                          <h3 className="truncate text-sm font-medium text-white/85 transition-colors group-hover/report:text-white">
                            {t.titulo}
                          </h3>

                          {/* Meta */}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/25">
                            <span>#{t.id}</span>

                            <span className="h-1 w-1 rounded-full bg-white/15" />

                            <span>{formatearFecha(t.creado_en)}</span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <button
                          type="button"
                          onClick={() => abrirTicket(t)}
                          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/25 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white/70"
                          aria-label="Ver reporte"
                        >
                          <svg
                            className="h-4 w-4 transition-transform duration-200 group-hover/report:translate-x-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>

                      </div>
                    </article>
                  ))
                )}

                {/* Empty state */}
                {!cargando && !errorLista && tickets.length === 0 && (
                  <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-6 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-white/25">
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 8h10M7 12h6m-6 8h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>

                    <p className="text-sm font-medium text-white/55">
                      No hay reportes para mostrar
                    </p>

                    <p className="mt-1 max-w-xs text-xs leading-5 text-white/25">
                      Cuando envíes una sugerencia o reporte aparecerá aquí.
                    </p>
                  </div>
                )}

              </div>
            </div>
          </section>

        </div>
      </div>

      <TicketDetailSheet
        abierto={detalleAbierto}
        onOpenChange={(abierto) => {
          setDetalleAbierto(abierto)
          if (!abierto) cargarTickets()
        }}
        ticket={ticketSeleccionado}
        esDev={esDev}
      />
    </main>
  )
}
