// Modal para compartir UniVia e invitar referidos. Copia el enlace con `?ref=`
// y registra la telemetría de compartición (POST /compartir/evento), una por día.
"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Loader2, MessageCircle, Share2, Send, Zap } from "lucide-react"
import { toast } from "sonner"
import { gamificacionService } from "@/lib/gamificacion-service"
import { formatearXp } from "@/lib/gamificacion-utils"
import type { ResumenGamificacion } from "@/types/gamificacion"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface ShareUniviaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function buildUrl(codigo: string): string {
  if (typeof window === "undefined") return `?ref=${codigo}`
  return `${window.location.origin}/auth/signup?ref=${encodeURIComponent(codigo)}`
}

export function ShareUniviaModal({ open, onOpenChange }: ShareUniviaModalProps) {
  const [resumen, setResumen] = useState<ResumenGamificacion | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [registrando, setRegistrando] = useState(false)

  useEffect(() => {
    if (!open) {
      setCopiado(false)
      return
    }
    gamificacionService.getResumen().then(setResumen).catch(() => {})
  }, [open])

  const codigo = resumen?.codigo_referido ?? null
  const url = codigo ? buildUrl(codigo) : ""

  const registrarEvento = async (canal: string) => {
    setRegistrando(true)
    try {
      const resp = await gamificacionService.registrarEventoCompartir(canal)
      if (resp.limite_diario) {
        toast.info("Ya registraste una compartición hoy.")
      }
    } catch (err: any) {
      toast.error(err?.message || "No se pudo registrar la compartición.")
    } finally {
      setRegistrando(false)
    }
  }

  const copiar = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
      void registrarEvento("copiar")
      toast.success("Enlace copiado al portapapeles.")
    } catch {
      toast.error("No se pudo copiar el enlace.")
    }
  }

  const abrirEnlace = (destino: "whatsapp" | "telegram") => {
    if (!url) return
    const target =
      destino === "whatsapp"
        ? `https://wa.me/?text=${encodeURIComponent(`¡Únete a UniVia y aprende conmigo! ${url}`)}`
        : `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent("¡Únete a UniVia y aprende conmigo!")}`
    window.open(target, "_blank", "noopener,noreferrer")
    void registrarEvento(destino)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto w-full max-w-lg rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Share2 className="w-5 h-5 text-[#7957f1]" aria-hidden="true" />
            Compartir UniVia
          </SheetTitle>
          <SheetDescription>
            Invita a tus compañeros y gana XP cuando completen su registro.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          {!codigo ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-[#7957f1]" aria-hidden="true" />
              Cargando tu enlace de invitación…
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-2xl border border-[#7957f1]/30 bg-[#7957f1]/10 p-4">
                <div className="flex items-center gap-1.5 tabular-nums">
                  <Zap className="w-5 h-5 text-[#7957f1]" aria-hidden="true" />
                  <span className="font-bold text-foreground">{formatearXp(resumen?.xp_total)}</span>
                  <span className="text-xs text-muted-foreground">XP</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ganas <span className="font-semibold text-foreground">+50 XP</span> por cada referido que complete el onboarding.
                </p>
              </div>

              {/* Enlace con el código */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tu enlace de invitación
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-xl border border-white/[0.1] bg-black/30 px-3 py-2.5 text-xs text-foreground">
                    {url}
                  </code>
                  <Button variant="outline" size="sm" onClick={copiar} disabled={registrando} aria-live="polite">
                    {copiado ? (
                      <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    )}
                    {copiado ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              </div>

              {/* Canales de compartición */}
              <div className="grid grid-cols-3 gap-3">
                <Button variant="outline" className="flex-col gap-1.5 py-4 h-auto" onClick={() => abrirEnlace("whatsapp")} disabled={registrando}>
                  <MessageCircle className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                  <span className="text-xs">WhatsApp</span>
                </Button>
                <Button variant="outline" className="flex-col gap-1.5 py-4 h-auto" onClick={() => abrirEnlace("telegram")} disabled={registrando}>
                  <Send className="w-5 h-5 text-sky-400" aria-hidden="true" />
                  <span className="text-xs">Telegram</span>
                </Button>
                <Button variant="outline" className="flex-col gap-1.5 py-4 h-auto" onClick={copiar} disabled={registrando}>
                  <Share2 className={cn("w-5 h-5 text-[#7957f1]")} aria-hidden="true" />
                  <span className="text-xs">Copiar</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}