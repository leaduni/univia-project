"use client"

import { useEffect, useState } from "react"
import { MessageSquare } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { dmService } from "@/lib/dm-service"
import type { ConversacionDM } from "@/types/dm"
import { cn } from "@/lib/utils"
import { ChatDM } from "./chat-dm"
import { BadgeModerador } from "@/components/foro/badge-moderador"

export function BandejaMensajes() {
  const [conversaciones, setConversaciones] = useState<ConversacionDM[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activa, setActiva] = useState<ConversacionDM | null>(null)
  const searchParams = useSearchParams()
  const dmParam = searchParams.get("dm")

  const cargar = () => {
    dmService
      .getConversaciones()
      .then((data) => {
        setConversaciones(data)
        // Si llegamos con ?dm=ID, abrir esa conversación automáticamente.
        if (dmParam) {
          const objetivo = data.find((c) => c.id === Number(dmParam))
          if (objetivo) setActiva(objetivo)
        }
      })
      .catch((e) => setError(e.message || "No se pudieron cargar tus mensajes."))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abrir = (conversacion: ConversacionDM) => {
    setActiva(conversacion)
    // Optimista: limpiar el contador al abrir.
    setConversaciones((prev) =>
      prev.map((c) => (c.id === conversacion.id ? { ...c, no_leidos: 0 } : c)),
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Bandeja */}
      <aside className="lg:h-[calc(100vh-11rem)] overflow-y-auto custom-scrollbar rounded-2xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border/60">
          <h2 className="font-poppins font-semibold text-sm">Conversaciones</h2>
        </div>

        {cargando ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-xs text-destructive p-4">{error}</p>
        ) : conversaciones.length === 0 ? (
          <div className="p-6 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Aún no tienes conversaciones.
              <br />
              Usa "Enviar mensaje" en el foro para empezar.
            </p>
          </div>
        ) : (
          <ul>
            {conversaciones.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => abrir(c)}
                  className={cn(
                    "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-secondary/40 transition-colors",
                    activa?.id === c.id && "bg-secondary/60",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm truncate">
                        {c.otro_nombre || "Estudiante"}
                      </span>
                      <BadgeModerador perfilId={c.otro_id} />
                    </div>
                    {c.ultimo_mensaje && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {c.ultimo_mensaje}
                      </p>
                    )}
                  </div>
                  {c.no_leidos > 0 && (
                    <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#7957f1] text-white text-[10px] font-semibold flex items-center justify-center">
                      {c.no_leidos}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Chat activo */}
      <section className="min-h-[60vh]">
        {activa ? (
          <ChatDM
            key={activa.id}
            conversacion={activa}
            onVolver={() => setActiva(null)}
          />
        ) : (
          <div className="h-full min-h-[60vh] rounded-2xl border border-border bg-card flex flex-col items-center justify-center text-center p-6">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Selecciona una conversación para verla, o inicia una desde el foro.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}