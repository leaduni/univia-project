"use client"

// calendar-grid.tsx — Grid del calendario con click-to-create, línea de tiempo,
// etiquetas personalizadas (Google Calendar style) y navegación dinámica

import { useState, useEffect, useCallback } from "react"
import { Clock, Check, Moon, AlertTriangle, Sparkles } from "lucide-react"

// ─── Tipos públicos exportados ────────────────────────────────────────────────

export type ColorEtiqueta = "indigo" | "rose" | "emerald" | "fuchsia" | "amber" | "sky" | "orange"

export interface Etiqueta {
  id: string
  nombre: string
  color: ColorEtiqueta
}

export type CalendarioVista = "Día" | "Semana" | "Mes" | "Año" | "Agenda"

export interface CalendarioEvento {
  id: string
  titulo: string
  subtitulo?: string
  ubicacion?: string
  videollamada?: string
  todoElDia?: boolean
  tipo?: 'examen' | string
  recurrencia?: string
  etiquetaId: string
  diaOffset?: number // Usado en vistas dinámicas para saber qué día es respecto a baseDate
  fechaISO: string   // Ej. "2026-09-14"
  fechaFinISO?: string
  horaInicio: number // horas desde HORA_INI
  duracion: number   // en horas
}

export interface OpenModalParams {
  horaInicio: number
  horaFin?: number
  fecha: Date
}

