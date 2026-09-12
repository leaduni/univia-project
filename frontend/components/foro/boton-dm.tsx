"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MessageSquare } from "lucide-react"
import { useAuth } from "@/components/providers/auth-context"
import { dmService } from "@/lib/dm-service"
import { cn } from "@/lib/utils"

interface BotonDMProps {
  autorPerfilId: string
  className?: string
}

/**
 * "Enviar Mensaje Directo" ubicado junto al autor de una publicación o
 * comentario. Oculto si el autor es el propio usuario.
 */
export function BotonDM({ autorPerfilId, className }: BotonDMProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [iniciando, setIniciando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El usuario actual (perfiles.id) lo expone `user.id` desde el backend.
  const usuarioActual = user?.id || user?.estudiante?.id || (user as any)?.perfil_id
  if (!usuarioActual || usuarioActual === autorPerfilId) return null

  const iniciar = async () => {
    setIniciando(true)
    setError(null)
    try {
      const conversacion = await dmService.iniciarConversacion({
        usuario_id: autorPerfilId,
        primer_mensaje: "Hola, te escribo desde el foro de UniVia.",
      })
      router.push(`/mensajes?dm=${conversacion.id}`)
    } catch (e: any) {
      setError(e.message || "No se pudo abrir el chat.")
      setIniciando(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={iniciar}
        disabled={iniciando}
        title="Enviar mensaje directo"
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground",
          "hover:text-primary transition-colors disabled:opacity-50",
          className,
        )}
      >
        {iniciando ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
        Mensaje
      </button>
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  )
}