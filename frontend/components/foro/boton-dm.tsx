"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MessageSquare } from "lucide-react"
import { useAuth } from "@/components/providers/auth-context"
import { dmService } from "@/lib/dm-service"
import { cn } from "@/lib/utils"

interface BotonDMProps {
  autorPerfilId: string
  /** Nombre del autor para el aria-label accesible. */
  autorNombre?: string | null
  /** Icono compacto para tarjetas del feed y ranking. */
  iconOnly?: boolean
  className?: string
}

/**
 * "Enviar Mensaje Directo" ubicado junto al autor de una publicación,
 * comentario o entrada de ranking. Oculto si el autor es el propio usuario.
 *
 * NO envía un saludo automático: inicia (o reutiliza) la conversación y
 * redirige a /mensajes?c={id} para que el usuario escriba desde el chat.
 */
export function BotonDM({
  autorPerfilId,
  autorNombre,
  iconOnly = false,
  className,
}: BotonDMProps) {
  const { supabaseUser } = useAuth()
  const router = useRouter()
  const [iniciando, setIniciando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Identidad canónica: perfiles.id == auth.users.id.
  const usuarioActual = supabaseUser?.id
  if (!usuarioActual || usuarioActual === autorPerfilId) return null

  const iniciar = async () => {
    setIniciando(true)
    setError(null)
    try {
      const conversacion = await dmService.iniciarConversacion({
        usuario_id: autorPerfilId,
      })
      router.push(`/mensajes?c=${conversacion.id}`)
    } catch (e: any) {
      setError(e.message || "No se pudo abrir el chat.")
      setIniciando(false)
    }
  }

  const etiqueta = `Enviar mensaje directo a ${autorNombre ?? "este usuario"}`

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={iniciar}
        disabled={iniciando}
        title={error ? `No se pudo iniciar: ${error}` : etiqueta}
        aria-label={error ? `${etiqueta}. Error: ${error}` : etiqueta}
        aria-busy={iniciando}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground",
          "hover:text-primary transition-colors disabled:opacity-50",
          iconOnly && "rounded-lg p-1.5",
          className,
        )}
      >
        {iniciando ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <MessageSquare className="h-3.5 w-3.5" />
        )}
        {!iconOnly && "Mensaje"}
      </button>
      {error && !iconOnly && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  )
}