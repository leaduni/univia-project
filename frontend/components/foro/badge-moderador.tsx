"use client"

// Insignia de moderador para el foro.
//
// Carga una sola vez (a nivel de módulo) la lista de perfiles moderadores y
// muestra la insignia junto al nombre de los autores que lo son.

import { useEffect, useState } from "react"
import { ShieldCheck } from "lucide-react"
import { foroService } from "@/lib/foro-service"

// Caché en módulo: no re-pedir la lista de moderadores en cada render/hilo.
let moderadoresCache: string[] | null = null

/** `true` si el perfil_id dado es moderador (usa caché en módulo). */
export function useEsModerador(perfilId: string | undefined | null): boolean {
  const [moderadores, setModeradores] = useState<string[] | null>(moderadoresCache)

  useEffect(() => {
    if (moderadoresCache) {
      setModeradores(moderadoresCache)
      return
    }
    let activo = true
    foroService
      .getModeradores()
      .then((ids) => {
        moderadoresCache = ids
        if (activo) setModeradores(ids)
      })
      .catch(() => {
        if (activo) setModeradores([])
      })
    return () => {
      activo = false
    }
  }, [])

  if (!perfilId) return false
  return (moderadores ?? []).includes(perfilId)
}

/** Insignia visual de moderador. Render null si el autor no es moderador. */
export function BadgeModerador({ perfilId }: { perfilId: string | undefined | null }) {
  const esModerador = useEsModerador(perfilId)
  if (!esModerador) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-amber-300 bg-amber-950/60 border border-amber-800/40 shrink-0">
      <ShieldCheck className="w-3 h-3" />
      Mod
    </span>
  )
}