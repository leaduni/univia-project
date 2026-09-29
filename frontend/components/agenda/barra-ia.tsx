import { useState, useRef, useEffect } from "react"
import { Sparkles, Loader2, Paperclip, X, Image as ImageIcon, FileText, Command } from "lucide-react"

const SUGGESTIONS = [
  "✨ Crear plan de repaso para mi próximo examen",
  "📅 Bloquear mi fin de semana para estudiar",
  "🧠 Resumen de mis horas de estudio enfocadas"
]

export function BarraIA() {
  const [prompt, setPrompt] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  
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
    if (!text.trim() && !attachedFile) return
    
    // Emitir evento para abrir el panel de IA
    window.dispatchEvent(new CustomEvent("open-univia-chat", { detail: { initialContext: text } }))
    
    setPrompt("")
    setAttachedFile(null)
    inputRef.current?.blur()
    setIsFocused(false)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit(prompt)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0])
    }
  }

  return (
    <div className="relative flex-1 sm:w-96 flex flex-col z-50">
      {/* Píldora Flotante Arriba */}
      {attachedFile && (
        <div className="absolute -top-7 left-2 z-10 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-[10px] font-medium backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in duration-200 shadow-lg">
          {attachedFile.type.includes("image") ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
          <span className="truncate max-w-[120px]">{attachedFile.name}</span>
          <button type="button" onClick={() => setAttachedFile(null)} className="ml-0.5 hover:bg-white/10 rounded-full p-0.5 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="relative w-full">
        {/* Contenedor del gradiente dinámico */}
        <div className={`relative rounded-xl p-[1px] transition-all duration-300 ${isFocused ? 'bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_15px_rgba(217,70,239,0.4)]' : 'bg-transparent'}`}>
          <div className="relative w-full flex items-center bg-[#11121d] rounded-xl overflow-hidden">
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              accept="image/*,.pdf" 
              onChange={handleFileChange} 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-indigo-400"
              title="Adjuntar archivo o imagen"
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
              className={`w-full bg-transparent border-none pl-9 pr-14 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:ring-0 focus:outline-none transition-all ${!isFocused ? 'border border-white/10 shadow-inner rounded-xl' : ''}`} 
              aria-label="Paleta de comandos de IA"
            />
            
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              <Sparkles className={`w-4 h-4 transition-colors duration-300 ${isFocused ? 'text-pink-400' : 'text-indigo-400'}`} />
            </div>
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
    </div>
  )
}
