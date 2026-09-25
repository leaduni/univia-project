"use client"

// Agenda Inteligente — Orquestador principal del SmartSchedule
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  Sparkles, Wand2, Calendar, Clock, AlertTriangle, ChevronLeft,
  ChevronRight, Plus, Loader2, X, CheckSquare, AlignLeft, RefreshCw, Zap,
  PanelRightClose, PanelRightOpen, CalendarDays, CalendarRange, List,
  Check, LayoutGrid, Layers, Tag, MapPin, Repeat, Video, Bell, Users, ChevronDown, Pencil, Trash2, Settings, UploadCloud, FileText,
  Play, Pause, RotateCcw, CheckCircle2, Brain, Coffee, Send, Info, Maximize2, Minimize2, GraduationCap
} from "lucide-react"

import {
  CalendarioGrid,
  type CalendarioEvento,
  type CalendarioVista,
  type Etiqueta,
  type ColorEtiqueta,
  type OpenModalParams,
  getEstiloColor
} from "./calendar-grid"
import { useSemesterRecurrence } from "@/lib/hooks/use-semester"
import { FocusMode } from "./focus-mode"
import { BarraIA } from "./barra-ia"
import { AddCourseSectionModal } from "./AddCourseSectionModal"
import {
  fetchEventos, crearEvento, editarEvento, eliminarEvento,
  fetchEtiquetas, crearEtiqueta as crearEtiquetaAPI,
  fetchConfiguracion, guardarConfiguracion,
  registrarSesion, fetchProductividad,
  type AgendaEvento, type AgendaEtiqueta, type AgendaConfiguracion, type Productividad
} from "@/lib/agenda-service"

// ─── Tipos y Helpers ──────────────────────────────────────────────────────────

type TipoNuevo = "Evento" | "Tarea"

interface Examen {
  id: string
  nombre: string
  fechaTarget: Date
}

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const HORA_INI = 0

function formatearISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function countdown(ms: number) {
  if (ms <= 0) return { txt: "Vencido", urgente: true }
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return { txt: d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`, urgente: d < 2 }
}

// ─── Fallback data (used when API is not available) ───────────────────────────

const ETIQUETAS_BASE: Etiqueta[] = [
  { id: "c1", nombre: "Clases Univ.", color: "indigo" },
  { id: "c2", nombre: "Evaluaciones", color: "rose" },
  { id: "c3", nombre: "Deporte", color: "emerald" },
  { id: "c4", nombre: "Bloques de Estudio", color: "fuchsia" },
]

/** Convierte etiquetas de la API (id numérico) al formato del componente (id string). */
function apiEtiquetaToLocal(e: AgendaEtiqueta): Etiqueta {
  return { id: String(e.id), nombre: e.nombre, color: e.color as any }
}

/** Convierte evento de la API al formato del componente CalendarioEvento. */
function apiEventoToLocal(e: AgendaEvento): CalendarioEvento {
  return {
    id: String(e.id),
    titulo: e.titulo,
    subtitulo: e.subtitulo || e.descripcion || undefined,
    etiquetaId: e.etiqueta_id ? String(e.etiqueta_id) : "",
    tipo: e.tipo === 'examen' ? 'examen' : undefined,
    fechaISO: e.fecha_iso,
    fechaFinISO: e.fecha_fin_iso || undefined,
    horaInicio: e.hora_inicio,
    duracion: e.duracion,
    todoElDia: e.todo_el_dia,
    recurrencia: e.recurrencia === 'none' ? 'No se repite' : e.recurrencia,
    ubicacion: e.ubicacion || undefined,
    videollamada: e.videollamada || undefined,
    completed: e.completed,
  }
}

// ─── Componentes Pequeños ─────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, dot }: { checked: boolean; onChange: () => void; label: string; dot: string }) {
  return (
    <button onClick={onChange} 
      className={`flex items-center justify-between w-full p-2.5 rounded-xl transition-all duration-200 border
        ${checked ? "bg-white/[0.04] border-white/10 shadow-sm" : "bg-transparent border-transparent hover:bg-white/[0.02]"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 shrink-0
          ${checked ? "scale-100" : "scale-90 opacity-50"}`} 
          style={{ 
            background: checked ? dot : 'transparent', 
            border: checked ? 'none' : `2px solid ${dot}`,
            boxShadow: checked ? `0 0 12px ${dot}80` : 'none' 
          }}>
          {checked && <Check className="w-2.5 h-2.5 text-white/90" strokeWidth={3} />}
        </div>
        <span className={`text-xs font-semibold transition-colors ${checked ? "text-slate-100" : "text-slate-500"}`}>
          {label}
        </span>
      </div>
    </button>
  )
}

function WidgetProductividadSemanal({ 
  eventos, etiquetas 
}: { 
  eventos: CalendarioEvento[]
  etiquetas: Etiqueta[]
}) {
  const [horasEstudio, setHorasEstudio] = useState(0)
  const [pct, setPct] = useState(0)
  const GOAL_HORAS = 20

  useEffect(() => {
    const d = new Date()
    const diaSemana = d.getDay() === 0 ? 6 : d.getDay() - 1
    const lunes = new Date(d); lunes.setDate(d.getDate() - diaSemana)
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6)
    
    let total = 0
    for (const ev of eventos) {
      if (ev.completed) {
        const evDate = new Date(ev.fechaISO + "T00:00:00")
        if (evDate >= lunes && evDate <= domingo) {
          const etq = etiquetas.find(e => e.id === ev.etiquetaId)
          if (etq && etq.nombre === "Bloques de Estudio") {
            total += ev.duracion
          }
        }
      }
    }
    
    setHorasEstudio(total)
    setPct(Math.min(100, (total / GOAL_HORAS) * 100))
  }, [eventos, etiquetas])

  const circ = 2 * Math.PI * 30
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-[68px] h-[68px] shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 68 68">
          <circle cx="34" cy="34" r="30" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
          <circle cx="34" cy="34" r="30" fill="none" stroke="url(#cgProd)" strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} className="transition-all duration-700" />
          <defs><linearGradient id="cgProd" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" />
          </linearGradient></defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-white">{horasEstudio.toFixed(1).replace(".0", "")}</span>
          <span className="text-[9px] text-slate-400 leading-none -mt-0.5">hrs</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-tight mb-1">Horas de estudio enfocado esta semana</p>
        <p className="text-xs text-slate-400">Meta: {GOAL_HORAS} hrs</p>
      </div>
    </div>
  )
}

function SidebarPomodoro({ evento, onClose, onComplete }: { evento: CalendarioEvento, onClose: () => void, onComplete: (minutos: number, early: boolean) => void }) {
  const [isConfiguring, setIsConfiguring] = useState(true)
  const [focusMinutes, setFocusMinutes] = useState(50)
  const [breakMinutes, setBreakMinutes] = useState(10)
  const [phase, setPhase] = useState<"focus" | "break">("focus")
  const [timeLeft, setTimeLeft] = useState(50 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [totalStudied, setTotalStudied] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleStart = () => {
    setIsConfiguring(false)
    setTimeLeft(focusMinutes * 60)
    setPhase("focus")
    setIsRunning(true)
  }

  useEffect(() => {
    if (!isRunning || isConfiguring) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (phase === "focus") {
            setTotalStudied(t => t + focusMinutes)
            setPhase("break")
            return breakMinutes * 60
          } else {
            setPhase("focus")
            return focusMinutes * 60
          }
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isRunning, isConfiguring, phase, focusMinutes, breakMinutes])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

  const currentTotalSeconds = phase === "focus" ? focusMinutes * 60 : breakMinutes * 60
  const progress = currentTotalSeconds > 0 ? ((currentTotalSeconds - timeLeft) / currentTotalSeconds) * 100 : 0

  if (isConfiguring) {
    const configContent = (
      <div className={`${isFullscreen ? 'w-full max-w-sm scale-110 relative z-10' : ''} bg-[#11121d] border border-white/10 rounded-2xl p-5 shadow-lg relative transition-all duration-300`}>
        <div className="flex justify-between items-center mb-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Brain className="w-3.5 h-3.5 text-purple-400" /> Pomodoro</p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1 hover:bg-white/10 rounded-full transition-colors" title={isFullscreen ? "Minimizar" : "Pantalla completa"}>
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" /></button>
          </div>
        </div>
        <p className="text-sm font-semibold text-white mb-4 truncate">{evento.titulo}</p>
        <div className="space-y-4 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Enfoque (min)</span>
            <input type="number" value={focusMinutes} onChange={e => setFocusMinutes(Number(e.target.value))} className="w-16 bg-white/5 border border-white/10 rounded-lg text-center text-sm font-semibold text-white py-1.5 focus:outline-none focus:border-purple-500" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Descanso (min)</span>
            <input type="number" value={breakMinutes} onChange={e => setBreakMinutes(Number(e.target.value))} className="w-16 bg-white/5 border border-white/10 rounded-lg text-center text-sm font-semibold text-white py-1.5 focus:outline-none focus:border-purple-500" />
          </div>
        </div>
        <button onClick={handleStart} className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all flex items-center justify-center gap-2"><Play className="w-3.5 h-3.5" /> Iniciar Sesión</button>
      </div>
    )

    if (isFullscreen) {
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsFullscreen(false)} />
          {configContent}
        </div>
      )
    }

    return configContent
  }

  const timerContent = (
    <div className={`${isFullscreen ? 'w-full max-w-sm scale-[1.3] relative z-10' : ''} bg-[#11121d] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all duration-500`}>
      <div className={`absolute inset-0 blur-3xl opacity-20 transition-colors duration-1000 ${phase === "focus" ? "bg-purple-500" : "bg-emerald-500"}`} />
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            {phase === "focus" ? <Brain className="w-3.5 h-3.5 text-purple-400" /> : <Coffee className="w-3.5 h-3.5 text-emerald-400" />}
            {phase === "focus" ? "Enfoque" : "Descanso"}
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1 hover:bg-white/10 rounded-full transition-colors" title={isFullscreen ? "Minimizar" : "Pantalla completa"}>
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" /></button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center pb-2">
          <div className="relative w-36 h-36 flex items-center justify-center mb-6">
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              <circle cx="50" cy="50" r="46" fill="none" stroke={phase === "focus" ? "#a855f7" : "#10b981"} strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 46} strokeDashoffset={(2 * Math.PI * 46) * (1 - progress / 100)} className="transition-all duration-1000 ease-linear" />
            </svg>
            <span className="text-4xl font-black text-white tabular-nums tracking-tight">{timeStr}</span>
          </div>

          <div className="flex gap-3 w-full">
            <button onClick={() => setIsRunning(!isRunning)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm">
              {isRunning ? <><Pause className="w-3.5 h-3.5" /> Pausa</> : <><Play className="w-3.5 h-3.5" /> Seguir</>}
            </button>
            <button onClick={() => {
              if (phase === "focus") {
                setTotalStudied(t => t + Math.floor((currentTotalSeconds - timeLeft)/60))
              }
              onComplete(Math.max(totalStudied, focusMinutes), false)
            }} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fin
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in" onClick={() => setIsFullscreen(false)} />
        {timerContent}
      </div>
    )
  }

  return timerContent
}



