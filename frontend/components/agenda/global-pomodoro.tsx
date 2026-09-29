"use client"

import { useState, useEffect } from "react"
import { Play, Pause, X, CheckCircle2, Settings, Coffee, Brain, Pencil, Check, BookOpen, Maximize2, Minus, ChevronDown } from "lucide-react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectLabel } from "@/components/ui/select"
import { usePomodoro } from "../providers/pomodoro-context"
import { Etiqueta } from "./calendar-grid"
import { fetchEtiquetas } from "@/lib/agenda-service"

const TimeInput = ({ val, setVal, max, label }: { val: number, setVal: (v: number) => void, max: number, label: string }) => {
  const [localVal, setLocalVal] = useState(val.toString().padStart(2, '0'))
  useEffect(() => { setLocalVal(val.toString().padStart(2, '0')) }, [val])

  return (
    <div className="flex flex-col items-center">
      <input 
        type="number" value={localVal} onFocus={e=>e.target.select()}
        onChange={e => {
          setLocalVal(e.target.value)
          let v = parseInt(e.target.value)
          if (!isNaN(v)) {
            if (v < 0) v = 0
            if (v > max) v = max
            setVal(v)
          }
        }}
        onBlur={() => {
          let v = parseInt(localVal)
          if (isNaN(v) || v < 0) v = 0
          if (v > max) v = max
          setVal(v)
          setLocalVal(v.toString().padStart(2, '0'))
        }}
        className="w-16 h-12 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-white/20"
      />
      <span className="text-[10px] text-slate-400 font-medium uppercase mt-1 tracking-wider">{label}</span>
    </div>
  )
}

const BigTimeEditor = ({ mins, secs, setMins, setSecs, onSave }: any) => {
  const [localMins, setLocalMins] = useState(mins.toString().padStart(2, '0'))
  const [localSecs, setLocalSecs] = useState(secs.toString().padStart(2, '0'))

  return (
    <div className="flex items-center justify-center gap-2 mb-2 bg-black/40 p-4 rounded-3xl backdrop-blur-md border border-white/10">
      <input 
        type="text" value={localMins} onFocus={e=>e.target.select()} 
        onChange={e => {
          setLocalMins(e.target.value)
          let str = e.target.value.replace(/\D/g, '')
          let v = parseInt(str)
          if (!isNaN(v) && v >= 0) setMins(v)
        }} 
        onBlur={() => {
          let v = parseInt(localMins.replace(/\D/g, ''))
          if (isNaN(v) || v < 0) v = 0
          setMins(v); setLocalMins(v.toString().padStart(2, '0'))
        }}
        className="w-24 h-16 text-center text-5xl font-black bg-transparent text-white focus:outline-none border-b-2 border-purple-500" 
      />
      <span className="text-5xl font-black text-white/50">:</span>
      <input 
        type="text" value={localSecs} onFocus={e=>e.target.select()} 
        onChange={e => {
          setLocalSecs(e.target.value)
          let str = e.target.value.replace(/\D/g, '')
          let v = parseInt(str)
          if (!isNaN(v)) {
            if (v > 59) v = 59
            if (v < 0) v = 0
            setSecs(v)
          }
        }} 
        onBlur={() => {
          let v = parseInt(localSecs.replace(/\D/g, ''))
          if (isNaN(v) || v < 0) v = 0
          if (v > 59) v = 59
          setSecs(v); setLocalSecs(v.toString().padStart(2, '0'))
        }}
        className="w-24 h-16 text-center text-5xl font-black bg-transparent text-white focus:outline-none border-b-2 border-purple-500" 
      />
      <button onClick={onSave} className="ml-2 w-12 h-12 rounded-full bg-purple-500 hover:bg-purple-400 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95">
        <Check className="w-6 h-6" />
      </button>
    </div>
  )
}

