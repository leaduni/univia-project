"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Loader2 } from "lucide-react"
import { foroService } from "@/lib/foro-service"
import type { Publicacion, Seccion } from "@/types/foro"
import { Button } from "@/components/ui/button"
import { PublicacionesLista } from "./publicaciones-lista"
import { CrearPublicacionForm } from "./crear-publicacion-form"

interface SeccionViewProps {
  seccionId: number
}

export function SeccionView({ seccionId }: SeccionViewProps) {
  const [seccion, setSeccion] = useState<Seccion | null>(null)
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  useEffect(() => {
    let activo = true
    Promise.all([
      foroService.getSecciones(),
      foroService.getPublicaciones(seccionId),
    ])
      .then(([secciones, pubs]) => {
        if (!activo) return
        setSeccion(secciones.find((s) => s.id === seccionId) ?? null)
        setPublicaciones(pubs)
      })
      .catch((e) => {
        if (activo) setError(e.message || "No se pudo cargar la sección.")
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [seccionId])

  if (cargando) {
    return <div className="h-40 rounded-2xl bg-muted animate-pulse" />
  }

  if (error || !seccion) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">{error || "Sección no encontrada."}</p>
        <Link href="/foro" className="inline-flex items-center gap-1 text-sm text-primary mt-3">
          <ArrowLeft className="w-4 h-4" /> Volver al foro
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/foro" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Foro
        </Link>
        <h1 className="font-poppins font-semibold text-2xl text-foreground mt-2">{seccion.titulo}</h1>
        {seccion.descripcion && (
          <p className="text-sm text-muted-foreground mt-1">{seccion.descripcion}</p>
        )}
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            {publicaciones.length} publicaciones
          </p>
          <Button size="sm" className="gap-1.5" onClick={() => setMostrarFormulario((v) => !v)}>
            {mostrarFormulario ? <Loader2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            Nueva publicación
          </Button>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <CrearPublicacionForm
            seccionId={seccionId}
            onCreada={(creada) => {
              setPublicaciones((prev) => [creada, ...prev])
              setMostrarFormulario(false)
            }}
          />
        </div>
      )}

      <PublicacionesLista
        publicaciones={publicaciones}
        seccionId={seccionId}
        onNuevaPublicacion={() => setMostrarFormulario(true)}
      />
    </div>
  )
}