function CustomDatePicker({ currentDate, onSelect, onClose }: { currentDate: Date, onSelect: (d: Date) => void, onClose: () => void }) {
  const [viewDate, setViewDate] = useState(new Date(currentDate))
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const primerDia = new Date(year, month, 1).getDay()
  const offset = primerDia === 0 ? 6 : primerDia - 1
  const diasMes = new Date(year, month + 1, 0).getDate()
  const celdas = Array.from({ length: 42 }, (_, i) => i < offset || i >= offset + diasMes ? null : i - offset + 1)

  return (
    <div className="absolute top-full left-0 mt-3 p-4 bg-[#151522]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[110] w-72 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        </button>
        <span className="text-sm font-semibold text-slate-100">{MESES[month]} {year}</span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celdas.map((dia, i) => {
          if (!dia) return <div key={i} className="h-8" />
          const esHoy = new Date().toDateString() === new Date(year, month, dia).toDateString()
          const esSeleccionado = currentDate.toDateString() === new Date(year, month, dia).toDateString()
          return (
            <button
              key={i}
              onClick={() => { onSelect(new Date(year, month, dia)); onClose() }}
              className={`h-8 w-full rounded-lg text-xs font-medium flex items-center justify-center transition-all ${esSeleccionado ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25" : esHoy ? "bg-white/10 text-indigo-300 border border-indigo-500/30" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
            >
              {dia}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── DropdownMenu ─────────────────────────────────────────────────────────────

function DropdownMenu({ 
  value, 
  options, 
  onChange, 
  className = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200"
}: { 
  value: string, 
  options: string[], 
  onChange: (v: string) => void,
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="relative">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between gap-2 focus:outline-none focus:border-indigo-500 transition-all ${className}`}>
        <span className="truncate">{value}</span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 min-w-[200px] bg-[#1c1d2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col py-1">
              {options.map(opt => (
                <button key={opt} type="button" onClick={() => { onChange(opt); setIsOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors whitespace-nowrap">
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Modales ──────────────────────────────────────────────────────────────────

const COLORES_DISPONIBLES: ColorEtiqueta[] = ["indigo", "rose", "emerald", "fuchsia", "amber", "sky", "orange"]

interface ModalEventoProps {
  onClose: () => void
  onGuardar: (ev: CalendarioEvento) => void
  prefill?: OpenModalParams | null
  etiquetas: Etiqueta[]
  onOpenCrearEtiqueta: () => void
}

function ModalCrearEvento({ onClose, onGuardar, prefill, etiquetas, onOpenCrearEtiqueta }: ModalEventoProps) {
  const [tipoNuevo, setTipoNuevo] = useState<TipoNuevo>("Evento")
  const [titulo, setTitulo] = useState("")
  
  // Fechas y Horas
  const [todoElDia, setTodoElDia] = useState(false)
  const [fechaIni, setFechaIni] = useState(() => prefill?.fecha ? formatearISO(prefill.fecha) : formatearISO(new Date()))
  const [fechaFin, setFechaFin] = useState(() => prefill?.fecha ? formatearISO(prefill.fecha) : formatearISO(new Date()))
  
  const [horaIni, setHoraIni] = useState(() => {
    if (prefill?.horaInicio !== undefined) {
      const h = Math.floor(HORA_INI + prefill.horaInicio), m = Math.round((prefill.horaInicio % 1) * 60)
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    }
    return "09:00"
  })
  const [horaFin, setHoraFin] = useState(() => {
    if (prefill?.horaFin !== undefined) {
      const h = Math.floor(HORA_INI + prefill.horaFin), m = Math.round((prefill.horaFin % 1) * 60)
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    }
    if (prefill?.horaInicio !== undefined) {
      const h = Math.floor(HORA_INI + prefill.horaInicio + 1)
      return `${String(h).padStart(2, "0")}:00`
    }
    return "10:00"
  })

  // Google Calendar extra fields
  const [recurrencia, setRecurrencia] = useState("No se repite")
  const [ubicacion, setUbicacion] = useState("")
  const [videollamada, setVideollamada] = useState("")
  const [invitados, setInvitados] = useState("")
  const [notificacion, setNotificacion] = useState("10 minutos antes")
  const [desc, setDesc] = useState("")
  const [etiquetaSel, setEtiquetaSel] = useState<string>(etiquetas[0]?.id || "")
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  const etiquetaSeleccionada = etiquetas.find(e => e.id === etiquetaSel)

  const [prevEtiquetasLength, setPrevEtiquetasLength] = useState(etiquetas.length)
  useEffect(() => {
    if (etiquetas.length > prevEtiquetasLength) {
      setEtiquetaSel(etiquetas[etiquetas.length - 1].id)
      setPrevEtiquetasLength(etiquetas.length)
    }
  }, [etiquetas, prevEtiquetasLength])

  const [guardando, setGuardando] = useState(false)

  const handleGuardar = () => {
    if (!titulo.trim()) return
    setGuardando(true)
    setTimeout(() => {
      let ini = 0, dur = 24
      
      if (!todoElDia) {
        const [h, m] = horaIni.split(":").map(Number)
        const [hf, mf] = horaFin.split(":").map(Number)
        ini = h + m / 60 - HORA_INI
        dur = Math.max(0.5, (hf + mf / 60) - (h + m / 60))
      }

      onGuardar({
        id: `ev_${Date.now()}`,
        titulo,
        subtitulo: desc || undefined,
        ubicacion: ubicacion || undefined,
        videollamada: videollamada || undefined,
        todoElDia,
        recurrencia,
        etiquetaId: etiquetaSel,
        fechaISO: fechaIni,
        fechaFinISO: fechaFin !== fechaIni ? fechaFin : undefined,
        horaInicio: Math.max(0, ini),
        duracion: dur
      })
      onClose()
    }, 500)
  }

  // Clic fuera para cerrar
  const modalRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center safe-modal-padding">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />
      <div ref={modalRef} className="relative z-10 w-full max-w-lg bg-[#151522]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header & Tabs */}
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
              {(["Evento", "Tarea"] as TipoNuevo[]).map(t => (
                <button key={t} onClick={() => setTipoNuevo(t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tipoNuevo === t ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          
          {/* Título Principal */}
          <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus
            placeholder="Añade un título..."
            className="w-full bg-transparent text-2xl font-semibold text-white placeholder-slate-500 focus:outline-none" />
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          
          {/* Fechas y Horas */}
          <div className="flex gap-4 items-start">
            <Clock className="w-5 h-5 text-slate-400 mt-2 shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center flex-wrap gap-2 text-sm text-slate-200">
                <input type="date" value={fechaIni} onChange={e => setFechaIni(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                
                {!todoElDia && (
                  <>
                    <input type="time" value={horaIni} onChange={e => setHoraIni(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 [color-scheme:dark] w-24" />
                    <span className="text-slate-500">-</span>
                    <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 [color-scheme:dark] w-24" />
                  </>
                )}
                
                {(!todoElDia || fechaFin !== fechaIni) && (
                  <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                )}
              </div>
              
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`relative w-8 h-4.5 rounded-full transition-colors ${todoElDia ? "bg-indigo-500" : "bg-white/10"}`}>
                    <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${todoElDia ? "translate-x-3.5" : "translate-x-0"}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">Todo el día</span>
                </label>
                
                {tipoNuevo === "Evento" && (
                  <DropdownMenu 
                    value={recurrencia} 
                    onChange={setRecurrencia} 
                    options={["No se repite", "Cada día", "Cada semana", "Días laborables (lun-vie)"]} 
                    className="bg-transparent text-xs font-medium text-slate-400 hover:text-slate-200 px-1 py-1"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Calendario / Etiqueta */}
          <div className="flex gap-4 items-center">
            <CalendarDays className="w-5 h-5 text-slate-400 shrink-0" />
            <div className="flex-1 relative">
              <button onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all">
                <div className="flex items-center gap-2.5">
                  {etiquetaSeleccionada && <div className="w-3 h-3 rounded-full" style={{ background: getEstiloColor(etiquetaSeleccionada.color).dot }} />}
                  <span>{etiquetaSeleccionada ? etiquetaSeleccionada.nombre : "Seleccionar Etiqueta"}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              
              {isTagDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsTagDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c1d2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {etiquetas.map(etq => (
                        <button key={etq.id} onClick={() => { setEtiquetaSel(etq.id); setIsTagDropdownOpen(false) }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors">
                          <div className="w-3 h-3 rounded-full" style={{ background: getEstiloColor(etq.color).dot }} />
                          {etq.nombre}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-white/10">
                      <button onClick={() => { setIsTagDropdownOpen(false); onOpenCrearEtiqueta(); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-indigo-400 hover:bg-white/5 transition-colors">
                        <Plus className="w-4 h-4" /> Crear nueva etiqueta...
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {tipoNuevo === "Evento" && (
            <>
              <div className="flex gap-4 items-center">
                <Users className="w-5 h-5 text-slate-400 shrink-0" />
                <input type="text" value={invitados} onChange={e => setInvitados(e.target.value)} placeholder="Añade invitados (correos)"
                  className="w-full bg-transparent border-b border-white/10 pb-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all" />
              </div>

              <div className="flex gap-4 items-center">
                <Video className="w-5 h-5 text-slate-400 shrink-0" />
                <input type="text" value={videollamada} onChange={e => setVideollamada(e.target.value)} placeholder="Añade videollamada de Google Meet o Zoom"
                  className="w-full bg-transparent border-b border-white/10 pb-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all" />
              </div>
              
              <div className="flex gap-4 items-center">
                <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                <input type="text" value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Añade una ubicación"
                  className="w-full bg-transparent border-b border-white/10 pb-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all" />
              </div>

              <div className="flex gap-4 items-center">
                <Bell className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="flex-1">
                  <DropdownMenu 
                    value={notificacion} 
                    onChange={setNotificacion} 
                    options={["5 minutos antes", "10 minutos antes", "30 minutos antes", "1 hora antes", "1 día antes"]} 
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-4 items-start">
            <AlignLeft className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Añade una descripción..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none transition-all" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-[#11121d] border-t border-white/5">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={!titulo.trim() || guardando}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalCrearEtiqueta({ onClose, onCrear }: { onClose: () => void, onCrear: (etq: Etiqueta) => void }) {
  const [nombre, setNombre] = useState("")
  const [color, setColor] = useState<ColorEtiqueta>("indigo")
  const [creando, setCreando] = useState(false)

  const handleCrear = () => {
    if (!nombre.trim()) return
    setCreando(true)
    setTimeout(() => {
      onCrear({ id: `c_${Date.now()}`, nombre: nombre.trim(), color })
      onClose()
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center safe-modal-padding">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-[#151522]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-white/[0.08] flex justify-between items-center">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Tag className="w-4 h-4 text-indigo-400" /> Nueva Etiqueta</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="text-xs text-slate-400 mb-2 block font-medium">Nombre</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus placeholder="Ej. Tesis, Deportes..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-2 block font-medium">Color</label>
            <div className="flex flex-wrap gap-2.5">
              {COLORES_DISPONIBLES.map(c => {
                const bg = getEstiloColor(c).dot
                const isSelected = color === c
                return (
                  <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isSelected ? "ring-2 ring-offset-2 ring-offset-[#151522]" : "opacity-60 hover:opacity-100 hover:scale-110"}`} style={{ background: bg, "--tw-ring-color": bg } as React.CSSProperties}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white/90" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/[0.05] bg-[#11121d]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all">Cancelar</button>
          <button onClick={handleCrear} disabled={!nombre.trim() || creando} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all flex items-center gap-1.5">
            {creando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Crear Etiqueta"}
          </button>
        </div>
      </div>
    </div>
  )
}

function EventDetailPopover({ evento, etiqueta, onClose, onEdit, onDelete, onStartFocus, onToggleCompleted, onOpenAI }: { evento: CalendarioEvento, etiqueta: Etiqueta, onClose: () => void, onEdit: () => void, onDelete: () => void, onStartFocus?: () => void, onToggleCompleted?: () => void, onOpenAI: (ctx: string) => void }) {
  const s = getEstiloColor(etiqueta.color)
  const esEstudio = etiqueta.nombre === "Bloques de Estudio"
  
  const f = (h: number) => {
    const hh = Math.floor(h)
    const mm = Math.round((h - hh) * 60)
    const ampm = hh >= 12 && hh < 24 ? "PM" : "AM"
    const h12 = hh % 12 || 12
    return `${h12}:${mm.toString().padStart(2, "0")} ${ampm}`
  }
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center safe-modal-padding">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-[#151522]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 shadow-sm mt-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.dot }} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{etiqueta.nombre}</span>
          </div>
          <div className="flex gap-1 bg-[#11121d] rounded-full p-1 border border-white/5">
            <button onClick={onEdit} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-indigo-400">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="w-8 h-8 rounded-full hover:bg-rose-500/10 flex items-center justify-center transition-colors text-slate-400 hover:text-rose-500">
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-white/10 my-auto mx-1" />
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2 leading-tight pr-4">{evento.titulo}</h2>
        <div className="flex items-center gap-2 text-sm text-slate-300 mb-5">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{new Date(evento.fechaISO + "T00:00:00").toLocaleDateString("es-PE", { weekday: 'short', day: 'numeric', month: 'long' })}</span>
          <span className="text-slate-500">•</span>
          <span>{evento.todoElDia ? "Todo el día" : `${f(evento.horaInicio)} a ${f(evento.horaInicio + evento.duracion)}`}</span>
        </div>
        
        {evento.subtitulo && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 mb-5 max-h-32 overflow-y-auto custom-scrollbar shadow-inner">
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{evento.subtitulo}</p>
          </div>
        )}
        
        {(evento.ubicacion || evento.videollamada) && (
          <div className="space-y-3 mt-2 bg-[#11121d] p-4 rounded-xl border border-white/5">
            {evento.videollamada && (
              <div className="flex gap-3 items-center text-sm text-slate-300">
                <Video className="w-4 h-4 text-indigo-400" /> 
                <span className="truncate">{evento.videollamada}</span>
              </div>
            )}
            {evento.ubicacion && (
              <div className="flex gap-3 items-center text-sm text-slate-300">
                <MapPin className="w-4 h-4 text-rose-400" /> 
                <span className="truncate">{evento.ubicacion}</span>
              </div>
            )}
          </div>
        )}
        
        {evento.tipo === 'examen' && (
          <div className="mt-5 border-t border-white/5 pt-5">
            <button onClick={() => {
              onOpenAI(evento.titulo)
              onClose()
            }} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600/80 to-purple-600/80 hover:from-rose-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md border border-white/20 hover:scale-[1.02]">
              <Sparkles className="w-4 h-4" /> Repasar con IA
            </button>
          </div>
        )}
        
        {esEstudio && onStartFocus && (
          <div className="mt-5 border-t border-white/5 pt-5 space-y-3">
            <button onClick={onStartFocus} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] border border-white/20 hover:scale-[1.02] active:scale-95">
              <Play className="w-4 h-4" /> {evento.completed ? "Nueva Sesión Pomodoro" : "Iniciar Sesión de Estudio"}
            </button>
            
            {evento.completed && onToggleCompleted && (
              <button onClick={() => { onToggleCompleted(); onClose() }} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-white/5 flex items-center justify-center gap-2">
                <RotateCcw className="w-3.5 h-3.5" /> Desmarcar como completado
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ModalAjustesGeneral({ 
  sleepSettings, onSaveSleep,
  semesterSettings, onSaveSemester,
  onClose
}: { 
  sleepSettings: { start: string, end: string }, 
  onSaveSleep: (s: { start: string, end: string }) => void,
  semesterSettings: { start: string, end: string },
  onSaveSemester: (s: { start: string, end: string }) => void,
  onClose: () => void 
}) {
  const to12h = (t24: string) => {
    if (!t24) return "12:00 AM"
    const [hStr, mStr] = t24.split(":")
    let h = parseInt(hStr, 10)
    const period = h >= 12 ? "PM" : "AM"
    h = h % 12 || 12
    return `${h}:${mStr} ${period}`
  }

  const to24h = (t12: string) => {
    if (!t12) return "00:00"
    const [time, period] = t12.split(" ")
    const [hStr, mStr] = time.split(":")
    let h = parseInt(hStr, 10)
    if (period === "PM" && h !== 12) h += 12
    if (period === "AM" && h === 12) h = 0
    return `${h.toString().padStart(2, "0")}:${mStr}`
  }

  const [start12, setStart12] = useState(() => to12h(sleepSettings.start))
  const [end12, setEnd12] = useState(() => to12h(sleepSettings.end))
  const [semStart, setSemStart] = useState(semesterSettings.start)
  const [semEnd, setSemEnd] = useState(semesterSettings.end)

  const timeOptions = useMemo(() => {
    const opts = []
    for (let i = 0; i < 24 * 4; i++) {
      const h = Math.floor(i / 4)
      const m = (i % 4) * 15
      const period = h >= 12 ? "PM" : "AM"
      const h12 = h % 12 || 12
      opts.push(`${h12}:${m.toString().padStart(2, "0")} ${period}`)
    }
    return opts
  }, [])

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center safe-modal-padding">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-[#151522]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-white/[0.08] flex justify-between items-center">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Settings className="w-4 h-4 text-indigo-400" /> Configuración</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        
        <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Configuración de Sueño */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-indigo-400" /> Horas de Sueño</h3>
            <div>
              <label className="text-xs text-slate-400 mb-2 block font-medium">Hora de dormir</label>
              <DropdownMenu value={start12} onChange={setStart12} options={timeOptions} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block font-medium">Hora de despertar</label>
              <DropdownMenu value={end12} onChange={setEnd12} options={timeOptions} />
            </div>
          </div>

          {/* Configuración de Semestre */}
          <div className="space-y-4 border-t border-white/5 pt-4">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 text-rose-400" /> Fechas del Semestre</h3>
            <div>
              <label className="text-xs text-slate-400 mb-2 block font-medium">Día de inicio de clases</label>
              <input type="date" value={semStart} onChange={e => setSemStart(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block font-medium">Día de fin de ciclo</label>
              <input type="date" value={semEnd} onChange={e => setSemEnd(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/[0.05] bg-[#11121d] rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all">Cancelar</button>
          <button onClick={() => { 
            onSaveSleep({ start: to24h(start12), end: to24h(end12) }); 
            onSaveSemester({ start: semStart, end: semEnd });
            onClose(); 
          }} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all">Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

const VISTA_ICONS: Record<CalendarioVista, any> = {
  "Día": CalendarDays, "Semana": Calendar, "Mes": CalendarRange, "Año": LayoutGrid, "Agenda": List,
}

export function AgendaInteligente() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentView, setCurrentView] = useState<CalendarioVista>("Semana")
  const [baseDate, setBaseDate] = useState<Date>(new Date())
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false)
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false)
  
  // Estados de Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [popoverEvent, setPopoverEvent] = useState<CalendarioEvento | null>(null)
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false)
  const [focusEvent, setFocusEvent] = useState<CalendarioEvento | null>(null)
  const [pomodoroStartTime, setPomodoroStartTime] = useState<string | null>(null)

  // -- Reprogramación Anti-culpa --
  const handleAutoReschedule = useCallback(async (eventoId: string) => {
    const numId = parseInt(eventoId)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const iso = formatearISO(tomorrow)

    // Actualizar local inmediatamente
    setEventos(prev => prev.map(ev => {
      if (ev.id === eventoId) return { ...ev, fechaISO: iso, horaInicio: 18, completed: false }
      return ev
    }))

    // Persistir en backend
    if (!isNaN(numId)) {
      editarEvento(numId, { fecha_iso: iso, hora_inicio: 18, completed: false }).catch(() => {})
    }
  }, [])
  
  // Settings de Sueño y Semestre
  const [sleepSettings, setSleepSettings] = useState({ start: "23:00", end: "07:00" })
  const [semesterSettings, setSemesterSettings] = useState(() => {
    const d = new Date()
    const dEnd = new Date(d)
    dEnd.setMonth(d.getMonth() + 4)
    return { start: formatearISO(d), end: formatearISO(dEnd) }
  })
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false)
  const [isCourseSectionModalOpen, setIsCourseSectionModalOpen] = useState(false)
  const [isIntegrationsDropdownOpen, setIsIntegrationsDropdownOpen] = useState(false)
  
  // Estados de UI y Datos
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>(ETIQUETAS_BASE)
  const [isTagsExpanded, setIsTagsExpanded] = useState(false)
  const [filtros, setFiltros] = useState<Record<string, boolean>>(ETIQUETAS_BASE.reduce((acc, e) => ({ ...acc, [e.id]: true }), {}))
  const [eventos, setEventos] = useState<CalendarioEvento[]>([])
  const [modalPrefill, setModalPrefill] = useState<OpenModalParams | null>(null)
  const [apiReady, setApiReady] = useState(false)

  // ─ Cargar datos del backend al montar ─
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Cargar etiquetas desde el backend
        const etqs = await fetchEtiquetas()
        if (cancelled) return
        const localEtqs = etqs.map(apiEtiquetaToLocal)
        setEtiquetas(localEtqs)
        setFiltros(localEtqs.reduce((acc, e) => ({ ...acc, [e.id]: true }), {} as Record<string, boolean>))

        // Cargar eventos
        const evs = await fetchEventos()
        if (cancelled) return
        setEventos(evs.map(apiEventoToLocal))

        // Cargar configuración
        const cfg = await fetchConfiguracion()
        if (cancelled) return
        setSleepSettings({ start: cfg.sleep_start, end: cfg.sleep_end })
        if (cfg.semester_start && cfg.semester_end) {
          setSemesterSettings({ start: cfg.semester_start, end: cfg.semester_end })
        }

        setApiReady(true)
      } catch (err) {
        console.warn("[Agenda] API no disponible, usando datos locales:", err)
        // Mantener los datos fallback ya inicializados
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const semDates = useSemesterRecurrence(semesterSettings.start, semesterSettings.end)

  // Generar recurrencias locales solo para eventos con recurrencia semanal
  const eventosConRecurrencia = useMemo(() => {
    const generados: CalendarioEvento[] = []
    const normales: CalendarioEvento[] = []

    for (const ev of eventos) {
      if (ev.recurrencia && ev.recurrencia !== 'No se repite' && ev.recurrencia !== 'none') {
        const dateObj = new Date(ev.fechaISO + "T00:00:00")
        const dayOfWeek = dateObj.getDay()
        const occurrences = semDates.generateRecurringDates(dayOfWeek)
        for (const occ of occurrences) {
          generados.push({
            ...ev,
            id: `${ev.id}_gen_${occ.getTime()}`,
            fechaISO: formatearISO(occ)
          })
        }
      } else {
        normales.push(ev)
      }
    }
    return [...normales, ...generados]
  }, [eventos, semDates])

  // Derivar exámenes/evaluaciones próximas dinámicamente desde los eventos reales del usuario
  const examenesProximos = useMemo(() => {
    const evalEtq = etiquetas.find(e => 
      e.nombre.toLowerCase().includes("evalua") || 
      e.nombre.toLowerCase().includes("examen") ||
      e.nombre.toLowerCase().includes("parcial") ||
      e.nombre.toLowerCase().includes("final")
    )
    const now = new Date()
    return eventos
      .filter(ev => ev.tipo === 'examen' || (evalEtq && ev.etiquetaId === evalEtq.id))
      .map(ev => {
        const h = Math.floor(ev.horaInicio)
        const m = Math.round((ev.horaInicio - h) * 60)
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`
        const fechaTarget = new Date(`${ev.fechaISO}T${timeStr}`)
        return { id: ev.id, nombre: ev.titulo, fechaTarget }
      })
      .filter(ex => ex.fechaTarget.getTime() >= now.getTime() - 86400000)
      .sort((a, b) => a.fechaTarget.getTime() - b.fechaTarget.getTime())
      .slice(0, 5)
  }, [eventos, etiquetas])
  
  // Modo Semana de Exámenes
  const [examWeekMode, setExamWeekMode] = useState(false)

  const openAIPanel = (context: string) => {
    window.dispatchEvent(new CustomEvent("open-univia-chat", { detail: { initialContext: context } }))
  }

  const filtrosEfectivos = useMemo(() => {
    if (!examWeekMode) return filtros
    const res = { ...filtros }
    const clasesEtq = etiquetas.find(e => e.nombre === "Clases Univ.")
    const deporteEtq = etiquetas.find(e => e.nombre === "Deporte")
    if (clasesEtq) res[clasesEtq.id] = false
    if (deporteEtq) res[deporteEtq.id] = false
    return res
  }, [filtros, examWeekMode, etiquetas])

  // ─ Lógica de Navegación Dinámica ─
  const navegar = (dir: "prev" | "next" | "hoy") => {
    if (dir === "hoy") { setBaseDate(new Date()); return }
    const n = new Date(baseDate)
    const factor = dir === "next" ? 1 : -1
    if (currentView === "Día" || currentView === "Agenda") n.setDate(n.getDate() + factor)
    else if (currentView === "Semana") n.setDate(n.getDate() + factor * 7)
    else if (currentView === "Mes") n.setMonth(n.getMonth() + factor)
    else if (currentView === "Año") n.setFullYear(n.getFullYear() + factor)
    setBaseDate(n)
  }

  // ─ Generador de Título del Header ─
  const getHeaderTitle = () => {
    if (currentView === "Día") return baseDate.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })
    if (currentView === "Semana") {
      const d = new Date(baseDate), diaSemana = d.getDay() === 0 ? 6 : d.getDay() - 1
      const lunes = new Date(d); lunes.setDate(lunes.getDate() - diaSemana)
      const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6)
      const mesFin = domingo.toLocaleDateString("es-PE", { month: "long" })
      const mesCapitalized = mesFin.charAt(0).toUpperCase() + mesFin.slice(1)
      return `${mesCapitalized} ${domingo.getFullYear()}`
    }
    if (currentView === "Mes") return `${MESES[baseDate.getMonth()]} ${baseDate.getFullYear()}`
    if (currentView === "Año") return `${baseDate.getFullYear()}`
    if (currentView === "Agenda") return `Agenda: A partir del ${baseDate.toLocaleDateString("es-PE", { day: "numeric", month: "long" })}`
    return ""
  }

  const fechasSemana = useMemo(() => {
    const d = new Date(baseDate), diaSemana = d.getDay() === 0 ? 6 : d.getDay() - 1
    const lunes = new Date(d); lunes.setDate(d.getDate() - diaSemana)
    return DIAS_CORTOS.map((_: string, i: number) => { const n = new Date(lunes); n.setDate(lunes.getDate() + i); return n })
  }, [baseDate])

  const hoyDiaRelativo = baseDate.getDay() === 0 ? 6 : baseDate.getDay() - 1
  const toggleFiltro = useCallback((id: string) => setFiltros(p => ({ ...p, [id]: !p[id] })), [])

  return (
    <>
      {isCreateModalOpen && (
        <ModalCrearEvento
          onClose={() => { setIsCreateModalOpen(false); setModalPrefill(null) }}
          onGuardar={async (ev) => {
            // Agregar localmente inmediato para UI responsiva
            setEventos(prev => [...prev, ev])
            // Persistir en backend
            try {
              const recMap: Record<string, string> = { 'No se repite': 'none', 'Cada día': 'daily', 'Cada semana': 'weekly', 'Días laborables (lun-vie)': 'weekdays' }
              const saved = await crearEvento({
                titulo: ev.titulo,
                subtitulo: ev.subtitulo,
                tipo: ev.tipo === 'examen' ? 'examen' : 'evento',
                etiqueta_id: ev.etiquetaId ? parseInt(ev.etiquetaId) : null,
                fecha_iso: ev.fechaISO,
                fecha_fin_iso: ev.fechaFinISO,
                hora_inicio: ev.horaInicio,
                duracion: ev.duracion,
                todo_el_dia: ev.todoElDia || false,
                recurrencia: recMap[ev.recurrencia || ''] || 'none',
                ubicacion: ev.ubicacion,
                videollamada: ev.videollamada,
                descripcion: ev.subtitulo,
              })
              // Reemplazar el evento local con el del backend (tiene ID real)
              setEventos(prev => prev.map(e => e.id === ev.id ? apiEventoToLocal(saved) : e))
            } catch (err) {
              console.warn("[Agenda] No se pudo guardar en backend:", err)
            }
          }}
          prefill={modalPrefill}
          etiquetas={etiquetas}
          onOpenCrearEtiqueta={() => setIsTagModalOpen(true)}
        />
      )}

      {isTagModalOpen && (
        <ModalCrearEtiqueta
          onClose={() => setIsTagModalOpen(false)}
          onCrear={async (etq) => {
            // Agregar localmente
            setEtiquetas(p => [...p, etq])
            setFiltros(p => ({ ...p, [etq.id]: true }))
            // Persistir en backend
            try {
              const saved = await crearEtiquetaAPI({ nombre: etq.nombre, color: etq.color })
              const localSaved = apiEtiquetaToLocal(saved)
              setEtiquetas(p => p.map(e => e.id === etq.id ? localSaved : e))
              setFiltros(p => { const n = { ...p }; delete n[etq.id]; n[localSaved.id] = true; return n })
            } catch (err) {
              console.warn("[Agenda] No se pudo crear etiqueta en backend:", err)
            }
          }}
        />
      )}

      {isSleepModalOpen && (
        <ModalAjustesGeneral
          sleepSettings={sleepSettings}
          onSaveSleep={(s) => {
            setSleepSettings(s)
            guardarConfiguracion({ sleep_start: s.start, sleep_end: s.end }).catch(() => {})
          }}
          semesterSettings={semesterSettings}
          onSaveSemester={(s) => {
            setSemesterSettings(s)
            guardarConfiguracion({ semester_start: s.start, semester_end: s.end }).catch(() => {})
          }}
          onClose={() => setIsSleepModalOpen(false)}
        />
      )}



      {popoverEvent && (
        <EventDetailPopover
          evento={popoverEvent}
          etiqueta={etiquetas.find(e => e.id === popoverEvent.etiquetaId) || ETIQUETAS_BASE[0]}
          onClose={() => setPopoverEvent(null)}
          onOpenAI={openAIPanel}
          onDelete={() => {
            setEventos(p => p.filter(ev => ev.id !== popoverEvent.id))
            setPopoverEvent(null)
            const numId = parseInt(popoverEvent.id)
            if (!isNaN(numId)) eliminarEvento(numId).catch(() => {})
          }}
          onEdit={() => {
            setModalPrefill({ horaInicio: popoverEvent.horaInicio, fecha: new Date(popoverEvent.fechaISO + "T00:00:00") })
            setPopoverEvent(null)
            setIsCreateModalOpen(true)
          }}
          onStartFocus={() => {
            setPopoverEvent(null)
            setFocusEvent(popoverEvent)
            setPomodoroStartTime(new Date().toISOString())
            setIsFocusModeOpen(true)
            setIsSidebarOpen(true)
          }}
          onToggleCompleted={() => {
            const newCompleted = !popoverEvent.completed
            setEventos(prev => prev.map(ev => ev.id === popoverEvent.id ? { ...ev, completed: newCompleted } : ev))
            const numId = parseInt(popoverEvent.id)
            if (!isNaN(numId)) editarEvento(numId, { completed: newCompleted }).catch(() => {})
          }}
        />
      )}

      {isFocusModeOpen && focusEvent && (
        <FocusMode
          evento={focusEvent}
          onClose={() => { setIsFocusModeOpen(false); setFocusEvent(null) }}
          onComplete={(minutosEstudiados, isFinishedEarly) => {
            if (!isFinishedEarly) {
              setEventos(prev => prev.map(ev => ev.id === focusEvent.id ? { ...ev, completed: true } : ev))
            }
            setIsFocusModeOpen(false)
            setFocusEvent(null)
          }}
        />
      )}

      {isCourseSectionModalOpen && (
        <AddCourseSectionModal
          onClose={() => setIsCourseSectionModalOpen(false)}
          etiquetas={etiquetas}
          semesterStart={semesterSettings.start}
          onAddEvents={async (newEvents) => {
            // Agregar localmente inmediato
            setEventos(prev => [...prev, ...newEvents])
            // Persistir cada evento en backend (excepto los que ya vienen persistidos, p. ej. PDF)
            for (const ev of newEvents) {
              if (ev.__persistido) continue
              try {
                const recMap: Record<string, string> = { 'No se repite': 'none', 'Cada día': 'daily', 'Cada semana': 'weekly', 'Días laborables (lun-vie)': 'weekdays' }
                // Guard: etiquetaId debe ser numérico; ids placeholder como "c1" darían NaN → 422
                const etiquetaIdNum = ev.etiquetaId && /^\d+$/.test(ev.etiquetaId) ? parseInt(ev.etiquetaId) : null
                // Guard: validar fecha/hora antes de enviar
                if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.fechaISO) || !Number.isFinite(ev.horaInicio) || !Number.isFinite(ev.duracion) || ev.duracion <= 0) {
                  console.warn('[Agenda] Evento con datos inválidos omitido:', ev)
                  continue
                }
                const saved = await crearEvento({
                  titulo: ev.titulo,
                  subtitulo: ev.subtitulo,
                  tipo: 'evento',
                  etiqueta_id: etiquetaIdNum,
                  fecha_iso: ev.fechaISO,
                  hora_inicio: ev.horaInicio,
                  duracion: ev.duracion,
                  todo_el_dia: false,
                  recurrencia: recMap[ev.recurrencia || ''] || 'weekly',
                  ubicacion: ev.ubicacion,
                })
                setEventos(prev => prev.map(e => e.id === ev.id ? apiEventoToLocal(saved) : e))
              } catch (err) {
                console.warn('[Agenda] No se pudo guardar clase:', err)
              }
            }
          }}
        />
      )}

      <div className="flex flex-col gap-4" style={{ maxWidth: "1800px", margin: "0 auto", padding: "16px" }}>

        {/* ── BARRA SUPERIOR ─────────────────────────────────────────────── */}
        <div className="bg-[#11121d] border border-white/10 rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <button onClick={() => navegar("hoy")} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-white/5 border border-white/10 hover:bg-white/10 transition-all shadow-sm">Hoy</button>
                <div className="flex rounded-lg overflow-hidden border border-white/10 shadow-sm">
                  <button onClick={() => navegar("prev")} className="w-8 h-7 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"><ChevronLeft className="w-4 h-4 text-slate-400" /></button>
                  <button onClick={() => navegar("next")} className="w-8 h-7 bg-white/5 border-l border-white/10 hover:bg-white/10 flex items-center justify-center transition-all"><ChevronRight className="w-4 h-4 text-slate-400" /></button>
                </div>
                <div className="relative flex items-center ml-2 group">
                  <h2 onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} className="text-base font-bold text-slate-100 tracking-tight group-hover:text-indigo-400 transition-colors flex items-center gap-2 cursor-pointer">
                    {getHeaderTitle()} <Calendar className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                  </h2>
                  {isDatePickerOpen && (
                    <>
                      <div className="fixed inset-0 z-[105]" onClick={() => setIsDatePickerOpen(false)} />
                      <CustomDatePicker currentDate={baseDate} onSelect={setBaseDate} onClose={() => setIsDatePickerOpen(false)} />
                    </>
                  )}
                </div>
              </div>

              <div className="hidden sm:block w-px h-6 bg-white/10 mx-2" />

              <div className="relative">
                <button onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)} className="flex items-center gap-2 px-3.5 h-8 rounded-xl border border-white/10 bg-white/[0.02] shadow-sm text-xs font-medium text-slate-200 hover:bg-white/5 transition-all">
                  {(() => {
                    const Ico = VISTA_ICONS[currentView]
                    return <><Ico className="w-3.5 h-3.5" /> {currentView}</>
                  })()}
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
                </button>
                {isViewDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsViewDropdownOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 w-32 bg-[#1c1d2e] border border-white/10 rounded-xl shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-150">
                      {(["Día", "Semana", "Mes", "Año", "Agenda"] as CalendarioVista[]).map(v => {
                        const Ico = VISTA_ICONS[v]
                        const activo = currentView === v
                        return (
                          <button key={v} onClick={() => { setCurrentView(v); setIsViewDropdownOpen(false) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${activo ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
                            <Ico className="w-3.5 h-3.5" />{v}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <BarraIA />
              
              <div className="flex items-center gap-2">
                {/* Botón de Integraciones */}
                <div className="relative">
                  <button onClick={() => setIsIntegrationsDropdownOpen(!isIntegrationsDropdownOpen)} className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/[0.02] shadow-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all" title="Integraciones y Sincronización">
                    <Zap className="w-4 h-4" />
                  </button>
                  {isIntegrationsDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsIntegrationsDropdownOpen(false)} />
                      <div className="absolute top-full right-0 mt-2 w-max min-w-[200px] bg-[#1c1d2e] border border-white/10 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-4 py-2 border-b border-white/5 mb-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Conexiones</p>
                        </div>
                        <button onClick={() => { setIsIntegrationsDropdownOpen(false); setIsCourseSectionModalOpen(true) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-slate-300 hover:bg-white/5 hover:text-white whitespace-nowrap">
                          <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                          Importar Matrícula
                        </button>
                        <button onClick={() => { setIsIntegrationsDropdownOpen(false); alert("Sincronización con Google Calendar iniciada") }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-slate-300 hover:bg-white/5 hover:text-white whitespace-nowrap">
                          <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0">
                            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                          Google Calendar
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Botón Principal: Crear */}
                <div className="relative">
                  <button onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)} className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all shrink-0">
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Crear</span> <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                  </button>
                  {isCreateDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsCreateDropdownOpen(false)} />
                      <div className="absolute top-full right-0 mt-2 w-48 bg-[#1c1d2e] border border-white/10 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                        <button onClick={() => { setIsCreateDropdownOpen(false); setModalPrefill(null); setIsCreateModalOpen(true) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-slate-200 hover:bg-white/5">
                          <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center shrink-0">
                            <CalendarDays className="w-3.5 h-3.5 text-indigo-400" /> 
                          </div>
                          Nuevo Evento
                        </button>
                        <button onClick={() => { setIsCreateDropdownOpen(false); setModalPrefill(null); setIsCreateModalOpen(true) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-slate-200 hover:bg-white/5 border-t border-white/5">
                          <div className="w-6 h-6 rounded-md bg-rose-500/20 flex items-center justify-center shrink-0">
                            <CheckSquare className="w-3.5 h-3.5 text-rose-400" /> 
                          </div>
                          Nueva Tarea
                        </button>
                        <button onClick={() => { setIsCreateDropdownOpen(false); setIsCourseSectionModalOpen(true) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-slate-200 hover:bg-white/5 border-t border-white/5">
                          <div className="w-6 h-6 rounded-md bg-cyan-500/20 flex items-center justify-center shrink-0">
                            <GraduationCap className="w-3.5 h-3.5 text-cyan-400" /> 
                          </div>
                          Inscribir Cursos 2026-II
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── ÁREA PRINCIPAL ─────────────────────────────────────────────── */}
        <div className="flex gap-4 relative">
          <div className={`flex-1 min-w-0 bg-[#090b1c] border rounded-3xl flex flex-col overflow-hidden h-[calc(100dvh-220px)] transition-all duration-500 ${examWeekMode ? 'border-purple-500/30 shadow-[inset_0_0_20px_rgba(168,85,247,0.05),0_12px_40px_rgba(0,0,0,0.4)]' : 'border-slate-800/60 shadow-[0_12px_40px_rgba(0,0,0,0.4)]'}`}>
            <CalendarioGrid
              vista={currentView}
              eventos={eventosConRecurrencia}
              etiquetas={etiquetas}
              filtros={filtrosEfectivos}
              baseDate={baseDate}
              fechasSemana={fechasSemana}
              sleepSettings={sleepSettings}
              onOpenModal={(params) => { setModalPrefill(params); setIsCreateModalOpen(true) }}
              onEventClick={(ev) => setPopoverEvent(ev)}
              onAutoReschedule={handleAutoReschedule}
            />
          </div>

          {/* Botón de Colapsar (Integrado en el layout flex para evitar superposición) */}
          <div className="flex flex-col justify-center transition-all duration-300 z-30">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="w-5 h-16 flex items-center justify-center bg-[#11121d] border border-white/10 hover:bg-white/20 transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] rounded-md hover:scale-105"
              title={isSidebarOpen ? "Ocultar panel" : "Mostrar panel"}
            >
              {isSidebarOpen ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>

          <div className={`flex flex-col gap-4 overflow-hidden transition-all duration-300 shrink-0 relative`} style={{ width: isSidebarOpen ? "280px" : "0px", opacity: isSidebarOpen ? 1 : 0 }}>
            <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full relative" style={{ width: "280px" }}>
              
              {/* Modo Semana de Exámenes (Toggle reubicado) */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 shadow-lg ${examWeekMode ? 'bg-purple-900/20 border-purple-500/30' : 'bg-[#11121d] border-white/10'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 text-slate-300">
                    <AlertTriangle className={`w-3.5 h-3.5 ${examWeekMode ? 'text-purple-400' : 'text-slate-500'}`} /> Modo Exámenes
                  </p>
                  <button 
                    onClick={() => setExamWeekMode(!examWeekMode)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${examWeekMode ? 'bg-purple-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${examWeekMode ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Oculta las clases y muestra solo Evaluaciones para máxima concentración.
                </p>
              </div>

              {/* Radar Próximo */}
              <div className="bg-[#11121d] border border-white/10 rounded-2xl p-5 shadow-lg">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Radar Próximo</p>
                <div className="space-y-2.5">
                  {examenesProximos.length > 0 ? (
                    examenesProximos.map(ex => {
                      const { txt, urgente } = countdown(ex.fechaTarget.getTime() - new Date().getTime())
                      return (
                        <div key={ex.id} onClick={() => openAIPanel(ex.nombre)} className={`cursor-pointer rounded-xl p-3 transition-all hover:scale-[1.02] ${urgente ? "bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20" : "bg-white/5 border border-white/5 hover:bg-white/10"}`}>
                          <p className="text-xs font-semibold text-slate-200 truncate">{ex.nombre}</p>
                          <p className={`text-[10px] font-mono font-bold mt-1 ${urgente ? "text-rose-400" : "text-indigo-400"}`}>En {txt}</p>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-xs text-slate-500 italic py-1 text-center">Sin exámenes próximos</p>
                  )}
                </div>
              </div>

              {/* Etiquetas Sidebar */}
              <div className="bg-[#11121d] border border-white/10 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-indigo-400" /> Etiquetas</p>
                  <button onClick={() => setIsTagModalOpen(true)} className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center transition-colors">
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-1">
                  {(isTagsExpanded ? etiquetas : etiquetas.slice(0, 4)).map(etq => (
                    <Toggle key={etq.id} checked={filtrosEfectivos[etq.id] || false} onChange={() => toggleFiltro(etq.id)} label={etq.nombre} dot={getEstiloColor(etq.color).dot} />
                  ))}
                  {etiquetas.length > 4 && (
                    <button 
                      onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                      className="w-full text-[10px] text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wider py-2 mt-1 transition-colors text-center"
                    >
                      {isTagsExpanded ? 'Ocultar' : `Ver todas (${etiquetas.length})`}
                    </button>
                  )}
                </div>
              </div>

              {/* Pomodoro o Widget Productividad */}
              {isFocusModeOpen && focusEvent ? (
                <SidebarPomodoro 
                  evento={focusEvent} 
                  onClose={() => { setIsFocusModeOpen(false); setFocusEvent(null); setPomodoroStartTime(null) }} 
                  onComplete={async (minutosEstudiados, isFinishedEarly) => {
                    if (!isFinishedEarly) {
                      setEventos(prev => prev.map(ev => ev.id === focusEvent.id ? { ...ev, completed: true } : ev))
                    }
                    // Registrar sesión en backend
                    try {
                      const numId = parseInt(focusEvent.id)
                      await registrarSesion({
                        evento_id: !isNaN(numId) ? numId : undefined,
                        minutos_configurados: minutosEstudiados,
                        minutos_reales: minutosEstudiados,
                        finalizado_temprano: isFinishedEarly,
                        started_at: pomodoroStartTime || new Date().toISOString(),
                        ended_at: new Date().toISOString(),
                      })
                    } catch (err) {
                      console.warn("[Agenda] No se pudo registrar sesión:", err)
                    }
                    setIsFocusModeOpen(false)
                    setFocusEvent(null)
                    setPomodoroStartTime(null)
                  }}
                />
              ) : (
                <div className="bg-[#11121d] border border-white/10 rounded-2xl p-5 shadow-lg relative">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Productividad</p>
                    <button onClick={() => setIsSleepModalOpen(true)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                      <Settings className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                    </button>
                  </div>
                  <WidgetProductividadSemanal eventos={eventos} etiquetas={etiquetas} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