export function GlobalPomodoro() {
  const { state, closeFocusMode, minimize, maximize, startSession, pauseSession, resumeSession, completeSession, setTimeLeft } = usePomodoro()
  
  const [focusHours, setFocusHours] = useState(0)
  const [focusMins, setFocusMins] = useState(50)
  const [breakHours, setBreakHours] = useState(0)
  const [breakMins, setBreakMins] = useState(10)
  const [asignadoA, setAsignadoA] = useState<string>("libre")
  const [createBlock, setCreateBlock] = useState(true)
  
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([])
  
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [editMins, setEditMins] = useState(0)
  const [editSecs, setEditSecs] = useState(0)

  // Load tags for assignment
  useEffect(() => {
    if (state.isFocusModeOpen && !state.isRunning) {
      fetchEtiquetas().then(res => {
        setEtiquetas(res.map(e => ({ id: e.id.toString(), nombre: e.nombre, color: e.color as any })))
      }).catch(console.error)
      
      setAsignadoA(state.asignadoA)
      setCreateBlock(state.createBlock)
    }
  }, [state.isFocusModeOpen, state.isRunning, state.asignadoA, state.createBlock])

  if (!state.isFocusModeOpen && !state.isMinimized) return null

  if (state.isMinimized) {
    const mins = Math.floor(state.timeLeft / 60)
    const secs = state.timeLeft % 60
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    
    return (
      <div className="fixed bottom-6 right-8 z-[200] bg-[#151522]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] w-80 p-5 animate-in slide-in-from-bottom-5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {state.phase === "focus" ? <Brain className="w-4 h-4 text-purple-400" /> : <Coffee className="w-4 h-4 text-emerald-400" />}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {state.phase === "focus" ? "Concentración" : "Descanso"}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={maximize} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => { closeFocusMode(); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-4xl font-black tracking-tighter tabular-nums text-white">
            {timeStr}
          </div>
          <div className="flex gap-2">
            <button onClick={() => state.isRunning ? pauseSession() : resumeSession()} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all">
              {state.isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
            </button>
            <button onClick={() => completeSession(true)} className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
              <CheckCircle2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Config or Full Screen mode
  const isConfiguring = !state.isRunning && state.targetEndTime === null
  const mins = Math.floor(state.timeLeft / 60)
  const secs = state.timeLeft % 60
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  const progress = state.totalDurationSec > 0 ? ((state.totalDurationSec - state.timeLeft) / state.totalDurationSec) * 100 : 0
  
  const handleStart = () => {
    startSession((focusHours * 60) + focusMins, (breakHours * 60) + breakMins, asignadoA, createBlock)
  }



  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="absolute top-8 right-8 flex gap-4">
        {!isConfiguring && (
          <button onClick={minimize} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors" title="Minimizar">
            <Minus className="w-5 h-5" />
          </button>
        )}
        <button onClick={closeFocusMode} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors" title="Cerrar">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Modo Concentración</h2>
        <p className="text-slate-400 mt-2 font-medium">Técnica Pomodoro Inteligente</p>
      </div>

      {isConfiguring ? (
        <div className="w-full max-w-lg bg-[#0b0c16]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-8">
          
          <div className="mb-8">
            <label className="flex items-center gap-2 text-sm font-bold text-white mb-3">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Asignar Sesión a:
            </label>
            <Select value={asignadoA} onValueChange={setAsignadoA}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-slate-200 h-12 rounded-xl focus:ring-indigo-500 focus:border-indigo-500">
                <SelectValue placeholder="Selecciona un curso o tarea" />
              </SelectTrigger>
              <SelectContent className="bg-[#1c1d2e] border-white/10 text-slate-200">
                <SelectItem value="libre" className="focus:bg-white/10 focus:text-white cursor-pointer font-medium">
                  🌟 Estudio Libre (General)
                </SelectItem>
                <SelectGroup>
                  <SelectLabel className="text-indigo-400 font-bold uppercase tracking-wider text-[10px]">Mis Cursos</SelectLabel>
                  {etiquetas.filter(e => !["Evaluaciones", "Deporte"].includes(e.nombre)).map(et => (
                    <SelectItem key={et.id} value={et.id.toString()} className="focus:bg-white/10 focus:text-white cursor-pointer">
                      {et.nombre}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {asignadoA === "libre" && (
              <label className="flex items-center gap-3 mt-4 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <input type="checkbox" checked={createBlock} onChange={e => setCreateBlock(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-black/30 text-indigo-500 focus:ring-indigo-500/50" />
                <span className="text-sm font-medium text-slate-300">Registrar como bloque de "Estudio Libre" en mi calendario de hoy.</span>
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <label className="flex items-center justify-center gap-2 text-sm font-bold text-white mb-4">
                <Brain className="w-4 h-4 text-purple-400" /> Concentración
              </label>
              <div className="flex items-center justify-center gap-2">
                <TimeInput val={focusHours} setVal={setFocusHours} max={10} label="Hrs" />
                <span className="text-xl font-bold text-white/30 pb-4">:</span>
                <TimeInput val={focusMins} setVal={setFocusMins} max={59} label="Min" />
              </div>
            </div>
            
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <label className="flex items-center justify-center gap-2 text-sm font-bold text-white mb-4">
                <Coffee className="w-4 h-4 text-pink-400" /> Descanso
              </label>
              <div className="flex items-center justify-center gap-2">
                <TimeInput val={breakHours} setVal={setBreakHours} max={5} label="Hrs" />
                <span className="text-xl font-bold text-white/30 pb-4">:</span>
                <TimeInput val={breakMins} setVal={setBreakMins} max={59} label="Min" />
              </div>
            </div>
          </div>

          <button onClick={handleStart} className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-lg shadow-[0_0_25px_rgba(217,70,239,0.4)] transition-all hover:scale-105 active:scale-95 border border-white/10">
            ¡Comenzar Sesión!
          </button>
        </div>
      ) : (
        <>
          <div className="relative w-96 h-96 mb-12 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full blur-3xl animate-pulse ${state.phase === "focus" ? "bg-indigo-500/10" : "bg-emerald-500/10"}`} />
            
            <svg viewBox="0 0 320 320" className={`absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(121,87,241,0.5)]`}>
              <circle cx="160" cy="160" r="150" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
              <circle 
                cx="160" cy="160" r="150" fill="none" stroke={state.phase === "focus" ? "url(#focus-gradient)" : "url(#break-gradient)"} strokeWidth="12" strokeLinecap="round" 
                strokeDasharray={150 * 2 * Math.PI} 
                strokeDashoffset={(150 * 2 * Math.PI) * (1 - progress / 100)} 
                className="transition-all duration-1000 ease-linear" 
              />
              <defs>
                <linearGradient id="focus-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="50%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#e879f9" />
                </linearGradient>
                <linearGradient id="break-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
            <div className="relative z-10 flex flex-col items-center justify-center w-full">
              {isEditingTime ? (
                <BigTimeEditor 
                  mins={editMins} secs={editSecs} 
                  setMins={setEditMins} setSecs={setEditSecs} 
                  onSave={() => { setTimeLeft((editMins * 60) + editSecs); setIsEditingTime(false); }} 
                />
              ) : (
                <div className="group relative flex items-center justify-center cursor-pointer" onClick={() => { pauseSession(); setEditMins(mins); setEditSecs(secs); setIsEditingTime(true); }}>
                  <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 tracking-tighter tabular-nums drop-shadow-md transition-transform group-hover:scale-105">
                    {timeStr}
                  </span>
                  <div className="absolute -right-8 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 p-2 rounded-full backdrop-blur-md">
                    <Pencil className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
              
              {!isEditingTime && (
                <span className={`font-medium tracking-widest uppercase text-sm mt-4 flex items-center gap-1.5 ${state.phase === "focus" ? "text-indigo-300/80" : "text-emerald-300/80"}`}>
                  {state.phase === "focus" ? <Brain className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
                  {state.phase === "focus" ? "Concentración" : "Descanso"}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 items-center">
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => state.isRunning ? pauseSession() : resumeSession()} className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 font-semibold">
                {state.isRunning ? <><Pause className="w-5 h-5 mr-2" /> Pausar</> : <><Play className="w-5 h-5 mr-2" /> Reanudar</>}
              </button>
              
              <button onClick={() => completeSession(true)} className="px-6 py-3 rounded-xl bg-transparent hover:bg-white/5 text-slate-400 hover:text-slate-300 transition-all font-semibold border border-transparent hover:border-white/10">
                Terminar antes
              </button>
            </div>

            <button onClick={() => completeSession(false)} className="px-8 py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold tracking-wide shadow-[0_0_30px_rgba(217,70,239,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border border-white/10">
              <CheckCircle2 className="w-5 h-5" /> Completar Sesión
            </button>
          </div>
        </>
      )}
    </div>
  )
}
