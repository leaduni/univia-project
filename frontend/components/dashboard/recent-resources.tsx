// Sección "Recursos nuevos en tus cursos" del dashboard
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FileText, FlaskConical, Notebook, Video } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { RECURSOS_DATA } from "@/lib/mockData"
import { useAuth } from "@/components/providers/auth-context"
import type { Recurso } from "@/types/recurso"

const MAX_TARJETAS = 6

const CABECERAS = [
  "gradient-brand",
  "gradient-purple",
  "gradient-brand-br",
  "gradient-icon",
  "gradient-login",
  "gradient-brand",
]

const ICONO_POR_TIPO: Record<string, any> = {
  Examen: FileText,
  Practica: FlaskConical,
  Apunte: Notebook,
  Libro: Notebook,
  Video: Video,
}

export function RecentResources() {
  const { user } = useAuth()
  // user.id es una primitiva estable: el objeto `session` cambia en cada
  // renovación de token de Supabase y dispararía re-fetches innecesarios.
  const userId = user?.id ?? null
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [esEjemplo, setEsEjemplo] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    // Sin sesión no hay token: ir directo al fallback de datos de ejemplo
    // en vez de lanzar un fetch que devolvería 401 o 404.
    if (!user) {
      setRecursos(RECURSOS_DATA.slice(0, MAX_TARJETAS) as Recurso[])
      setEsEjemplo(true)
      setCargando(false)
      return
    }

    apiService
      .getRecursos({})
      .then((data) => {
        if (!activo) return
        const lista = Array.isArray(data) ? data : []
        if (lista.length) {
          setRecursos(lista.slice(0, MAX_TARJETAS))
          setEsEjemplo(false)
        } else {
          // Respuesta válida pero vacía: se muestra el catálogo de ejemplo
          // para que la sección no quede en blanco.
          setRecursos(RECURSOS_DATA.slice(0, MAX_TARJETAS) as Recurso[])
          setEsEjemplo(true)
        }
      })
      .catch(() => {
        // Fallback visual ante fallas del backend, como indica AGENTE.md.
        if (!activo) return
        setRecursos(RECURSOS_DATA.slice(0, MAX_TARJETAS) as Recurso[])
        setEsEjemplo(true)
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [userId])

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Recursos nuevos en tus cursos
        </h2>
        <div className="flex items-center gap-3">
          {/* Se avisa cuando el contenido es de muestra: sin esta marca, el
              equipo puede creer que el banco de recursos ya está conectado. */}
          {esEjemplo && !cargando && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground/80">
              contenido de ejemplo
            </span>
          )}
          <Link href="/recursos" className="text-xs text-accent hover:underline shrink-0">
            Ver todos
          </Link>
        </div>
      </div>

      {cargando ? (
        <div className="flex gap-4 overflow-hidden pb-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="shrink-0 w-64 h-40 rounded-xl bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
          {recursos.map((recurso, i) => {
            const Icono = ICONO_POR_TIPO[recurso.tipo] ?? FileText
            return (
              <article
                key={recurso.id}
                className="shrink-0 w-64 bg-card border border-border rounded-xl overflow-hidden hover:border-accent/40 transition-colors"
              >
                <div
                  className={`relative h-16 overflow-hidden ${CABECERAS[i % CABECERAS.length]}`}
                >
                  <div className="absolute -right-1 -bottom-1 opacity-20 text-primary-foreground pointer-events-none">
                    <Icono className="w-14 h-14 stroke-[1.5]" />
                  </div>
                </div>
                <div className="p-4">
                  <span className="text-xs text-muted-foreground font-mono">
                    {recurso.codigo_curso ?? recurso.nombre_curso ?? "—"}
                  </span>
                  <h3 className="text-sm font-medium text-foreground mt-1 truncate">
                    {recurso.titulo}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {recurso.tipo}
                    {typeof recurso.downloads === "number"
                      ? ` · ${recurso.downloads.toLocaleString()} descargas`
                      : ""}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
