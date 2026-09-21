"use client"

import { useState } from "react"
import { Loader2, Send } from "lucide-react"
import { foroService } from "@/lib/foro-service"
import type { Publicacion } from "@/types/foro"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface CrearPublicacionFormProps {
  seccionId: number
  onCreada: (publicacion: Publicacion) => void
}

const MAX_TAGS = 8

export function CrearPublicacionForm({ seccionId, onCreada }: CrearPublicacionFormProps) {
  const [titulo, setTitulo] = useState("")
  const [cuerpo, setCuerpo] = useState("")
  const [tags, setTags] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const etiquetas = tags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_TAGS)

  const puedeEnviar = titulo.trim().length > 0 && cuerpo.trim().length > 0 && !enviando

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!puedeEnviar) return
    setEnviando(true)
    setError(null)
    try {
      const creada = await foroService.crearPublicacion({
        seccion_id: seccionId,
        titulo: titulo.trim(),
        cuerpo: cuerpo.trim(),
        tags: etiquetas,
      })
      setTitulo("")
      setCuerpo("")
      setTags("")
      onCreada(creada)
    } catch (e: any) {
      setError(e.message || "No se pudo crear la publicación.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      {error && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título de tu publicación"
        maxLength={255}
        aria-label="Título"
      />

      <textarea
        value={cuerpo}
        onChange={(e) => setCuerpo(e.target.value)}
        placeholder="Cuéntale a la comunidad tu pregunta o tema de discusión…"
        rows={4}
        maxLength={20000}
        aria-label="Cuerpo"
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
      />

      <Input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Etiquetas separadas por comas (máx. 8)"
        aria-label="Etiquetas"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {etiquetas.length}/{MAX_TAGS} etiquetas
        </p>
        <Button type="submit" disabled={!puedeEnviar} className="gap-1.5">
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {enviando ? "Publicando…" : "Publicar"}
        </Button>
      </div>
    </form>
  )
}