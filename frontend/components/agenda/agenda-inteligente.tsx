"use client"

// Agenda Inteligente — Orquestador principal del SmartSchedule
// Usa CalendarioGrid como motor visual del calendario

import { useState, useEffect, useCallback } from "react"
import {
  Sparkles, Wand2, Calendar, Clock, AlertTriangle, Dumbbell, BookOpen,
  Layers, Chrome, ChevronLeft, ChevronRight, Send, TrendingUp, Target,
  Plus, Loader2, X, CheckSquare, AlignLeft, PanelRightClose, PanelRightOpen,
  CalendarDays, CalendarRange, List, Zap, Check,
} from "lucide-react"

import {
  CalendarioGrid,
  EVENTO_ESTILO,
  type CalendarioEvento,
  type CalendarioVista,
  type EventoTipo,
  type OpenModalParams,
} from "./calendar-grid"

// ─── Tipos internos ───────────────────────────────────────────────────────────

type TipoNuevo = "Evento" | "Tarea"

interface Examen {
  id: string
  nombre: string
  fechaTarget: Date
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const HORA_INI = 8
const HORA_FIN = 22
const TOTAL_H = HORA_FIN - HORA_INI

// ─── Mock data ────────────────────────────────────────────────────────────────

const EVENTOS_BASE: CalendarioEvento[] = [
  { id: "e1", titulo: "Sistemas Operativos", subtitulo: "Aula B-204", tipo: "clase", dia: 0, horaInicio: 0, duracion: 2 },
  { id: "e2", titulo: "Cálculo Diferencial", subtitulo: "Aula A-101", tipo: "clase", dia: 1, horaInicio: 1, duracion: 1.5 },
  { id: "e3", titulo: "Programación Web", subtitulo: "Lab. 3", tipo: "clase", dia: 2, horaInicio: 3, duracion: 2 },
  { id: "e4", titulo: "Base de Datos", subtitulo: "Aula C-305", tipo: "clase", dia: 3, horaInicio: 0.5, duracion: 2 },
  { id: "e5", titulo: "Sistemas Operativos", subtitulo: "Aula B-204", tipo: "clase", dia: 4, horaInicio: 0, duracion: 2 },
  { id: "e6", titulo: "Álgebra Lineal", subtitulo: "Aula D-102", tipo: "clase", dia: 1, horaInicio: 4, duracion: 1.5 },
  { id: "e7", titulo: "Física II", subtitulo: "Lab. Física", tipo: "clase", dia: 3, horaInicio: 5, duracion: 2 },
  { id: "ex1", titulo: "⚠ Parcial SO", subtitulo: "Caps. 1-5 + Threads", tipo: "examen", dia: 4, horaInicio: 5, duracion: 2 },
  { id: "ex2", titulo: "⚠ Práctica Cálculo", subtitulo: "Integrales definidas", tipo: "examen", dia: 2, horaInicio: 8, duracion: 1.5 },
  { id: "d1", titulo: "Gym — Pierna", subtitulo: "Leg press, Hip thrust", tipo: "deporte", dia: 0, horaInicio: 4.5, duracion: 1.5 },
  { id: "d2", titulo: "Gym — Pecho", subtitulo: "Press banca, Fondos", tipo: "deporte", dia: 2, horaInicio: 4.5, duracion: 1.5 },
  { id: "d3", titulo: "Cardio HIIT", subtitulo: "30 min intenso", tipo: "deporte", dia: 4, horaInicio: 9, duracion: 0.5 },
  { id: "d4", titulo: "Gym — Espalda", subtitulo: "Dominadas, Remo", tipo: "deporte", dia: 5, horaInicio: 1, duracion: 1.5 },
  { id: "ia1", titulo: "Repaso IA: Node.js", subtitulo: "APIs REST + Middlewares", tipo: "estudio-ia", dia: 0, horaInicio: 7, duracion: 1.5 },
  { id: "ia2", titulo: "Repaso IA: Threads", subtitulo: "Semáforos y Deadlocks", tipo: "estudio-ia", dia: 1, horaInicio: 5.5, duracion: 2 },
  { id: "ia3", titulo: "Repaso IA: SQL y Databricks", subtitulo: "Joins avanzados", tipo: "estudio-ia", dia: 3, horaInicio: 7, duracion: 1 },
  { id: "ia4", titulo: "Flashcards Cálculo", subtitulo: "Límites y Derivadas", tipo: "estudio-ia", dia: 5, horaInicio: 3, duracion: 2 },
]

const EVENTOS_IA_NUEVOS: CalendarioEvento[] = [
  { id: "ia_n1", titulo: "✨ Bloque IA: Semáforos", subtitulo: "Sesión pre-parcial intensiva", tipo: "estudio-ia", dia: 3, horaInicio: 9, duracion: 1.5 },
  { id: "ia_n2", titulo: "✨ Simulacro Parcial SO", subtitulo: "Casos de examen real", tipo: "estudio-ia", dia: 2, horaInicio: 10, duracion: 1 },
]

const EXAMENES_MOCK: Examen[] = [
  { id: "x1", nombre: "Parcial Sistemas Operativos", fechaTarget: new Date(Date.now() + 3 * 86400000 + 14400000) },
  { id: "x2", nombre: "Práctica Cálculo Diferencial", fechaTarget: new Date(Date.now() + 5 * 86400000 + 7200000) },
  { id: "x3", nombre: "Examen Final Base de Datos", fechaTarget: new Date(Date.now() + 12 * 86400000) },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countdown(ms: number) {
  if (ms <= 0) return { txt: "Vencido", urgente: true }
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return { txt: d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`, urgente: d < 2 }
}

// ─── Toggle iOS ───────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, dot }: { checked: boolean; onChange: () => void; label: string; dot: string }) {
  return (
    <button onClick={onChange} className="flex items-center justify-between w-full group py-0.5">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full shrink-0 transition-opacity" style={{ background: dot, opacity: checked ? 1 : 0.25 }} />
        <span className={`text-xs transition-colors ${checked ? "text-slate-200" : "text-slate-500"}`}>{label}</span>
      </div>
      <div className={`relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 ml-2 ${checked ? "bg-gradient-to-r from-[#a6249d] to-[#7957f1]" : "bg-white/10"}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </div>
    </button>
  )
}

// ─── Reloj del Día ────────────────────────────────────────────────────────────

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
          <circle cx="34" cy="34" r="30" fill="none" stroke="url(#cg2)" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} className="transition-all duration-700" />
          <defs><linearGradient id="cg2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d93340" /><stop offset="50%" stopColor="#a6249d" /><stop offset="100%" stopColor="#7957f1" />
          </linearGradient></defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Clock className="w-5 h-5 text-violet-400" />
        </div>
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

// ─── Radar Exámenes ───────────────────────────────────────────────────────────

function RadarExamenes({ examenes }: { examenes: Examen[] }) {
  const [ahora, setAhora] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setAhora(new Date()), 60000); return () => clearInterval(t) }, [])
  return (
    <div className="space-y-2">
      {examenes.map(ex => {
        const { txt, urgente } = countdown(ex.fechaTarget.getTime() - ahora.getTime())
        return (
          <div key={ex.id} className={`rounded-xl p-3 transition-all ${urgente ? "bg-rose-500/10 border border-rose-500/20" : "bg-white/5 border border-white/8"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-100 truncate">{ex.nombre}</p>
                <p className={`text-[10px] font-mono font-bold mt-0.5 ${urgente ? "text-rose-400" : "text-violet-400"}`}>
                  Falta {txt}
                </p>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${urgente ? "bg-rose-400 animate-pulse" : "bg-violet-400"}`} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Modal Nuevo Evento ───────────────────────────────────────────────────────

interface ModalProps {
  onClose: () => void
  onGuardar: (ev: CalendarioEvento) => void
  prefill?: OpenModalParams | null
}

function ModalNuevoEvento({ onClose, onGuardar, prefill }: ModalProps) {
  const [tipoNuevo, setTipoNuevo] = useState<TipoNuevo>("Evento")
  const [titulo, setTitulo] = useState("")
  const [fecha, setFecha] = useState(() =>
    prefill?.fecha?.toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0])
  const [horaIni, setHoraIni] = useState(() => {
    if (prefill?.horaInicio !== undefined) {
      const h = Math.floor(HORA_INI + prefill.horaInicio)
      const m = Math.round((prefill.horaInicio % 1) * 60)
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
  const [desc, setDesc] = useState("")
  const [tipo, setTipo] = useState<EventoTipo>("clase")
  const [guardando, setGuardando] = useState(false)

  const handleGuardar = () => {
    if (!titulo.trim()) return
    setGuardando(true)
    setTimeout(() => {
      const [h, m] = horaIni.split(":").map(Number)
      const [hf, mf] = horaFin.split(":").map(Number)
      const ini = h + m / 60 - HORA_INI
      const dur = Math.max(0.5, (hf + mf / 60) - (h + m / 60))
      const d = new Date(fecha)
      const diaIdx = d.getDay() === 0 ? 6 : d.getDay() - 1
      onGuardar({ id: `u_${Date.now()}`, titulo, subtitulo: desc || undefined, tipo, dia: diaIdx, horaInicio: Math.max(0, ini), duracion: dur })
      onClose()
    }, 600)
  }

  const tipoOpts: { val: EventoTipo; label: string }[] = [
    { val: "clase", label: "Clase" }, { val: "examen", label: "Examen" },
    { val: "deporte", label: "Deporte" }, { val: "estudio-ia", label: "Estudio IA" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[#13142a] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h2 className="text-base font-semibold text-white">Nuevo evento</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-4 pb-2 gap-2">
          {(["Evento", "Tarea"] as TipoNuevo[]).map(t => (
            <button key={t} onClick={() => setTipoNuevo(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${tipoNuevo === t ? "bg-violet-500/20 border border-violet-500/40 text-violet-300" : "bg-white/5 border border-white/[0.06] text-slate-500 hover:text-slate-300"}`}>
              {t === "Evento" ? <><Calendar className="w-3.5 h-3.5" />Evento</> : <><CheckSquare className="w-3.5 h-3.5" />Tarea</>}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block font-medium">Título *</label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus
              placeholder={tipoNuevo === "Evento" ? "Ej: Clase de Redes Computacionales" : "Ej: Entregar informe BD"}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all" />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 mb-1.5 block font-medium">Categoría</label>
            <div className="grid grid-cols-2 gap-2">
              {tipoOpts.map(({ val, label }) => {
                const s = EVENTO_ESTILO[val]
                return (
                  <button key={val} onClick={() => setTipo(val)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${tipo === val ? `${s.bg} ${s.border} ${s.text}` : "bg-white/[0.04] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/8"}`}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.dot }} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 mb-1 block font-medium">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/60 transition-all [color-scheme:dark]" />
          </div>

          {tipoNuevo === "Evento" && (
            <div className="grid grid-cols-2 gap-3">
              {[["Hora inicio", horaIni, setHoraIni], ["Hora fin", horaFin, setHoraFin]].map(([label, val, setter]) => (
                <div key={label as string}>
                  <label className="text-[11px] text-slate-400 mb-1 block font-medium">{label as string}</label>
                  <input type="time" value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/60 transition-all [color-scheme:dark]" />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="text-[11px] text-slate-400 mb-1 block font-medium">
              <AlignLeft className="inline w-3 h-3 mr-1" />Descripción (opcional)
            </label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="Aula, profesor, notas rápidas..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/60 resize-none transition-all" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 pb-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={!titulo.trim() || guardando}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 gradient-brand shadow-[0_0_20px_rgba(121,87,241,0.3)] hover:shadow-[0_0_28px_rgba(121,87,241,0.5)] transition-all flex items-center justify-center gap-2">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const VISTA_ICONS: Record<CalendarioVista, any> = {
  "Día": CalendarDays, "Semana": Calendar, "Mes": CalendarRange, "Agenda": List,
}

export function AgendaInteligente() {
  // ─ Estado global ─
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentView, setCurrentView] = useState<CalendarioVista>("Semana")
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [offsetSemana, setOffsetSemana] = useState(0)
  const [filtros, setFiltros] = useState<Record<EventoTipo, boolean>>({
    clase: true, examen: true, deporte: true, "estudio-ia": true,
  })
  const [eventos, setEventos] = useState<CalendarioEvento[]>(EVENTOS_BASE)
  const [iaToast, setIaToast] = useState(false)
  const [modalPrefill, setModalPrefill] = useState<OpenModalParams | null>(null)

  const toggleFiltro = useCallback((t: EventoTipo) => setFiltros(p => ({ ...p, [t]: !p[t] })), [])

  // ─ Calcular semana activa ─
  const hoy = new Date()
  const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay()
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - diaSemana + 1 + offsetSemana * 7)
  const fechasSemana = DIAS_CORTOS.map((_, i) => { const d = new Date(lunes); d.setDate(lunes.getDate() + i); return d })
  const hoyDia = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1
  const mesLabel = `${MESES[lunes.getMonth()]} ${lunes.getFullYear()}`

  // ─ Generar con IA ─
  const handleGenerar = () => {
    if (!prompt.trim() || isGenerating) return
    setIsGenerating(true)
    setTimeout(() => {
      setEventos(prev => [...prev, ...EVENTOS_IA_NUEVOS.filter(n => !prev.find(e => e.id === n.id))])
      setIsGenerating(false)
      setPrompt("")
      setIaToast(true)
      setTimeout(() => setIaToast(false), 3500)
    }, 2200)
  }

  // ─ Abrir modal desde el grid (click-to-create) ─
  const handleOpenModal = useCallback((params: OpenModalParams) => {
    setModalPrefill(params)
    setIsEventModalOpen(true)
  }, [])

  const handleEventClick = useCallback((ev: CalendarioEvento) => {
    // Por ahora abre el modal en modo visualización/edición
    setModalPrefill(null)
    setIsEventModalOpen(true)
  }, [])

  const handleGuardarEvento = (ev: CalendarioEvento) => {
    setEventos(prev => [...prev, ev])
  }

  // ─ Stats ─
  const clases = eventos.filter(e => e.tipo === "clase").length
  const hEstudio = +(eventos.filter(e => e.tipo === "estudio-ia").reduce((a, e) => a + e.duracion, 0).toFixed(1))
  const sesDeporte = eventos.filter(e => e.tipo === "deporte").length
  const numExamenes = eventos.filter(e => e.tipo === "examen").length

  return (
    <>
      {/* Modal */}
      {isEventModalOpen && (
        <ModalNuevoEvento
          onClose={() => { setIsEventModalOpen(false); setModalPrefill(null) }}
          onGuardar={handleGuardarEvento}
          prefill={modalPrefill}
        />
      )}

      {/* Toast IA */}
      {iaToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl bg-fuchsia-950/90 border border-fuchsia-500/40 backdrop-blur-md shadow-2xl">
          <Sparkles className="w-4 h-4 text-fuchsia-400 shrink-0" />
          <p className="text-sm font-medium text-fuchsia-100">¡IA añadió 2 bloques de estudio a tu semana!</p>
        </div>
      )}

      <div className="flex flex-col gap-3" style={{ maxWidth: "1700px", margin: "0 auto" }}>

        {/* ── BARRA IA ─────────────────────────────────────────────── */}
        <div className="bg-[#0f1022] border border-white/[0.08] rounded-2xl p-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-500 pointer-events-none" />
              <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerar()}
                placeholder="Ej: Tengo parcial el viernes, pon bloques de repaso y respeta el gym..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-all" />
            </div>
            <button onClick={handleGenerar} disabled={isGenerating || !prompt.trim()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all relative overflow-hidden group gradient-brand shadow-[0_0_20px_rgba(166,36,157,0.2)] hover:shadow-[0_0_30px_rgba(166,36,157,0.4)] shrink-0">
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/[0.06]" />
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span className="relative">{isGenerating ? "Generando..." : "Generar con IA"}</span>
            </button>
            <button
              onClick={() => { setIsGenerating(true); setTimeout(() => setIsGenerating(false), 1600) }}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-violet-300 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 disabled:opacity-40 transition-all shrink-0">
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">Reorganizar</span>
            </button>
          </div>
        </div>

        {/* ── STATS ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { icon: BookOpen, val: `${clases}`, label: "Clases / semana", color: "#818cf8" },
            { icon: Zap, val: `${hEstudio}h`, label: "Estudio IA", color: "#e879f9" },
            { icon: Dumbbell, val: `${sesDeporte}`, label: "Sesiones gym", color: "#34d399" },
            { icon: Target, val: `${numExamenes}`, label: "Evaluaciones", color: "#fb7185" },
          ].map(({ icon: Ico, val, label, color }) => (
            <div key={label} className="bg-[#0f1022] border border-white/[0.07] rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}15`, border: `1px solid ${color}28` }}>
                <Ico className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="text-lg font-bold text-white leading-none">{val}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── HEADER CALENDARIO ──────────────────────────────────────── */}
        <div className="bg-[#0f1022] border border-white/[0.08] rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          {/* Nav fecha */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={() => setOffsetSemana(0)}
              className="px-3 h-8 rounded-lg text-xs font-medium text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all">
              Hoy
            </button>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button onClick={() => setOffsetSemana(p => p - 1)}
                className="w-8 h-8 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button onClick={() => setOffsetSemana(p => p + 1)}
                className="w-8 h-8 bg-white/5 border-l border-white/10 hover:bg-white/10 flex items-center justify-center transition-all">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
            <h2 className="text-sm font-semibold text-slate-100 truncate">{mesLabel}</h2>
          </div>

          {/* Selector de vista */}
          <div className="flex rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] shrink-0">
            {(["Día", "Semana", "Mes", "Agenda"] as CalendarioVista[]).map(v => {
              const Ico = VISTA_ICONS[v]
              return (
                <button key={v} onClick={() => setCurrentView(v)}
                  className={`flex items-center gap-1.5 px-3 h-8 text-xs font-medium transition-all duration-200 border-r border-white/8 last:border-r-0
                    ${currentView === v ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
                  <Ico className="w-3 h-3" />{v}
                </button>
              )
            })}
          </div>

          {/* Botón nuevo evento */}
          <button onClick={() => { setModalPrefill(null); setIsEventModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white gradient-brand shadow-[0_0_14px_rgba(121,87,241,0.2)] hover:shadow-[0_0_22px_rgba(121,87,241,0.4)] transition-all shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo evento</span>
          </button>
        </div>

        {/* ── ÁREA PRINCIPAL: Calendar + Sidebar ─────────────────────── */}
        <div className="flex gap-3 relative">

          {/* ── CALENDARIO ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 bg-[#090b1c] border border-slate-800/60 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
            style={{ minHeight: "600px" }}>
            <CalendarioGrid
              vista={currentView}
              eventos={eventos}
              filtros={filtros}
              fechasSemana={fechasSemana}
              hoyDia={hoyDia}
              offsetSemana={offsetSemana}
              onOpenModal={handleOpenModal}
              onEventClick={handleEventClick}
            />
          </div>

          {/* ── BOTÓN TOGGLE SIDEBAR ───────────────────────────────── */}
          <div
            className="absolute top-3 z-20 transition-all duration-300"
            style={{ right: isSidebarOpen ? "calc(268px + 12px - 16px)" : "-16px" }}
          >
            <button
              onClick={() => setIsSidebarOpen(p => !p)}
              className="w-8 h-8 rounded-full bg-[#1a1b35] border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 flex items-center justify-center shadow-lg transition-all"
            >
              {isSidebarOpen
                ? <PanelRightClose className="w-3.5 h-3.5 text-slate-400" />
                : <PanelRightOpen className="w-3.5 h-3.5 text-slate-400" />
              }
            </button>
          </div>

          {/* ── SIDEBAR ────────────────────────────────────────────── */}
          <div
            className={`flex flex-col gap-3 overflow-hidden transition-all duration-300 shrink-0`}
            style={{ width: isSidebarOpen ? "268px" : "0px", opacity: isSidebarOpen ? 1 : 0 }}
          >
            <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar" style={{ width: "268px" }}>

              {/* Sincronización */}
              <div className="bg-[#13142a] border border-white/[0.09] rounded-2xl p-4 shadow-lg">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-violet-500" />Sincronización
                </p>
                <button className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/10 hover:border-white/20 transition-all group">
                  <Chrome className="w-4 h-4 text-[#4285F4] group-hover:scale-110 transition-transform shrink-0" />
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
                    Conectar Google Calendar
                  </span>
                </button>
              </div>

              {/* Reloj del Día */}
              <div className="bg-[#13142a] border border-white/[0.09] rounded-2xl p-4 shadow-lg">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-violet-500" />El Reloj del Día
                </p>
                <RelojDelDia />
              </div>

              {/* Radar de Exámenes */}
              <div className="bg-[#13142a] border border-white/[0.09] rounded-2xl p-4 shadow-lg">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-rose-500" />Radar de Exámenes
                </p>
                <RadarExamenes examenes={EXAMENES_MOCK} />
              </div>

              {/* Filtros de Capas */}
              <div className="bg-[#13142a] border border-white/[0.09] rounded-2xl p-4 shadow-lg">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-violet-500" />Filtros de Capas
                </p>
                <div className="space-y-3">
                  <Toggle checked={filtros.clase} onChange={() => toggleFiltro("clase")} label="Clases Universitarias" dot={EVENTO_ESTILO.clase.dot} />
                  <Toggle checked={filtros.examen} onChange={() => toggleFiltro("examen")} label="Evaluaciones" dot={EVENTO_ESTILO.examen.dot} />
                  <Toggle checked={filtros.deporte} onChange={() => toggleFiltro("deporte")} label="Deporte y Personal" dot={EVENTO_ESTILO.deporte.dot} />
                  <Toggle checked={filtros["estudio-ia"]} onChange={() => toggleFiltro("estudio-ia")} label="Bloques de Estudio IA" dot={EVENTO_ESTILO["estudio-ia"].dot} />
                </div>
              </div>

              {/* Carga Semanal */}
              <div className="bg-[#13142a] border border-white/[0.09] rounded-2xl p-4 shadow-lg">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-violet-500" />Carga Semanal
                </p>
                <div className="space-y-2.5">
                  {[
                    { label: "Clases", val: 55, color: EVENTO_ESTILO.clase.dot },
                    { label: "Estudio IA", val: 75, color: EVENTO_ESTILO["estudio-ia"].dot },
                    { label: "Deporte", val: 40, color: EVENTO_ESTILO.deporte.dot },
                    { label: "Evaluaciones", val: 25, color: EVENTO_ESTILO.examen.dot },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-slate-400">{label}</span>
                        <span className="text-[10px] text-slate-600 font-mono">{val}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Widget IA */}
              <div className="rounded-2xl border border-fuchsia-500/20 p-4"
                style={{ background: "linear-gradient(135deg, rgba(217,70,239,0.07), rgba(121,87,241,0.07))" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3 h-3 text-fuchsia-400" />
                  <span className="text-[10px] font-semibold text-fuchsia-300 uppercase tracking-wider">IA Sugiere</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tienes el <span className="text-fuchsia-300 font-semibold">Parcial SO en 3 días</span>.
                  Propongo <span className="text-white font-medium">2h de Threads</span> libre hoy a las 5PM.
                </p>
                <button className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-fuchsia-300 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-500/30 transition-all">
                  <Send className="w-3 h-3" />Agendar bloque
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}
