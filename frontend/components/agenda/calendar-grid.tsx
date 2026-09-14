"use client"

// calendar-grid.tsx — Grid del calendario con click-to-create, línea de tiempo,
// vistas Día/Semana/Mes y bloques de eventos tipo Google Calendar

import { useState, useEffect, useRef, useCallback } from "react"
import { Clock } from "lucide-react"

// ─── Tipos públicos exportados ────────────────────────────────────────────────

export type EventoTipo = "clase" | "examen" | "deporte" | "estudio-ia"
export type CalendarioVista = "Día" | "Semana" | "Mes" | "Agenda"

export interface CalendarioEvento {
  id: string
  titulo: string
  subtitulo?: string
  tipo: EventoTipo
  dia: number        // 0 = Lunes … 6 = Domingo
  horaInicio: number // horas desde HORA_INI (ej. 0 = 08:00, 2.5 = 10:30)
  duracion: number   // en horas
}

export interface OpenModalParams {
  dia: number
  horaInicio: number
  fecha: Date
}

interface CalendarioGridProps {
  vista: CalendarioVista
  eventos: CalendarioEvento[]
  filtros: Record<EventoTipo, boolean>
  fechasSemana: Date[]
  hoyDia: number             // 0=Lun … 6=Dom relativo a la semana visible
  offsetSemana: number
  onOpenModal: (params: OpenModalParams) => void
  onEventClick: (evento: CalendarioEvento) => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const HORA_INI = 8
const HORA_FIN = 22
const TOTAL_H = HORA_FIN - HORA_INI
const PX_POR_HORA = 68   // píxeles por hora en el eje Y
const SLOT_MIN = 30      // granularidad de click en minutos
const SLOTS_POR_HORA = 60 / SLOT_MIN

// ─── Paleta de estilos por tipo ───────────────────────────────────────────────

export const EVENTO_ESTILO: Record<EventoTipo, {
  bg: string; bgHover: string; border: string; text: string
  sub: string; dot: string; badge: string; glow: string
}> = {
  "clase": {
    bg: "bg-indigo-500/[0.18]",
    bgHover: "hover:bg-indigo-500/30 hover:brightness-110",
    border: "border-l-[3px] border-l-indigo-400 border-t border-r border-b border-indigo-400/20",
    text: "text-indigo-100",
    sub: "text-indigo-300/80",
    dot: "#818cf8",
    badge: "bg-indigo-500/30 text-indigo-200",
    glow: "shadow-[0_2px_12px_rgba(99,102,241,0.2)]",
  },
  "examen": {
    bg: "bg-rose-500/[0.18]",
    bgHover: "hover:bg-rose-500/30 hover:brightness-110",
    border: "border-l-[3px] border-l-rose-400 border-t border-r border-b border-rose-400/20",
    text: "text-rose-100",
    sub: "text-rose-300/80",
    dot: "#fb7185",
    badge: "bg-rose-500/30 text-rose-200",
    glow: "shadow-[0_2px_12px_rgba(244,63,94,0.2)]",
  },
  "deporte": {
    bg: "bg-emerald-500/[0.18]",
    bgHover: "hover:bg-emerald-500/30 hover:brightness-110",
    border: "border-l-[3px] border-l-emerald-400 border-t border-r border-b border-emerald-400/20",
    text: "text-emerald-100",
    sub: "text-emerald-300/80",
    dot: "#34d399",
    badge: "bg-emerald-500/30 text-emerald-200",
    glow: "shadow-[0_2px_12px_rgba(16,185,129,0.2)]",
  },
  "estudio-ia": {
    bg: "bg-fuchsia-500/[0.18]",
    bgHover: "hover:bg-fuchsia-500/30 hover:brightness-110",
    border: "border-l-[3px] border-l-fuchsia-400 border-t border-r border-b border-fuchsia-400/20",
    text: "text-fuchsia-100",
    sub: "text-fuchsia-300/80",
    dot: "#e879f9",
    badge: "bg-fuchsia-500/30 text-fuchsia-200",
    glow: "shadow-[0_2px_12px_rgba(217,70,239,0.2)]",
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hora12Label(n: number, mostrarMinutos = false): string {
  const totalH = HORA_INI + n
  const hEntera = Math.floor(totalH)
  const minutos = Math.round((totalH - hEntera) * 60)
  const periodo = hEntera >= 12 ? "PM" : "AM"
  const h12 = hEntera > 12 ? hEntera - 12 : hEntera === 0 ? 12 : hEntera
  if (mostrarMinutos && minutos > 0) return `${h12}:${String(minutos).padStart(2, "0")} ${periodo}`
  return `${h12} ${periodo}`
}

function pctDesdeHoraInicio(hora: number): number {
  return (hora / TOTAL_H) * 100
}

function pctAltura(duracion: number): number {
  return Math.max((duracion / TOTAL_H) * 100, 2.2)
}

// ─── Bloque de evento ─────────────────────────────────────────────────────────

interface BloqueEventoProps {
  evento: CalendarioEvento
  filtros: Record<EventoTipo, boolean>
  onClick: (e: React.MouseEvent) => void
  totalHorasPx: number
}

function BloqueEvento({ evento, filtros, onClick, totalHorasPx }: BloqueEventoProps) {
  if (!filtros[evento.tipo]) return null

  const s = EVENTO_ESTILO[evento.tipo]
  const topPx = (evento.horaInicio / TOTAL_H) * totalHorasPx
  const heightPx = Math.max((evento.duracion / TOTAL_H) * totalHorasPx, 28)
  const esPequeno = heightPx < 50

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === "Enter" && onClick(e as any)}
      className={`
        absolute left-1 right-1 rounded-md cursor-pointer overflow-hidden
        ${s.bg} ${s.bgHover} ${s.border} ${s.glow}
        transition-all duration-150 ease-out
        hover:scale-[1.01] hover:-translate-y-px
        focus:outline-none focus:ring-2 focus:ring-white/20
        select-none z-10
      `}
      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
      title={`${evento.titulo}${evento.subtitulo ? ` · ${evento.subtitulo}` : ""}`}
    >
      <div className="px-2 py-1.5 h-full flex flex-col overflow-hidden">
        <p className={`text-xs font-semibold leading-tight truncate ${s.text}`}>
          {evento.titulo}
        </p>
        {!esPequeno && evento.subtitulo && (
          <p className={`text-[10px] leading-tight truncate mt-0.5 ${s.sub}`}>
            {evento.subtitulo}
          </p>
        )}
        {!esPequeno && (
          <p className={`text-[10px] mt-auto pt-0.5 ${s.sub} opacity-70`}>
            {hora12Label(evento.horaInicio, true)} – {hora12Label(evento.horaInicio + evento.duracion, true)}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Línea de tiempo actual ───────────────────────────────────────────────────

function CurrentTimeLine({ totalHorasPx }: { totalHorasPx: number }) {
  const [posY, setPosY] = useState<number | null>(null)

  useEffect(() => {
    const calcular = () => {
      const ahora = new Date()
      const fraccion = (ahora.getHours() + ahora.getMinutes() / 60 - HORA_INI) / TOTAL_H
      if (fraccion < 0 || fraccion > 1) { setPosY(null); return }
      setPosY(fraccion * totalHorasPx)
    }
    calcular()
    const t = setInterval(calcular, 60000)
    return () => clearInterval(t)
  }, [totalHorasPx])

  if (posY === null) return null

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${posY}px` }}
    >
      <div className="flex items-center">
        {/* Círculo */}
        <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.7)] shrink-0 -ml-1.5" />
        {/* Línea */}
        <div
          className="flex-1 h-[2px] bg-rose-500"
          style={{ boxShadow: "0 0 6px rgba(239,68,68,0.5)" }}
        />
      </div>
    </div>
  )
}

// ─── Eje Y de horas ───────────────────────────────────────────────────────────

function EjeHoras({ totalHorasPx }: { totalHorasPx: number }) {
  const horas = Array.from({ length: TOTAL_H + 1 }, (_, i) => i)
  return (
    <div className="shrink-0 w-16 border-r border-slate-800/80 bg-[#0b0d1f]">
      {/* Espacio header días */}
      <div className="h-[52px] border-b border-slate-800/80" />
      {/* Horas */}
      <div style={{ height: `${totalHorasPx}px`, position: "relative" }}>
        {horas.map(h => (
          <div
            key={h}
            className="absolute right-0 left-0 flex items-start justify-end pr-3"
            style={{ top: `${(h / TOTAL_H) * 100}%` }}
          >
            {h < TOTAL_H && (
              <span className="text-xs font-medium text-slate-400 -translate-y-2 whitespace-nowrap select-none">
                {hora12Label(h)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Líneas guía horizontales ─────────────────────────────────────────────────

function LineasGuia({ totalHorasPx }: { totalHorasPx: number }) {
  const slots = Array.from({ length: TOTAL_H * SLOTS_POR_HORA + 1 }, (_, i) => i)
  return (
    <div className="absolute inset-0 pointer-events-none">
      {slots.map(s => {
        const esHoraEntera = s % SLOTS_POR_HORA === 0
        return (
          <div
            key={s}
            className={`absolute left-0 right-0 ${esHoraEntera ? "border-t border-slate-800/70" : "border-t border-slate-800/30"}`}
            style={{ top: `${(s / (TOTAL_H * SLOTS_POR_HORA)) * totalHorasPx}px` }}
          />
        )
      })}
    </div>
  )
}

// ─── Celdas clickeables ───────────────────────────────────────────────────────

function CeldasClickeables({
  dia,
  fecha,
  totalHorasPx,
  onCeldaClick,
}: {
  dia: number
  fecha: Date
  totalHorasPx: number
  onCeldaClick: (params: OpenModalParams) => void
}) {
  const totalSlots = TOTAL_H * SLOTS_POR_HORA
  const alturaCelda = totalHorasPx / totalSlots
  const [hoverSlot, setHoverSlot] = useState<number | null>(null)

  return (
    <div className="absolute inset-0 z-0">
      {Array.from({ length: totalSlots }, (_, slotIdx) => {
        const horaInicio = slotIdx / SLOTS_POR_HORA
        const topPx = slotIdx * alturaCelda
        return (
          <div
            key={slotIdx}
            className={`absolute left-0 right-0 cursor-pointer transition-colors duration-100 ${hoverSlot === slotIdx ? "bg-white/[0.04]" : ""}`}
            style={{ top: `${topPx}px`, height: `${alturaCelda}px` }}
            onMouseEnter={() => setHoverSlot(slotIdx)}
            onMouseLeave={() => setHoverSlot(null)}
            onClick={() => onCeldaClick({ dia, horaInicio, fecha })}
          >
            {/* Tooltip de hora en hover */}
            {hoverSlot === slotIdx && (
              <div className="absolute left-1 top-0 flex items-center pointer-events-none z-20">
                <span className="text-[9px] font-medium text-slate-400 bg-[#0b0d1f]/90 px-1 py-0.5 rounded">
                  {hora12Label(horaInicio, true)}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Columna de un día ────────────────────────────────────────────────────────

interface ColumnaProps {
  diaIdx: number
  fecha: Date
  esHoy: boolean
  eventos: CalendarioEvento[]
  filtros: Record<EventoTipo, boolean>
  totalHorasPx: number
  onCeldaClick: (params: OpenModalParams) => void
  onEventClick: (evento: CalendarioEvento) => void
}

function ColumnaDia({
  diaIdx, fecha, esHoy, eventos, filtros, totalHorasPx, onCeldaClick, onEventClick,
}: ColumnaProps) {
  const diaLabel = DIAS_CORTOS[diaIdx]
  const numDia = fecha.getDate()

  return (
    <div className="flex-1 flex flex-col border-r border-slate-800/50 last:border-r-0 min-w-[80px]">
      {/* Encabezado del día */}
      <div
        className={`h-[52px] flex flex-col items-center justify-center shrink-0 border-b border-slate-800/80 select-none
          ${esHoy ? "bg-indigo-500/[0.06]" : "bg-[#0b0d1f]"}`}
      >
        <span
          className={`text-[10px] font-semibold uppercase tracking-widest
            ${esHoy ? "text-indigo-400" : "text-slate-500"}`}
        >
          {diaLabel}
        </span>
        <div className={`mt-0.5 flex items-center justify-center w-7 h-7 rounded-full
          ${esHoy ? "bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]" : ""}`}>
          <span className={`text-sm font-semibold
            ${esHoy ? "text-white" : "text-slate-200"}`}>
            {numDia}
          </span>
        </div>
      </div>

      {/* Cuerpo con eventos y celdas */}
      <div className="relative flex-1 bg-[#090b1c]" style={{ height: `${totalHorasPx}px` }}>
        {/* Líneas guía */}
        <LineasGuia totalHorasPx={totalHorasPx} />

        {/* Celdas clickeables (detrás de los eventos) */}
        <CeldasClickeables
          dia={diaIdx}
          fecha={fecha}
          totalHorasPx={totalHorasPx}
          onCeldaClick={onCeldaClick}
        />

        {/* Línea de tiempo actual */}
        {esHoy && <CurrentTimeLine totalHorasPx={totalHorasPx} />}

        {/* Eventos */}
        {eventos.map(ev => (
          <BloqueEvento
            key={ev.id}
            evento={ev}
            filtros={filtros}
            totalHorasPx={totalHorasPx}
            onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Vista Semana ─────────────────────────────────────────────────────────────

function VistaSemana({
  eventos, filtros, fechasSemana, hoyDia, offsetSemana, onCeldaClick, onEventClick,
}: {
  eventos: CalendarioEvento[]
  filtros: Record<EventoTipo, boolean>
  fechasSemana: Date[]
  hoyDia: number
  offsetSemana: number
  onCeldaClick: (params: OpenModalParams) => void
  onEventClick: (ev: CalendarioEvento) => void
}) {
  const totalHorasPx = TOTAL_H * PX_POR_HORA

  return (
    <div className="flex-1 overflow-auto custom-scrollbar">
      <div className="flex" style={{ minWidth: "640px" }}>
        {/* Eje Y */}
        <EjeHoras totalHorasPx={totalHorasPx} />

        {/* 7 columnas */}
        {DIAS_CORTOS.map((_, dIdx) => (
          <ColumnaDia
            key={dIdx}
            diaIdx={dIdx}
            fecha={fechasSemana[dIdx]}
            esHoy={dIdx === hoyDia && offsetSemana === 0}
            eventos={eventos.filter(e => e.dia === dIdx)}
            filtros={filtros}
            totalHorasPx={totalHorasPx}
            onCeldaClick={onCeldaClick}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Vista Día ────────────────────────────────────────────────────────────────

function VistaDia({
  eventos, filtros, fechaHoy, hoyDia, onCeldaClick, onEventClick,
}: {
  eventos: CalendarioEvento[]
  filtros: Record<EventoTipo, boolean>
  fechaHoy: Date
  hoyDia: number
  onCeldaClick: (params: OpenModalParams) => void
  onEventClick: (ev: CalendarioEvento) => void
}) {
  const totalHorasPx = TOTAL_H * PX_POR_HORA
  const evsDia = eventos.filter(e => e.dia === hoyDia)

  return (
    <div className="flex-1 overflow-auto custom-scrollbar">
      <div className="flex max-w-2xl mx-auto">
        <EjeHoras totalHorasPx={totalHorasPx} />
        <ColumnaDia
          diaIdx={hoyDia}
          fecha={fechaHoy}
          esHoy
          eventos={evsDia}
          filtros={filtros}
          totalHorasPx={totalHorasPx}
          onCeldaClick={onCeldaClick}
          onEventClick={onEventClick}
        />
      </div>
    </div>
  )
}

// ─── Vista Mes ────────────────────────────────────────────────────────────────

function VistaMes({
  fecha, eventos, filtros, onCeldaClick,
}: {
  fecha: Date
  eventos: CalendarioEvento[]
  filtros: Record<EventoTipo, boolean>
  onCeldaClick: (params: OpenModalParams) => void
}) {
  const año = fecha.getFullYear()
  const mes = fecha.getMonth()
  const hoy = new Date()
  const primerDia = new Date(año, mes, 1).getDay()
  const offset = primerDia === 0 ? 6 : primerDia - 1
  const diasMes = new Date(año, mes + 1, 0).getDate()
  const celdas = Array.from({ length: Math.ceil((offset + diasMes) / 7) * 7 }, (_, i) => {
    const dia = i - offset + 1
    return dia >= 1 && dia <= diasMes ? dia : null
  })

  return (
    <div className="flex-1 overflow-auto custom-scrollbar p-3">
      {/* Cabeceras de días */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_CORTOS.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-px bg-slate-800/40 rounded-xl overflow-hidden border border-slate-800/50">
        {celdas.map((dia, i) => {
          if (!dia) return <div key={`e-${i}`} className="bg-[#090b1c] min-h-[90px]" />

          const diaSemana = new Date(año, mes, dia).getDay()
          const diaIdx = diaSemana === 0 ? 6 : diaSemana - 1
          const esHoy = hoy.getDate() === dia && hoy.getMonth() === mes && hoy.getFullYear() === año
          const evsDia = eventos.filter(e => e.dia === diaIdx && filtros[e.tipo]).slice(0, 3)
          const masEventos = eventos.filter(e => e.dia === diaIdx && filtros[e.tipo]).length - 3

          return (
            <div
              key={dia}
              onClick={() => onCeldaClick({ dia: diaIdx, horaInicio: 9, fecha: new Date(año, mes, dia) })}
              className={`bg-[#090b1c] min-h-[90px] p-1.5 cursor-pointer hover:bg-white/[0.03] transition-colors group ${esHoy ? "ring-1 ring-inset ring-indigo-500/40" : ""}`}
            >
              {/* Número del día */}
              <div className="flex justify-end mb-1">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold
                  ${esHoy ? "bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "text-slate-400 group-hover:text-slate-200"}`}>
                  {dia}
                </span>
              </div>

              {/* Eventos del día (máx 3) */}
              <div className="space-y-0.5">
                {evsDia.map(ev => {
                  const s = EVENTO_ESTILO[ev.tipo]
                  return (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation() }}
                      className={`rounded px-1.5 py-0.5 text-[9px] font-medium truncate cursor-pointer ${s.bg} ${s.bgHover} ${s.text} border-l-2`}
                      style={{ borderColor: s.dot }}
                    >
                      {ev.titulo}
                    </div>
                  )
                })}
                {masEventos > 0 && (
                  <p className="text-[9px] text-slate-500 pl-1">+{masEventos} más</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Vista Agenda (lista) ─────────────────────────────────────────────────────

function VistaAgenda({
  eventos, filtros, fechasSemana,
}: {
  eventos: CalendarioEvento[]
  filtros: Record<EventoTipo, boolean>
  fechasSemana: Date[]
}) {
  const eventosVisibles = eventos
    .filter(e => filtros[e.tipo])
    .sort((a, b) => a.dia - b.dia || a.horaInicio - b.horaInicio)

  return (
    <div className="flex-1 overflow-auto custom-scrollbar p-4">
      {eventosVisibles.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-600">
          <Clock className="w-10 h-10 opacity-30" />
          <p className="text-sm">Sin eventos visibles esta semana</p>
        </div>
      )}

      {DIAS_CORTOS.map((diaNombre, dIdx) => {
        const evsDia = eventosVisibles.filter(e => e.dia === dIdx)
        if (evsDia.length === 0) return null
        const fecha = fechasSemana[dIdx]
        const hoy = new Date()
        const esHoy = fecha?.toDateString() === hoy.toDateString()

        return (
          <div key={dIdx} className="mb-6">
            {/* Separador de día */}
            <div className={`flex items-center gap-3 mb-3 pb-2 border-b ${esHoy ? "border-indigo-500/30" : "border-slate-800"}`}>
              <div className={`flex items-center gap-2 ${esHoy ? "text-indigo-400" : "text-slate-400"}`}>
                <span className="text-xs font-semibold uppercase tracking-wider">{diaNombre}</span>
                {fecha && <span className="text-xs text-slate-500">{fecha.toLocaleDateString("es-PE", { day: "numeric", month: "long" })}</span>}
              </div>
              {esHoy && <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Hoy</span>}
            </div>

            {/* Eventos del día */}
            <div className="space-y-2 pl-2">
              {evsDia.map(ev => {
                const s = EVENTO_ESTILO[ev.tipo]
                return (
                  <div
                    key={ev.id}
                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 hover:scale-[1.005] ${s.bg} ${s.bgHover} ${s.border} ${s.glow}`}
                  >
                    <div className="flex flex-col items-center shrink-0 w-12 pt-0.5">
                      <span className={`text-[10px] font-bold ${s.text}`}>{hora12Label(ev.horaInicio, true)}</span>
                      <div className="w-px h-full min-h-[12px] my-1" style={{ background: s.dot, opacity: 0.4 }} />
                      <span className={`text-[10px] ${s.sub}`}>{hora12Label(ev.horaInicio + ev.duracion, true)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${s.text}`}>{ev.titulo}</p>
                      {ev.subtitulo && <p className={`text-xs mt-0.5 truncate ${s.sub}`}>{ev.subtitulo}</p>}
                      <p className="text-[10px] text-slate-500 mt-1">{ev.duracion}h · {DIAS_CORTOS[ev.dia]}</p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full shrink-0 ${s.badge}`}>
                      {ev.tipo === "clase" ? "Clase" : ev.tipo === "examen" ? "Examen" : ev.tipo === "deporte" ? "Deporte" : "IA"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Componente principal exportado ──────────────────────────────────────────

export function CalendarioGrid({
  vista, eventos, filtros, fechasSemana, hoyDia, offsetSemana, onOpenModal, onEventClick,
}: CalendarioGridProps) {
  const hoy = new Date()

  const handleCeldaClick = useCallback((params: OpenModalParams) => {
    onOpenModal(params)
  }, [onOpenModal])

  if (vista === "Semana") {
    return (
      <VistaSemana
        eventos={eventos}
        filtros={filtros}
        fechasSemana={fechasSemana}
        hoyDia={hoyDia}
        offsetSemana={offsetSemana}
        onCeldaClick={handleCeldaClick}
        onEventClick={onEventClick}
      />
    )
  }

  if (vista === "Día") {
    return (
      <VistaDia
        eventos={eventos}
        filtros={filtros}
        fechaHoy={hoy}
        hoyDia={hoyDia}
        onCeldaClick={handleCeldaClick}
        onEventClick={onEventClick}
      />
    )
  }

  if (vista === "Mes") {
    return (
      <VistaMes
        fecha={fechasSemana[0] ?? hoy}
        eventos={eventos}
        filtros={filtros}
        onCeldaClick={handleCeldaClick}
      />
    )
  }

  if (vista === "Agenda") {
    return (
      <VistaAgenda
        eventos={eventos}
        filtros={filtros}
        fechasSemana={fechasSemana}
      />
    )
  }

  return null
}
