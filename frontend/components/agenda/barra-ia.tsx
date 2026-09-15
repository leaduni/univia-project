import { useState, useRef } from "react"
import { Sparkles, Loader2, Paperclip, X, Image as ImageIcon, FileText } from "lucide-react"

export function BarraIA() {
  const [prompt, setPrompt] = useState("")
  const [isAILoading, setIsAILoading] = useState(false)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAIGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    if ((!prompt.trim() && !attachedFile) || isAILoading) return
    
    setIsAILoading(true)
    setTimeout(() => {
      setIsAILoading(false)
      setPrompt("")
      setAttachedFile(null)
    }, 2500)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0])
    }
  }

  return (
    <div className="relative flex-1 sm:w-96 flex flex-col">
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

      <form onSubmit={handleAIGenerate} className="relative w-full flex items-center">
        <input 
          type="file" 
          ref={fileInputRef} 
          hidden 
          accept="image/*,.pdf" 
          onChange={handleFileChange} 
        />
        <button 
          type="button" 
          disabled={isAILoading}
          onClick={() => fileInputRef.current?.click()}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-indigo-400 disabled:opacity-50"
          title="Adjuntar archivo o imagen"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        
        <input 
          disabled={isAILoading} 
          type="text" 
          value={prompt} 
          onChange={e => setPrompt(e.target.value)} 
          placeholder={isAILoading ? "Analizando contenido..." : "Ej. Crea un bloque de repaso para S.O. mañana a las 3pm"} 
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-indigo-500/50 transition-all shadow-inner disabled:opacity-50" 
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isAILoading ? (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-400" />
          )}
        </div>
      </form>
      
      {isAILoading && attachedFile && (
        <span className="absolute -bottom-5 left-2 text-[10px] text-indigo-400 animate-pulse font-medium">
          Analizando documento y extrayendo fechas...
        </span>
      )}
    </div>
  )
}