interface CalendarioGridProps {
  vista: CalendarioVista
  eventos: CalendarioEvento[]
  etiquetas: Etiqueta[]
  filtros: Record<string, boolean>
  baseDate: Date
  fechasSemana: Date[] // Lunes a Domingo de la semana que contiene a baseDate
  sleepSettings: { start: string, end: string }
  onOpenModal: (params: OpenModalParams) => void
  onEventClick: (evento: CalendarioEvento) => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const HORA_INI = 0
const HORA_FIN = 24
const TOTAL_H = 24
const PX_POR_HORA = 68
const SLOTS_POR_HORA = 4 // Intervalos de 15 min

// ─── Generador de Estilos por Color ───────────────────────────────────────────

export function getEstiloColor(color: ColorEtiqueta) {
  const estilos = {
    indigo: {
      bg: "bg-indigo-500/[0.18]", bgHover: "hover:bg-indigo-500/30 hover:brightness-110",
      border: "border-l-[3px] border-l-indigo-400 border-t border-r border-b border-indigo-400/20",
      text: "text-indigo-100", sub: "text-indigo-300/80", dot: "#818cf8", badge: "bg-indigo-500/30 text-indigo-200", glow: "shadow-[0_2px_12px_rgba(99,102,241,0.2)]"
    },
    rose: {
      bg: "bg-rose-500/[0.18]", bgHover: "hover:bg-rose-500/30 hover:brightness-110",
      border: "border-l-[3px] border-l-rose-400 border-t border-r border-b border-rose-400/20",
      text: "text-rose-100", sub: "text-rose-300/80", dot: "#fb7185", badge: "bg-rose-500/30 text-rose-200", glow: "shadow-[0_2px_12px_rgba(244,63,94,0.2)]"
    },
    emerald: {
      bg: "bg-emerald-500/[0.18]", bgHover: "hover:bg-emerald-500/30 hover:brightness-110",
      border: "border-l-[3px] border-l-emerald-400 border-t border-r border-b border-emerald-400/20",
      text: "text-emerald-100", sub: "text-emerald-300/80", dot: "#34d399", badge: "bg-emerald-500/30 text-emerald-200", glow: "shadow-[0_2px_12px_rgba(16,185,129,0.2)]"
    },
    fuchsia: {
      bg: "bg-fuchsia-500/[0.18]", bgHover: "hover:bg-fuchsia-500/30 hover:brightness-110",
      border: "border-l-[3px] border-l-fuchsia-400 border-t border-r border-b border-fuchsia-400/20",
      text: "text-fuchsia-100", sub: "text-fuchsia-300/80", dot: "#e879f9", badge: "bg-fuchsia-500/30 text-fuchsia-200", glow: "shadow-[0_2px_12px_rgba(217,70,239,0.2)]"
    },
    amber: {
      bg: "bg-amber-500/[0.18]", bgHover: "hover:bg-amber-500/30 hover:brightness-110",
      border: "border-l-[3px] border-l-amber-400 border-t border-r border-b border-amber-400/20",
      text: "text-amber-100", sub: "text-amber-300/80", dot: "#fbbf24", badge: "bg-amber-500/30 text-amber-200", glow: "shadow-[0_2px_12px_rgba(251,191,36,0.2)]"
    },
    sky: {
      bg: "bg-sky-500/[0.18]", bgHover: "hover:bg-sky-500/30 hover:brightness-110",
      border: "border-l-[3px] border-l-sky-400 border-t border-r border-b border-sky-400/20",
      text: "text-sky-100", sub: "text-sky-300/80", dot: "#38bdf8", badge: "bg-sky-500/30 text-sky-200", glow: "shadow-[0_2px_12px_rgba(56,189,248,0.2)]"
    },
    orange: {
      bg: "bg-orange-500/[0.18]", bgHover: "hover:bg-orange-500/30 hover:brightness-110",
      border: "border-l-[3px] border-l-orange-400 border-t border-r border-b border-orange-400/20",
      text: "text-orange-100", sub: "text-orange-300/80", dot: "#fb923c", badge: "bg-orange-500/30 text-orange-200", glow: "shadow-[0_2px_12px_rgba(251,146,60,0.2)]"
    }
  }
  return estilos[color] || estilos.indigo
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

function formatearISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// ─── Bloque de evento ─────────────────────────────────────────────────────────

interface BloqueEventoProps {
  evento: CalendarioEvento
  etiquetas: Etiqueta[]
  filtros: Record<string, boolean>
  onClick: (e: React.MouseEvent) => void
  totalHorasPx: number
}
function BloqueEvento({ evento, etiquetas, filtros, onClick, totalHorasPx }: BloqueEventoProps) {
  const activo = filtros[evento.etiquetaId]
  const etiqueta = etiquetas.find(e => e.id === evento.etiquetaId)
  
  const isExamen = evento.tipo === 'examen'
  let s = getEstiloColor(etiqueta ? etiqueta.color : "indigo")
  if (isExamen) {
    s = {
      bg: "bg-rose-500/20",
      bgHover: "hover:bg-rose-500/30",
      border: "border-l-[3px] border-l-rose-500 border-t border-t-white/5 border-r border-r-white/5 border-b border-b-white/5",
      text: "text-rose-100",
      sub: "text-rose-300",
      dot: "#f43f5e",
      glow: "shadow-[inset_0_0_12px_rgba(244,63,94,0.15)]"
    }
  }

  const topPx = (evento.horaInicio / TOTAL_H) * totalHorasPx
  const heightPx = Math.max((evento.duracion / TOTAL_H) * totalHorasPx, 28)
  const esPequeno = heightPx < 50

  const handleRepasar = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log(`[IA] Iniciando repaso para: ${evento.titulo}`)
    alert(`[Módulo de IA] Preparando sesión de repaso para ${evento.titulo}...`)
  }

  return (
    <div
      role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onClick(e); }} onKeyDown={e => e.key === "Enter" && onClick(e as any)}
      className={`absolute left-1 right-1 rounded-md cursor-pointer overflow-hidden
        ${s.bg} ${s.bgHover} ${s.border} ${s.glow}
        transition-all duration-300 ease-in-out hover:scale-[1.01] hover:-translate-y-px hover:z-20
        focus:outline-none focus:ring-2 focus:ring-white/20 select-none
        ${activo ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 pointer-events-none z-0"}`}
      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
      title={`${evento.titulo}${evento.subtitulo ? ` · ${evento.subtitulo}` : ""}`}
    >
      <div className="px-2 py-1.5 h-full flex flex-col overflow-hidden relative group">
        <div className="flex items-start gap-1">
          {isExamen && <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />}
          <p className={`text-xs font-semibold leading-tight truncate ${s.text}`}>{evento.titulo}</p>
        </div>
        {!esPequeno && evento.subtitulo && (
          <p className={`text-[10px] leading-tight truncate mt-0.5 ${s.sub}`}>{evento.subtitulo}</p>
        )}
        {!esPequeno && (
          <p className={`text-[10px] mt-auto pt-0.5 ${s.sub} opacity-70`}>
            {hora12Label(evento.horaInicio, true)} – {hora12Label(evento.horaInicio + evento.duracion, true)}
          </p>
        )}
        {isExamen && heightPx > 70 && (
          <div className="mt-1.5">
            <button onClick={handleRepasar} className="w-full py-1 rounded-md bg-gradient-to-r from-rose-600/80 to-purple-600/80 hover:from-rose-500 hover:to-purple-500 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md border border-white/20 hover:scale-[1.02]">
              <Sparkles className="w-3 h-3" /> Repasar con IA
            </button>
          </div>
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
    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${posY}px` }}>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.7)] shrink-0 -ml-1.5" />
        <div className="flex-1 h-[2px] bg-rose-500" style={{ boxShadow: "0 0 6px rgba(239,68,68,0.5)" }} />
      </div>
    </div>
  )
}

// ─── Eje Y de horas ───────────────────────────────────────────────────────────

function EjeHoras({ totalHorasPx }: { totalHorasPx: number }) {
  const horas = Array.from({ length: TOTAL_H + 1 }, (_, i) => i)
  return (
    <div className="shrink-0 w-16 border-r border-slate-800/80 bg-[#0b0d1f]">
      <div className="sticky top-0 z-30 h-[52px] border-b border-slate-800/80 bg-[#0b0d1f]" />
      <div style={{ height: `${totalHorasPx}px`, position: "relative" }}>
        {horas.map(h => (
          <div key={h} id={`hour-${h}`} className="absolute right-0 left-0 flex items-start justify-end pr-3" style={{ top: `${(h / TOTAL_H) * 100}%` }}>
            {h < TOTAL_H && <span className={`text-xs font-medium text-slate-400 whitespace-nowrap select-none ${h === 0 ? "translate-y-1" : "-translate-y-2"}`}>{hora12Label(h)}</span>}
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
          <div key={s}
            className={`absolute left-0 right-0 ${esHoraEntera ? "border-t border-slate-800/70" : "border-t border-slate-800/30"}`}
            style={{ top: `${(s / (TOTAL_H * SLOTS_POR_HORA)) * totalHorasPx}px` }} />
        )
      })}
    </div>
  )
}

// ─── Celdas clickeables ───────────────────────────────────────────────────────

function CeldasClickeables({
  fecha, totalHorasPx, onCeldaClick,
}: {
  fecha: Date
  totalHorasPx: number
  onCeldaClick: (params: OpenModalParams) => void
}) {
  const totalSlots = TOTAL_H * SLOTS_POR_HORA
  const alturaCelda = totalHorasPx / totalSlots
  const [hoverSlot, setHoverSlot] = useState<number | null>(null)
  
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartSlot, setDragStartSlot] = useState<number | null>(null)
  const [currentDragSlot, setCurrentDragSlot] = useState<number | null>(null)

  const handleMouseDown = (slotIdx: number, e: React.MouseEvent) => {
    if (e.button !== 0) return // Solo clic izquierdo
    setIsDragging(true)
    setDragStartSlot(slotIdx)
    setCurrentDragSlot(slotIdx)
  }

  const handleMouseEnter = (slotIdx: number) => {
    setHoverSlot(slotIdx)
    if (isDragging && dragStartSlot !== null) {
      setCurrentDragSlot(slotIdx)
    }
  }

  const handleMouseUp = () => {
    if (isDragging && dragStartSlot !== null && currentDragSlot !== null) {
      const start = Math.min(dragStartSlot, currentDragSlot)
      const end = Math.max(dragStartSlot, currentDragSlot)
      const horaInicio = start / SLOTS_POR_HORA
      const horaFin = (end + 1) / SLOTS_POR_HORA // +1 slot de duración por defecto
      
      onCeldaClick({ horaInicio, horaFin, fecha })
    }
    setIsDragging(false)
    setDragStartSlot(null)
    setCurrentDragSlot(null)
  }

  // Cancelar arrastre si el ratón se suelta fuera del grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        setDragStartSlot(null)
        setCurrentDragSlot(null)
      }
    }
    window.addEventListener("mouseup", handleGlobalMouseUp)
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp)
  }, [isDragging])

  const renderSelectionBox = () => {
    if (!isDragging || dragStartSlot === null || currentDragSlot === null) return null
    const start = Math.min(dragStartSlot, currentDragSlot)
    const end = Math.max(dragStartSlot, currentDragSlot)
    const topPx = start * alturaCelda
    const heightPx = (end - start + 1) * alturaCelda

    return (
      <div 
        className="absolute left-0 right-0 bg-indigo-500/20 border-indigo-500 border-2 border-dashed z-20 pointer-events-none transition-all duration-75"
        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
      />
    )
  }

  return (
    <div className="absolute inset-0 z-0 select-none" onMouseUp={handleMouseUp} onMouseLeave={() => setHoverSlot(null)}>
      {renderSelectionBox()}
      {Array.from({ length: totalSlots }, (_, slotIdx) => {
        const horaInicio = slotIdx / SLOTS_POR_HORA
        const topPx = slotIdx * alturaCelda
        const isHovered = !isDragging && hoverSlot === slotIdx

        return (
          <div key={slotIdx}
            className={`absolute left-0 right-0 transition-colors duration-100 ${isHovered ? "bg-indigo-500/10" : ""}`}
            style={{ top: `${topPx}px`, height: `${alturaCelda}px` }}
            onMouseDown={(e) => handleMouseDown(slotIdx, e)}
            onMouseEnter={() => handleMouseEnter(slotIdx)}
          >
            {isHovered && (
              <div className="absolute left-1 top-0 flex items-center pointer-events-none z-20">
                <span className="text-[10px] font-medium text-indigo-300 bg-indigo-950/90 px-1.5 py-0.5 rounded shadow-sm border border-indigo-500/30">
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

// ─── Sleep Zones (Visual Overlay) ─────────────────────────────────────────────

function SleepZones({ totalHorasPx, sleepSettings }: { totalHorasPx: number, sleepSettings: { start: string, end: string } }) {
  const [startH, startM] = sleepSettings.start.split(":").map(Number)
  const [endH, endM] = sleepSettings.end.split(":").map(Number)
  const startDecimal = startH + startM / 60
  const endDecimal = endH + endM / 60
  const pxPerH = totalHorasPx / 24

  const renderBlock = (s: number, e: number) => {
    const topPx = s * pxPerH
    const heightPx = (e - s) * pxPerH
    return (
      <div className="absolute left-0 right-0 pointer-events-none z-[1] bg-[#0B0B12]/80 flex flex-col items-center pt-4 overflow-hidden"
           style={{ top: `${topPx}px`, height: `${heightPx}px`, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.01) 10px, rgba(255,255,255,0.01) 20px)' }}>
        {heightPx > 40 && <Moon className="w-5 h-5 text-slate-600/40" />}
      </div>
    )
  }

  return (
    <>
      {startDecimal > endDecimal ? (
        <>
          {renderBlock(0, endDecimal)}
          {renderBlock(startDecimal, 24)}
        </>
      ) : (
        renderBlock(startDecimal, endDecimal)
      )}
    </>
  )
}

// ─── Columna de un día ────────────────────────────────────────────────────────

interface ColumnaProps {
  fecha: Date
  esHoy: boolean
  eventos: CalendarioEvento[]
  etiquetas: Etiqueta[]
  filtros: Record<string, boolean>
  sleepSettings: { start: string, end: string }
  totalHorasPx: number
  onCeldaClick: (params: OpenModalParams) => void
  onEventClick: (evento: CalendarioEvento) => void
}

function ColumnaDia({
  fecha, esHoy, eventos, etiquetas, filtros, sleepSettings, totalHorasPx, onCeldaClick, onEventClick,
}: ColumnaProps) {
  const diaSemana = fecha.getDay() === 0 ? 6 : fecha.getDay() - 1
  const diaLabel = DIAS_CORTOS[diaSemana]
  const numDia = fecha.getDate()

  return (
    <div className="flex-1 flex flex-col border-r border-slate-800/50 min-w-[120px] relative">
      <div className={`sticky top-0 z-20 h-[52px] flex flex-col items-center justify-center border-b border-slate-800/80 ${esHoy ? "bg-indigo-500/10 backdrop-blur-md" : "bg-[#0b0d1f]"}`}>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${esHoy ? "text-indigo-400" : "text-slate-500"}`}>{diaLabel}</span>
        <div className={`mt-0.5 flex items-center justify-center w-7 h-7 rounded-full ${esHoy ? "bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]" : ""}`}>
          <span className={`text-sm font-semibold ${esHoy ? "text-white" : "text-slate-200"}`}>{numDia}</span>
        </div>
      </div>
      <div className="relative flex-1 bg-[#090b1c]" style={{ height: `${totalHorasPx}px` }}>
        <LineasGuia totalHorasPx={totalHorasPx} />
        <SleepZones totalHorasPx={totalHorasPx} sleepSettings={sleepSettings} />
        <CeldasClickeables fecha={fecha} totalHorasPx={totalHorasPx} onCeldaClick={onCeldaClick} />
        {esHoy && <CurrentTimeLine totalHorasPx={totalHorasPx} />}
        {eventos.map(ev => (
          <BloqueEvento key={ev.id} evento={ev} etiquetas={etiquetas} filtros={filtros} totalHorasPx={totalHorasPx} onClick={(e) => { e.stopPropagation(); onEventClick(ev) }} />
        ))}
      </div>
    </div>
  )
}

