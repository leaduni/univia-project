import { useState, useRef, useEffect } from "react"
import { ArrowUp, Paperclip } from "lucide-react"

const SUGGESTIONS = [
  "✨ Crear plan de repaso para mi próximo examen",
  "📅 Bloquear mi fin de semana para estudiar",
  "🧠 Resumen de mis horas de estudio enfocadas"
]

export function BarraIA({ onImportSchedule }: { onImportSchedule: (file: File) => void }) {
  const [prompt, setPrompt] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Atajo de teclado Ctrl+K o Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSubmit = (text: string) => {
    if (!text.trim()) return
    
    // Emitir evento para abrir el panel de IA
    window.dispatchEvent(new CustomEvent("open-univia-chat", { detail: { initialContext: text } }))
    
    setPrompt("")
    inputRef.current?.blur()
    setIsFocused(false)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit(prompt)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Selecciona un PDF de tu horario o matrícula.")
      return
    }
    setFileError(null)
    setIsFocused(false)
    onImportSchedule(file)
  }

  return (
    <div className="relative min-w-0 flex-1 sm:w-96 flex flex-col z-50">
      <form onSubmit={handleFormSubmit} className="relative w-full">
        {/* Borde visible también cuando el campo no tiene foco. */}
        <div className="relative rounded-xl border border-violet-300/50 bg-[#1c1d2e] shadow-sm transition-shadow focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-400/30">
          <div className="relative w-full flex items-center rounded-xl overflow-hidden">
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              accept=".pdf,application/pdf"
              aria-label="Adjuntar horario en PDF"
              onChange={handleFileChange} 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="size-11 shrink-0 flex items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 transition-colors text-slate-300 hover:text-white"
              title="Importar horario desde PDF"
              aria-label="Importar horario desde PDF"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            
            <input 
              ref={inputRef}
              type="text" 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)} 
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder="Pregúntale a UniVia..." 
              className="min-w-0 w-full bg-transparent border-none py-3 text-sm text-slate-100 placeholder:text-slate-300 focus:ring-0 focus:outline-none"
              aria-label="Paleta de comandos de IA"
            />
            
            <button type="submit" disabled={!prompt.trim()} aria-label="Enviar pregunta a UniVia" className="size-11 shrink-0 flex items-center justify-center text-violet-200 hover:bg-white/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>

        {/* Menú Flotante de Sugerencias (Popover) */}
        {isFocused && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c1d2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-3 py-2 border-b border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sugerencias</span>
            </div>
            <div className="flex flex-col py-1">
              {SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Evita perder el foco antes de ejecutar la acción
                    setPrompt(sug);
                    handleSubmit(sug);
                  }}
                  className="text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
      {fileError && <p role="alert" className="mt-2 text-xs text-rose-300">{fileError}</p>}
    </div>
  )
}
