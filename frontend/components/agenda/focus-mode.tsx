import { useState, useEffect, useRef } from "react"
import { Play, Pause, X, CheckCircle2, Settings, Coffee, Brain, RotateCcw, Pencil, Check } from "lucide-react"
import { CalendarioEvento } from "./calendar-grid"

interface FocusModeProps {
  evento: CalendarioEvento
  onClose: () => void
  onComplete: (minutosEstudiados: number, isFinishedEarly: boolean) => void
}

export function FocusMode({ evento, onClose, onComplete }: FocusModeProps) {
  const [isConfiguring, setIsConfiguring] = useState(true)
  const [focusMinutes, setFocusMinutes] = useState(50)
  const [focusSeconds, setFocusSeconds] = useState(0)
  const [breakMinutes, setBreakMinutes] = useState(10)
  const [breakSeconds, setBreakSeconds] = useState(0)
  
  const [phase, setPhase] = useState<"focus" | "break">("focus")
  const [timeLeft, setTimeLeft] = useState(50 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [totalStudied, setTotalStudied] = useState(0)
  
  // Para edición en vivo
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [editMins, setEditMins] = useState(0)
  const [editSecs, setEditSecs] = useState(0)

  // Segundos totales originales para el progreso circular
  const currentTotalSeconds = phase === "focus" 
    ? focusMinutes * 60 + focusSeconds 
    : breakMinutes * 60 + breakSeconds

  const handleStart = () => {
    setIsConfiguring(false)
    setTimeLeft(focusMinutes * 60 + focusSeconds)
    setPhase("focus")
    setIsRunning(true)
  }

  const handleGoBack = () => {
    setIsRunning(false)
    setIsConfiguring(true)
  }

  useEffect(() => {
    if (!isRunning || isConfiguring || isEditingTime) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Fase completada
          if (phase === "focus") {
            setTotalStudied(t => t + focusMinutes + focusSeconds / 60)
            setPhase("break")
            return breakMinutes * 60 + breakSeconds
          } else {
            setPhase("focus")
            return focusMinutes * 60 + focusSeconds
          }
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isRunning, isConfiguring, isEditingTime, phase, focusMinutes, focusSeconds, breakMinutes, breakSeconds])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  const progress = currentTotalSeconds > 0 ? ((currentTotalSeconds - timeLeft) / currentTotalSeconds) * 100 : 0

  const handleFinishEarly = () => {
    let studied = totalStudied
    if (phase === "focus") {
      studied += Math.floor((currentTotalSeconds - timeLeft) / 60)
    }
    onComplete(studied, true)
  }

  const handleComplete = () => {
    let studied = totalStudied
    if (phase === "focus") {
      studied += Math.floor((currentTotalSeconds - timeLeft) / 60)
    }
    onComplete(Math.max(studied, focusMinutes), false) // Al menos el tiempo objetivo si completó
  }

  const startEditing = () => {
    setIsRunning(false)
    setEditMins(mins)
    setEditSecs(secs)
    setIsEditingTime(true)
  }

  const saveEditing = () => {
    const newTotal = (editMins * 60) + editSecs
    setTimeLeft(newTotal)
    setIsEditingTime(false)
  }

  // Componente reutilizable para inputs numéricos de tiempo
  const TimeInput = ({ val, setVal, max, label }: { val: number, setVal: (v: number) => void, max: number, label: string }) => (
    <div className="flex flex-col items-center">
      <input 
        type="number" min="0" max={max} value={val || ""} placeholder="00"
        onChange={e => {
          let v = parseInt(e.target.value) || 0
          if (v > max) v = max
          setVal(v)
        }}
        className="w-16 h-12 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-white/20"
      />
      <span className="text-[10px] text-slate-400 font-medium uppercase mt-1 tracking-wider">{label}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="absolute top-8 right-8">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">{evento.titulo}</h2>
        {evento.subtitulo && <p className="text-slate-400">{evento.subtitulo}</p>}
      </div>

      {isConfiguring ? (
        <div className="bg-[#151522]/40 border border-white/10 p-8 rounded-3xl w-full max-w-sm backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-in zoom-in-95">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-purple-400" />
            <h3 className="text-xl font-bold text-white">Configurar Pomodoro</h3>
          </div>
          
          <div className="space-y-6 mb-8">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <label className="flex items-center justify-center gap-2 text-sm font-bold text-white mb-4">
                <Brain className="w-4 h-4 text-purple-400" /> Concentración
              </label>
              <div className="flex items-center justify-center gap-4">
                <TimeInput val={focusMinutes} setVal={setFocusMinutes} max={120} label="Min" />
                <span className="text-2xl font-bold text-white/30 pb-4">:</span>
                <TimeInput val={focusSeconds} setVal={setFocusSeconds} max={59} label="Seg" />
              </div>
            </div>
            
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <label className="flex items-center justify-center gap-2 text-sm font-bold text-white mb-4">
                <Coffee className="w-4 h-4 text-pink-400" /> Descanso
              </label>
              <div className="flex items-center justify-center gap-4">
                <TimeInput val={breakMinutes} setVal={setBreakMinutes} max={60} label="Min" />
                <span className="text-2xl font-bold text-white/30 pb-4">:</span>
                <TimeInput val={breakSeconds} setVal={setBreakSeconds} max={59} label="Seg" />
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
            {/* Glow de fondo para el círculo dependiendo de la fase */}
            <div className={`absolute inset-0 rounded-full blur-3xl animate-pulse ${phase === "focus" ? "bg-indigo-500/10" : "bg-emerald-500/10"}`} />
            
            <svg viewBox="0 0 320 320" className={`absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(121,87,241,0.5)]`}>
              <circle cx="160" cy="160" r="150" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
              <circle 
                cx="160" cy="160" r="150" fill="none" stroke={phase === "focus" ? "url(#focus-gradient)" : "url(#break-gradient)"} strokeWidth="12" strokeLinecap="round" 
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
                <div className="flex items-center justify-center gap-2 mb-2 bg-black/40 p-4 rounded-3xl backdrop-blur-md border border-white/10">
                  <input type="number" min="0" max="999" value={editMins || ""} onChange={e => setEditMins(parseInt(e.target.value) || 0)} className="w-24 h-16 text-center text-5xl font-black bg-transparent text-white focus:outline-none border-b-2 border-purple-500" placeholder="00" />
                  <span className="text-5xl font-black text-white/50">:</span>
                  <input type="number" min="0" max="59" value={editSecs || ""} onChange={e => { let v = parseInt(e.target.value) || 0; if(v>59) v=59; setEditSecs(v)}} className="w-24 h-16 text-center text-5xl font-black bg-transparent text-white focus:outline-none border-b-2 border-purple-500" placeholder="00" />
                  <button onClick={saveEditing} className="ml-2 w-12 h-12 rounded-full bg-purple-500 hover:bg-purple-400 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95">
                    <Check className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="group relative flex items-center justify-center cursor-pointer" onClick={startEditing}>
                  <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 tracking-tighter tabular-nums drop-shadow-md transition-transform group-hover:scale-105">
                    {timeStr}
                  </span>
                  <div className="absolute -right-8 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 p-2 rounded-full backdrop-blur-md">
                    <Pencil className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
              
              {!isEditingTime && (
                <span className={`font-medium tracking-widest uppercase text-sm mt-4 flex items-center gap-1.5 ${phase === "focus" ? "text-indigo-300/80" : "text-emerald-300/80"}`}>
                  {phase === "focus" ? <Brain className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
                  {phase === "focus" ? "Concentración" : "Descanso"}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 items-center">
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => setIsRunning(!isRunning)} className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 font-semibold">
                {isRunning ? <><Pause className="w-5 h-5 mr-2" /> Pausar</> : <><Play className="w-5 h-5 mr-2" /> Reanudar</>}
              </button>
              
              <button onClick={handleFinishEarly} className="px-6 py-3 rounded-xl bg-transparent hover:bg-white/5 text-slate-400 hover:text-slate-300 transition-all font-semibold border border-transparent hover:border-white/10">
                Terminar antes
              </button>

              <button onClick={handleGoBack} className="px-6 py-3 rounded-xl bg-transparent hover:bg-white/5 text-slate-400 hover:text-slate-300 transition-all font-semibold flex items-center gap-2 border border-transparent hover:border-white/10">
                <RotateCcw className="w-4 h-4" /> Configuración
              </button>
            </div>

            <button onClick={handleComplete} className="px-8 py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold tracking-wide shadow-[0_0_30px_rgba(217,70,239,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border border-white/10">
              <CheckCircle2 className="w-5 h-5" /> Completar Sesión
            </button>
          </div>
        </>
      )}
    </div>
  )
}
