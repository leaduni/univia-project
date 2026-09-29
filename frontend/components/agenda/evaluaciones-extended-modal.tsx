import React, { useState, useMemo } from "react" // Force TS refresh
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sparkles, CheckCircle2, History, Calendar, Check, AlertTriangle, RotateCcw } from "lucide-react"

interface Evaluacion {
  id: string
  nombre: string
  fechaTarget: Date
  fechaFin: Date
  eventoOrig: any
}

interface Props {
  isOpen: boolean
  onClose: () => void
  evaluaciones: Evaluacion[]
  onOpenChat: (context: string) => void
}

export function EvaluacionesExtendedModal({ isOpen, onClose, evaluaciones, onOpenChat }: Props) {
  const [tab, setTab] = useState<"proximas" | "historial">("proximas")
  const [notas, setNotas] = useState<Record<string, number>>({})
  const [notasInput, setNotasInput] = useState<Record<string, string>>({})
  
  // Simulated state for "Marcar como ya rendida" to force them to history earlier than fechaFin
  const [rendidasManualmente, setRendidasManualmente] = useState<Record<string, boolean>>({})

  const now = new Date()

  const { proximas, historial } = useMemo(() => {
    const p: Evaluacion[] = []
    const h: Evaluacion[] = []

    evaluaciones.forEach(ev => {
      const yaPaso = ev.fechaFin.getTime() <= now.getTime()
      const fueRendida = rendidasManualmente[ev.id]

      if (yaPaso || fueRendida) {
        h.push(ev)
      } else {
        p.push(ev)
      }
    })

    return { proximas: p, historial: h }
  }, [evaluaciones, now, rendidasManualmente])

  const handleMarcarRendida = (id: string) => {
    setRendidasManualmente(prev => ({ ...prev, [id]: true }))
  }

  const handleDeshacerRendida = (id: string) => {
    setRendidasManualmente(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleGuardarNota = (id: string) => {
    const inputStr = notasInput[id]
    if (inputStr === "" || inputStr === undefined) {
      setNotas(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      return
    }
    const num = parseFloat(inputStr)
    if (!isNaN(num) && num >= 0 && num <= 20) {
      setNotas(prev => ({ ...prev, [id]: num }))
    }
  }

  const renderGradeInput = (ex: Evaluacion) => {
    const notaGuardada = notas[ex.id]
    const currentInput = notasInput[ex.id]
    const hasUnsavedChanges = currentInput !== undefined && currentInput !== (notaGuardada?.toString() || "")
    
    return (
      <div className="flex items-center gap-2">
        <input 
          type="number"
          min="0"
          max="20"
          step="0.1"
          placeholder={notaGuardada !== undefined ? notaGuardada.toString() : "0-20"}
          value={currentInput !== undefined ? currentInput : (notaGuardada !== undefined ? notaGuardada.toString() : "")}
          onChange={e => setNotasInput(prev => ({ ...prev, [ex.id]: e.target.value }))}
          className={`w-[72px] rounded-lg px-2 py-1.5 text-sm text-center font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
            notaGuardada !== undefined && !hasUnsavedChanges
              ? (notaGuardada >= 10.5 ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400')
              : 'bg-white/5 border border-white/10 text-slate-200 placeholder:text-slate-600 font-normal'
          }`}
          title="Nota (0-20)"
        />
        {hasUnsavedChanges && (
          <button 
            onClick={() => handleGuardarNota(ex.id)}
            className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white shadow-md transition-colors"
            title="Guardar nota"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  const formatFecha = (d: Date) => {
    return d.toLocaleString("es-PE", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-[#151522]/95 backdrop-blur-xl border-white/10 text-white p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-white/[0.08] bg-[#11121d]">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            Evaluaciones y Prácticas
          </DialogTitle>
          
          <div className="flex gap-4 pt-4 border-b border-transparent">
            <button 
              onClick={() => setTab("proximas")} 
              className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${tab === "proximas" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
              <Calendar className="w-4 h-4" /> Próximas ({proximas.length})
            </button>
            <button 
              onClick={() => setTab("historial")} 
              className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${tab === "historial" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
              <History className="w-4 h-4" /> Historial ({historial.length})
            </button>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {tab === "proximas" && (
            <div className="space-y-3">
              {proximas.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8 italic">No hay evaluaciones pendientes. ¡Buen trabajo!</p>
              ) : (
                proximas.map(ex => (
                  <div key={ex.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-white/[0.07] transition-all">
                    <div>
                      <h3 className="font-semibold text-slate-200 text-base">{ex.nombre}</h3>
                      <p className="text-xs text-slate-400 mt-1 capitalize">{formatFecha(ex.fechaTarget)}</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                      {renderGradeInput(ex)}
                      <button 
                        onClick={() => handleMarcarRendida(ex.id)}
                        className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ya rendida
                      </button>
                      <button 
                        onClick={() => {
                          const ms = ex.fechaTarget.getTime() - now.getTime()
                          const days = Math.max(0, Math.ceil(ms / 86400000))
                          onOpenChat(`Quiero crear un plan de repaso para mi próxima evaluación de ${ex.nombre} programada en ${days} días. Ayúdame a organizar mis bloques de estudio.`)
                          onClose()
                        }}
                        className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Repasar con IA
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "historial" && (
            <div className="space-y-3">
              {historial.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8 italic">Aún no hay evaluaciones en el historial.</p>
              ) : (
                historial.sort((a, b) => b.fechaFin.getTime() - a.fechaFin.getTime()).map(ex => {
                  const notaGuardada = notas[ex.id]
                  return (
                    <div key={ex.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div>
                        <h3 className="font-semibold text-slate-300 text-sm opacity-80 line-through decoration-white/20">{ex.nombre}</h3>
                        <p className="text-xs text-slate-500 mt-1 capitalize">{formatFecha(ex.fechaFin)}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {rendidasManualmente[ex.id] && ex.fechaFin.getTime() > now.getTime() && (
                          <button
                            onClick={() => handleDeshacerRendida(ex.id)}
                            className="px-2 py-1.5 rounded-lg border border-slate-500/30 text-slate-400 hover:text-slate-200 hover:bg-white/5 text-[10px] uppercase font-bold flex items-center gap-1.5 transition-colors mr-2"
                            title="Quitar de historial y devolver a próximas"
                          >
                            <RotateCcw className="w-3 h-3" /> Deshacer
                          </button>
                        )}
                        {renderGradeInput(ex)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
