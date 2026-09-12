"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MessageSquare, Users } from "lucide-react"
import { foroService } from "@/lib/foro-service"
import type { Seccion } from "@/types/foro"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ForoSecciones() {
  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    foroService
      .getSecciones()
      .then((data) => {
        if (activo) setSecciones(data)
      })
      .catch((e) => {
        if (activo) setError(e.message || "No se pudieron cargar las secciones.")
      })
      .finally(() => {
        if (activo) setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [])

  if (cargando) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  const globales = secciones.filter((s) => s.tipo === "global")
  const porFacultad = secciones.filter((s) => s.tipo === "facultad")

  return (
    <div className="space-y-8">
      {globales.length > 0 && (
        <section>
          <h2 className="font-poppins font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
            Comunidad
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {globales.map((seccion) => (
              <SeccionCard key={seccion.id} seccion={seccion} />
            ))}
          </div>
        </section>
      )}

      {porFacultad.length > 0 && (
        <section>
          <h2 className="font-poppins font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
            Por facultad
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {porFacultad.map((seccion) => (
              <SeccionCard key={seccion.id} seccion={seccion} />
            ))}
          </div>
        </section>
      )}

      {secciones.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aún no hay secciones disponibles.</p>
        </div>
      )}
    </div>
  )
}

function SeccionCard({ seccion }: { seccion: Seccion }) {
  const esFacultad = seccion.tipo === "facultad"
  return (
    <Link
      href={`/foro/${seccion.id}`}
      className={cn(
        "group flex items-start gap-4 rounded-2xl border border-border bg-card p-5",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl",
      )}
    >
      <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#7957f1] to-[#a6249d] flex items-center justify-center text-white shadow-lg shadow-purple-950/30">
        {esFacultad ? <Users className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-poppins font-semibold text-[15px] text-foreground truncate group-hover:text-primary transition-colors">
          {seccion.titulo}
        </h3>
        {seccion.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {seccion.descripcion}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {seccion.num_publicaciones} publicaciones
          </span>
          {esFacultad && seccion.facultad_nombre && (
            <>
              <span>•</span>
              <span className="truncate">{seccion.facultad_nombre}</span>
            </>
          )}
        </div>
      </div>
      <Button variant="ghost" size="sm" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        Entrar
      </Button>
    </Link>
  )
}