// ─── Vistas ───────────────────────────────────────────────────────────────────

function VistaSemana({
  eventos, etiquetas, filtros, sleepSettings, fechasSemana, onCeldaClick, onEventClick,
}: Omit<CalendarioGridProps, "vista" | "baseDate"> & { fechasSemana: Date[], onCeldaClick: (p: OpenModalParams) => void }) {
  const totalHorasPx = TOTAL_H * PX_POR_HORA
  const hoyStr = formatearISO(new Date())

  useEffect(() => {
    const endH = parseInt(sleepSettings.end.split(":")[0], 10)
    const el = document.getElementById(`hour-${Math.max(0, endH - 1)}`) // Scroll 1 hour above to give breathing room
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [sleepSettings])

  return (
    <div className="flex-1 overflow-auto custom-scrollbar">
      <div className="flex pb-20" style={{ minWidth: "768px" }}>
        <EjeHoras totalHorasPx={totalHorasPx} />
        {fechasSemana.map((fecha) => {
          const iso = formatearISO(fecha)
          return (
            <ColumnaDia
              key={iso}
              fecha={fecha}
              esHoy={iso === hoyStr}
              eventos={eventos.filter(e => e.fechaISO === iso)}
              etiquetas={etiquetas}
              filtros={filtros}
              sleepSettings={sleepSettings}
              totalHorasPx={totalHorasPx}
              onCeldaClick={onCeldaClick}
              onEventClick={onEventClick}
            />
          )
        })}
      </div>
    </div>
  )
}

function VistaDia({
  eventos, etiquetas, filtros, sleepSettings, baseDate, onCeldaClick, onEventClick,
}: Omit<CalendarioGridProps, "vista" | "fechasSemana"> & { baseDate: Date, onCeldaClick: (p: OpenModalParams) => void }) {
  const totalHorasPx = TOTAL_H * PX_POR_HORA
  const isoDate = formatearISO(baseDate)
  const evsDia = eventos.filter(e => e.fechaISO === isoDate)
  const esHoy = formatearISO(new Date()) === isoDate

  useEffect(() => {
    const endH = parseInt(sleepSettings.end.split(":")[0], 10)
    const el = document.getElementById(`hour-${Math.max(0, endH - 1)}`)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [sleepSettings])

  return (
    <div className="flex-1 overflow-auto custom-scrollbar flex">
      <div className="flex w-full border-x border-slate-800/50 shadow-2xl pb-20">
        <EjeHoras totalHorasPx={totalHorasPx} />
        <ColumnaDia
          fecha={baseDate}
          esHoy={esHoy}
          eventos={evsDia}
          etiquetas={etiquetas}
          filtros={filtros}
          sleepSettings={sleepSettings}
          totalHorasPx={totalHorasPx}
          onCeldaClick={onCeldaClick}
          onEventClick={onEventClick}
        />
      </div>
    </div>
  )
}

function VistaMes({
  baseDate, eventos, etiquetas, filtros, onCeldaClick,
}: Omit<CalendarioGridProps, "vista" | "fechasSemana" | "onEventClick"> & { baseDate: Date, onCeldaClick: (p: OpenModalParams) => void }) {
  const año = baseDate.getFullYear()
  const mes = baseDate.getMonth()
  const hoyStr = formatearISO(new Date())
  const primerDia = new Date(año, mes, 1).getDay()
  const offset = primerDia === 0 ? 6 : primerDia - 1
  const diasMes = new Date(año, mes + 1, 0).getDate()
  const celdas = Array.from({ length: Math.ceil((offset + diasMes) / 7) * 7 }, (_, i) => {
    const dia = i - offset + 1
    return dia >= 1 && dia <= diasMes ? dia : null
  })

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
      <div className="grid grid-cols-7 mb-2">
        {DIAS_CORTOS.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 gap-px bg-slate-800/40 rounded-xl overflow-hidden border border-slate-800/50">
        {celdas.map((dia, i) => {
          if (!dia) return <div key={`e-${i}`} className="bg-[#090b1c]" />
          const fechaCelda = new Date(año, mes, dia)
          const iso = formatearISO(fechaCelda)
          const esHoy = hoyStr === iso
          const evsDia = eventos.filter(e => e.fechaISO === iso && filtros[e.etiquetaId])
          const visibles = evsDia.slice(0, 3)
          const masEventos = evsDia.length - 3

          return (
            <div
              key={dia}
              onClick={() => onCeldaClick({ horaInicio: 9, fecha: fechaCelda })}
              className={`bg-[#090b1c] p-2 flex flex-col cursor-pointer hover:bg-white/[0.03] transition-colors group ${esHoy ? "ring-1 ring-inset ring-indigo-500/40" : ""}`}
            >
              <div className="flex justify-end mb-1.5">
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold transition-all
                  ${esHoy ? "bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "text-slate-400 group-hover:text-slate-200"}`}>
                  {dia}
                </span>
              </div>
              <div className="space-y-1 overflow-hidden flex-1">
                {visibles.map(ev => {
                  const etiqueta = etiquetas.find(e => e.id === ev.etiquetaId)
                  const s = getEstiloColor(etiqueta ? etiqueta.color : "indigo")
                  return (
                    <div key={ev.id} onClick={e => e.stopPropagation()}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium truncate cursor-pointer ${s.bg} ${s.bgHover} ${s.text} border-l-2`}
                      style={{ borderColor: s.dot }}>
                      {ev.titulo}
                    </div>
                  )
                })}
                {masEventos > 0 && <p className="text-[10px] font-medium text-slate-500 pl-1">+{masEventos} más</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VistaAño({ baseDate }: { baseDate: Date }) {
  const año = baseDate.getFullYear()
  const hoy = new Date()
  return (
    <div className="flex-1 overflow-auto custom-scrollbar p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {MESES.map((nombreMes, mesIdx) => {
          const primerDia = new Date(año, mesIdx, 1).getDay()
          const offset = primerDia === 0 ? 6 : primerDia - 1
          const diasMes = new Date(año, mesIdx + 1, 0).getDate()
          const celdas = Array.from({ length: 42 }, (_, i) => i < offset || i >= offset + diasMes ? null : i - offset + 1)
          const esMesActual = hoy.getFullYear() === año && hoy.getMonth() === mesIdx

          return (
            <div key={nombreMes} className="bg-[#13142a]/50 rounded-xl border border-white/5 p-4">
              <h3 className={`text-sm font-semibold mb-3 ${esMesActual ? "text-indigo-400" : "text-slate-300"}`}>{nombreMes}</h3>
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="text-[10px] font-medium text-slate-500">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {celdas.map((d, i) => {
                  if (!d) return <div key={i} />
                  const esHoy = esMesActual && hoy.getDate() === d
                  return (
                    <div key={i} className={`text-xs h-7 flex items-center justify-center rounded-full
                      ${esHoy ? "bg-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.5)] font-bold" : "text-slate-300 hover:bg-white/10 cursor-pointer"}`}>
                      {d}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VistaAgenda({
  eventos, etiquetas, filtros, baseDate,
}: Omit<CalendarioGridProps, "vista" | "fechasSemana" | "hoyDia" | "offsetSemana" | "onEventClick" | "onOpenModal"> & { baseDate: Date }) {
  const [completados, setCompletados] = useState<Set<string>>(new Set())

  const toggleCompletado = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCompletados(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  // Filtrar eventos desde la baseDate hacia el futuro
  const baseIso = formatearISO(baseDate)
  const eventosVisibles = eventos
    .filter(e => filtros[e.etiquetaId] && e.fechaISO >= baseIso)
    .sort((a, b) => a.fechaISO.localeCompare(b.fechaISO) || a.horaInicio - b.horaInicio)

  // Agrupar por fechaISO
  const grupos = eventosVisibles.reduce((acc, ev) => {
    if (!acc[ev.fechaISO]) acc[ev.fechaISO] = []
    acc[ev.fechaISO].push(ev)
    return acc
  }, {} as Record<string, CalendarioEvento[]>)

  const fechasOrdenadas = Object.keys(grupos).sort()

  return (
    <div className="flex-1 overflow-auto custom-scrollbar p-6 w-full">
      <div className="max-w-none w-full">
        {fechasOrdenadas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-600">
            <Clock className="w-10 h-10 opacity-30" />
            <p className="text-sm">No hay eventos próximos en tu agenda</p>
          </div>
        )}

        {fechasOrdenadas.map((iso) => {
          const evsDia = grupos[iso]
          const partes = iso.split("-")
          const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
          const diaSemana = d.getDay() === 0 ? 6 : d.getDay() - 1
          const diaNombre = DIAS_CORTOS[diaSemana]
          const hoyStr = formatearISO(new Date())
          const esHoy = iso === hoyStr

          return (
            <div key={iso} className="mb-8">
              <div className={`flex items-center gap-3 mb-4 pb-2 border-b ${esHoy ? "border-indigo-500/40" : "border-slate-800"}`}>
                <div className={`flex items-center gap-2 ${esHoy ? "text-indigo-400" : "text-slate-300"}`}>
                  <span className="text-sm font-bold uppercase tracking-wider">{diaNombre}</span>
                  <span className="text-sm font-medium text-slate-500">{d.toLocaleDateString("es-PE", { day: "numeric", month: "long" })}</span>
                </div>
                {esHoy && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Hoy</span>}
              </div>

              <div className="space-y-2.5 pl-2">
                {evsDia.map(ev => {
                  const etiqueta = etiquetas.find(e => e.id === ev.etiquetaId)
                  const s = getEstiloColor(etiqueta ? etiqueta.color : "indigo")
                  // Por defecto, permitir completado en cualquier evento para la demo, o filtrarlo por algo específico.
                  // Aquí permitimos interactividad (checkbox) para todos como si fueran tareas
                  const completado = completados.has(ev.id)

                  return (
                    <div key={ev.id} className={`flex items-center gap-4 p-3.5 rounded-xl cursor-pointer transition-all duration-300 border
                      ${completado ? "bg-white/5 border-white/5 opacity-60 grayscale-[0.3]" : `${s.bg} ${s.bgHover} ${s.border} ${s.glow}`}`}>
                      
                      <div onClick={(e) => toggleCompletado(ev.id, e)}
                        className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer
                          ${completado ? "bg-indigo-500 border-indigo-500" : "border-slate-500 hover:border-slate-300"}`}>
                        {completado && <Check className="w-4 h-4 text-white" />}
                      </div>

                      <div className={`flex flex-col items-center shrink-0 w-16 ${completado ? "text-slate-500" : s.text}`}>
                        <span className="text-xs font-bold">{hora12Label(ev.horaInicio, true)}</span>
                        <span className="text-[10px] opacity-70">{hora12Label(ev.horaInicio + ev.duracion, true)}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-semibold truncate transition-all ${completado ? "line-through text-slate-500" : s.text}`}>{ev.titulo}</p>
                        {ev.subtitulo && <p className={`text-xs mt-0.5 truncate transition-all ${completado ? "text-slate-600" : s.sub}`}>{ev.subtitulo}</p>}
                      </div>

                      <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full shrink-0 transition-all ${completado ? "bg-white/5 text-slate-500" : s.badge}`}>
                        {etiqueta ? etiqueta.nombre : "Evento"}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Componente principal exportado ──────────────────────────────────────────

export function CalendarioGrid(props: CalendarioGridProps) {
  const { vista } = props

  if (vista === "Semana") return <VistaSemana {...props} onCeldaClick={props.onOpenModal} />
  if (vista === "Día") return <VistaDia {...props} onCeldaClick={props.onOpenModal} />
  if (vista === "Mes") return <VistaMes {...props} onCeldaClick={props.onOpenModal} />
  if (vista === "Año") return <VistaAño {...props} />
  if (vista === "Agenda") return <VistaAgenda {...props} />

  return null
}
