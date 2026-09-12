// Formulario de respuesta del hilo de un ticket: texto + adjunto opcional.
"use client"

import { useRef, useState, type FormEvent } from "react"
import { Loader2, Paperclip, Send, X } from "lucide-react"

import { Button } from "@/components/ui/button"

interface FeedbackMensajeFormProps {
  enviando: boolean
  error: string
  onEnviar: (contenido: string, archivo?: File) => void
}

export function FeedbackMensajeForm({ enviando, error, onEnviar }: FeedbackMensajeFormProps) {
  const [contenido, setContenido] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const inputArchivo = useRef<HTMLInputElement>(null)

  function enviar(event: FormEvent) {
    event.preventDefault()
    if (enviando || (!contenido.trim() && !archivo)) return
    onEnviar(contenido.trim(), archivo ?? undefined)
    setContenido("")
    setArchivo(null)
    if (inputArchivo.current) inputArchivo.current.value = ""
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <textarea
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="Escribe una respuesta para el equipo de desarrollo…"
        className="w-full resize-y rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7957f1] focus:ring-[#7957f1]/40 focus:outline-none"
      />

      {archivo && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{archivo.name}</span>
          <button
            type="button"
            aria-label="Quitar archivo"
            onClick={() => setArchivo(null)}
            className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <input
        ref={inputArchivo}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
        className="hidden"
        onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputArchivo.current?.click()}
          disabled={enviando}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Adjuntar
        </Button>
        <Button
          type="submit"
          size="sm"
          variant="brand"
          disabled={enviando || (!contenido.trim() && !archivo)}
        >
          {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Responder
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}