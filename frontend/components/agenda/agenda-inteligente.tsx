"use client"

// Agenda Inteligente — Orquestador principal del SmartSchedule
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  Sparkles, Wand2, Calendar, Clock, AlertTriangle, ChevronLeft,
  ChevronRight, Plus, Loader2, X, CheckSquare, AlignLeft,
  PanelRightClose, PanelRightOpen, CalendarDays, CalendarRange, List,
  Check, LayoutGrid, Layers, Tag, MapPin, Repeat, Video, Bell, Users, ChevronDown
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

// ─── Tipos y Helpers ──────────────────────────────────────────────────────────

type TipoNuevo = "Evento" | "Tarea"

interface Examen {
  id: string
  nombre: string
  fechaTarget: Date
}

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const HORA_INI = 8

function formatearISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function countdown(ms: number) {
  if (ms <= 0) return { txt: "Vencido", urgente: true }
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return { txt: d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`, urgente: d < 2 }
}

// ─── Mock data inicial ────────────────────────────────────────────────────────

const ETIQUETAS_BASE: Etiqueta[] = [
  { id: "c1", nombre: "Clases Univ.", color: "indigo" },
  { id: "c2", nombre: "Evaluaciones", color: "rose" },
  { id: "c3", nombre: "Deporte", color: "emerald" },
  { id: "c4", nombre: "Bloques de Estudio", color: "fuchsia" },
]

function getIso(diaOffsetSemanaActual: number) {
  const d = new Date()
  const hoyDia = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - hoyDia + diaOffsetSemanaActual)
  return formatearISO(d)
}

const EVENTOS_BASE: CalendarioEvento[] = [
  { id: "e1", titulo: "Sistemas Operativos", subtitulo: "Aula B-204", etiquetaId: "c1", fechaISO: getIso(0), horaInicio: 0, duracion: 2 },
  { id: "e2", titulo: "Cálculo Diferencial", subtitulo: "Aula A-101", etiquetaId: "c1", fechaISO: getIso(1), horaInicio: 1, duracion: 1.5 },
  { id: "e3", titulo: "Programación Web", subtitulo: "Lab. 3", etiquetaId: "c1", fechaISO: getIso(2), horaInicio: 3, duracion: 2 },
  { id: "e4", titulo: "Base de Datos", subtitulo: "Aula C-305", etiquetaId: "c1", fechaISO: getIso(3), horaInicio: 0.5, duracion: 2 },
  { id: "ex1", titulo: "Parcial SO", subtitulo: "Caps. 1-5 + Threads", etiquetaId: "c2", fechaISO: getIso(4), horaInicio: 5, duracion: 2 },
  { id: "d1", titulo: "Gym — Pierna", subtitulo: "Leg press", etiquetaId: "c3", fechaISO: getIso(0), horaInicio: 4.5, duracion: 1.5 },
  { id: "ia1", titulo: "Repaso: Node.js", subtitulo: "APIs REST", etiquetaId: "c4", fechaISO: getIso(0), horaInicio: 7, duracion: 1.5 },
]

const EXAMENES_MOCK: Examen[] = [
  { id: "x1", nombre: "Parcial Sistemas Operativos", fechaTarget: new Date(Date.now() + 3 * 86400000 + 14400000) },
  { id: "x2", nombre: "Práctica Cálculo Diferencial", fechaTarget: new Date(Date.now() + 5 * 86400000 + 7200000) },
]

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

function RelojDelDia() {
  const [restante, setRestante] = useState("")
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const calc = () => {
      const n = new Date(), fin = new Date(), ini = new Date()
      fin.setHours(22, 0, 0, 0); ini.setHours(8, 0, 0, 0)
      const ms = fin.getTime() - n.getTime()
      const total = fin.getTime() - ini.getTime()
      setPct(Math.min(100, Math.max(0, ((n.getTime() - ini.getTime()) / total) * 100)))
      if (ms <= 0) { setRestante("Día terminado"); return }
      setRestante(`${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`)
    }
    calc(); const t = setInterval(calc, 30000); return () => clearInterval(t)
  }, [])
  const circ = 2 * Math.PI * 30
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-[68px] h-[68px] shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 68 68">
          <circle cx="34" cy="34" r="30" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
          <circle cx="34" cy="34" r="30" fill="none" stroke="url(#cg2)" strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} className="transition-all duration-700" />
          <defs><linearGradient id="cg2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#d946ef" />
          </linearGradient></defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center"><Clock className="w-5 h-5 text-indigo-400" /></div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl font-bold text-white">{restante}</p>
        <p className="text-xs text-slate-400 mt-0.5">de productividad hoy</p>
        <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
          <div className="h-full rounded-full gradient-brand transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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

// ─── Componente Principal ─────────────────────────────────────────────────────

const VISTA_ICONS: Record<CalendarioVista, any> = {
  "Día": CalendarDays, "Semana": Calendar, "Mes": CalendarRange, "Año": LayoutGrid, "Agenda": List,
}

export function AgendaInteligente() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentView, setCurrentView] = useState<CalendarioVista>("Semana")
  
  // Estado de Navegación
  const [baseDate, setBaseDate] = useState<Date>(new Date())

  // Estados de Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  
  // Estados de UI y Datos
  const [prompt, setPrompt] = useState("")
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>(ETIQUETAS_BASE)
  const [filtros, setFiltros] = useState<Record<string, boolean>>(ETIQUETAS_BASE.reduce((acc, e) => ({ ...acc, [e.id]: true }), {}))
  const [eventos, setEventos] = useState<CalendarioEvento[]>(EVENTOS_BASE)
  const [modalPrefill, setModalPrefill] = useState<OpenModalParams | null>(null)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

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
      const mesIni = lunes.toLocaleDateString("es-PE", { month: "short" }), mesFin = domingo.toLocaleDateString("es-PE", { month: "long" })
      return `${lunes.getDate()} ${mesIni !== mesFin ? mesIni : ''} al ${domingo.getDate()} de ${mesFin} ${lunes.getFullYear()}`
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
          onGuardar={(ev) => setEventos(prev => [...prev, ev])}
          prefill={modalPrefill}
          etiquetas={etiquetas}
          onOpenCrearEtiqueta={() => setIsTagModalOpen(true)}
        />
      )}

      {isTagModalOpen && (
        <ModalCrearEtiqueta
          onClose={() => setIsTagModalOpen(false)}
          onCrear={(etq) => { setEtiquetas(p => [...p, etq]); setFiltros(p => ({ ...p, [etq.id]: true })) }}
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

              <div className="flex rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] shadow-sm">
                {(["Día", "Semana", "Mes", "Año", "Agenda"] as CalendarioVista[]).map(v => {
                  const Ico = VISTA_ICONS[v]
                  return (
                    <button key={v} onClick={() => setCurrentView(v)} className={`flex items-center gap-1.5 px-3.5 h-8 text-xs font-medium transition-all duration-200 border-r border-white/5 last:border-r-0 ${currentView === v ? "bg-white/15 text-white shadow-inner" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
                      <Ico className="w-3.5 h-3.5" />{v}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ej: Agenda bloque de repaso..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-indigo-500/50 transition-all shadow-inner" />
              </div>
              <button onClick={() => { setModalPrefill(null); setIsCreateModalOpen(true) }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all shrink-0">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Crear</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── ÁREA PRINCIPAL ─────────────────────────────────────────────── */}
        <div className="flex gap-4 relative">
          <div className="flex-1 min-w-0 bg-[#090b1c] border border-slate-800/60 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden" style={{ minHeight: "680px" }}>
            <CalendarioGrid
              vista={currentView}
              eventos={eventos}
              etiquetas={etiquetas}
              filtros={filtros}
              baseDate={baseDate}
              fechasSemana={fechasSemana}
              onOpenModal={(params) => { setModalPrefill(params); setIsCreateModalOpen(true) }}
              onEventClick={(ev) => { setModalPrefill(null); setIsCreateModalOpen(true) }}
            />
          </div>

          <div className="absolute top-4 z-20 transition-all duration-300" style={{ right: isSidebarOpen ? "calc(280px + 16px - 16px)" : "-16px" }}>
            <button onClick={() => setIsSidebarOpen(p => !p)} className="w-8 h-8 rounded-full bg-[#11121d] border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/10 flex items-center justify-center shadow-lg transition-all">
              {isSidebarOpen ? <PanelRightClose className="w-4 h-4 text-slate-400" /> : <PanelRightOpen className="w-4 h-4 text-slate-400" />}
            </button>
          </div>

          <div className={`flex flex-col gap-4 overflow-hidden transition-all duration-300 shrink-0`} style={{ width: isSidebarOpen ? "280px" : "0px", opacity: isSidebarOpen ? 1 : 0 }}>
            <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full" style={{ width: "280px" }}>
              
              {/* Etiquetas Sidebar */}
              <div className="bg-[#11121d] border border-white/10 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-indigo-400" /> Etiquetas</p>
                  <button onClick={() => setIsTagModalOpen(true)} className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center transition-colors">
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-1">
                  {etiquetas.map(etq => <Toggle key={etq.id} checked={filtros[etq.id] || false} onChange={() => toggleFiltro(etq.id)} label={etq.nombre} dot={getEstiloColor(etq.color).dot} />)}
                </div>
              </div>

              {/* Reloj del Día */}
              <div className="bg-[#11121d] border border-white/10 rounded-2xl p-5 shadow-lg">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-indigo-400" /> Productividad Hoy</p>
                <RelojDelDia />
              </div>

              {/* Radar Próximo */}
              <div className="bg-[#11121d] border border-white/10 rounded-2xl p-5 shadow-lg">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Radar Próximo</p>
                <div className="space-y-2.5">
                  {EXAMENES_MOCK.map(ex => {
                    const { txt, urgente } = countdown(ex.fechaTarget.getTime() - new Date().getTime())
                    return (
                      <div key={ex.id} className={`rounded-xl p-3 transition-all ${urgente ? "bg-rose-500/10 border border-rose-500/20" : "bg-white/5 border border-white/5"}`}>
                        <p className="text-xs font-semibold text-slate-200 truncate">{ex.nombre}</p>
                        <p className={`text-[10px] font-mono font-bold mt-1 ${urgente ? "text-rose-400" : "text-indigo-400"}`}>En {txt}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
