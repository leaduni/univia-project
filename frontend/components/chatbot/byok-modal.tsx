// Modal de configuración BYOK: el estudiante trae su propia clave de Gemini
// (Google AI Studio) para usar su cupo en horas pico. La clave solo vive en su
// navegador (localStorage) y nunca se persiste ni loguea.
"use client"

import { useState, type ReactNode } from "react"
import {
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { validateKey } from "@/lib/chatbot-service"
import { borrarClaveByok, formatoGeminiValido, guardarClaveByok } from "@/lib/byok"

interface ByokModalProps {
  abierto: boolean
  token: string
  claveGuardada: string | null
  onCerrar: () => void
  onCambio: () => void
}

export function ByokModal({ abierto, token, claveGuardada, onCerrar, onCambio }: ByokModalProps) {
  const [clave, setClave] = useState(claveGuardada ?? "")
  const [visible, setVisible] = useState(false)
  const [validando, setValidando] = useState(false)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)
  const [guiaAbierta, setGuiaAbierta] = useState(false)

  if (!abierto) return null

  const probar = async () => {
    const limpia = clave.trim()
    if (!limpia) {
      setMensaje({ ok: false, texto: "Escribí una clave para probarla." })
      return
    }
    if (!formatoGeminiValido(limpia)) {
      setMensaje({ ok: false, texto: "Esa clave no tiene el formato de Google (debe empezar por AIza…)." })
      return
    }

    setValidando(true)
    setMensaje(null)
    try {
      const resultado = await validateKey(token, limpia)
      if (resultado.valid) {
        guardarClaveByok(limpia)
        setMensaje({ ok: true, texto: "Clave válida y guardada. Ahora usás tu propia cuota." })
        onCambio()
      } else {
        setMensaje({ ok: false, texto: resultado.error || "La clave no es válida." })
      }
    } catch {
      setMensaje({ ok: false, texto: "No se pudo validar la clave. Revisá tu conexión." })
    } finally {
      setValidando(false)
    }
  }

  const borrar = () => {
    borrarClaveByok()
    setClave("")
    setMensaje({ ok: true, texto: "Clave eliminada. Volviste a la cuota compartida." })
    onCambio()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Configurar tu propia clave de IA"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#0d0e1b] border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#c4b5fd]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Trae tu propia clave de IA</h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Explicación */}
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-0.5 text-[#c4b5fd] shrink-0" aria-hidden="true" />
              <span>
                En horas pico la cuota compartida de UniVia puede saturarse. Con tu propia clave
                de Google Gemini usás tu cupo gratuito y el asistente responde al instante, sin fila.
              </span>
            </p>
            <p className="text-xs text-muted-foreground/70">
              Tu clave se guarda <b>solo en tu navegador</b> y nunca se envía a la base de datos.
            </p>
          </div>

          {/* Input con máscara */}
          <div className="space-y-2">
            <label htmlFor="byok-clave" className="text-xs font-medium text-foreground">
              Clave de Google Gemini (API key)
            </label>
            <div className="relative">
              <Input
                id="byok-clave"
                type={visible ? "text" : "password"}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="AIza…"
                autoComplete="off"
                spellCheck={false}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Ocultar clave" : "Mostrar clave"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mensaje de resultado */}
          {mensaje && (
            <p
              className={`text-xs ${
                mensaje.ok ? "text-emerald-400" : "text-rose-400"
              } flex items-start gap-1.5`}
            >
              {mensaje.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              ) : null}
              {mensaje.texto}
            </p>
          )}

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <Button type="button" onClick={probar} disabled={validando} className="gap-1.5 flex-1">
              {validando ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Guardar y probar
            </Button>
            {claveGuardada && (
              <Button type="button" variant="ghost" onClick={borrar} aria-label="Eliminar clave">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Guía desplegable */}
          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setGuiaAbierta((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <span>¿Cómo conseguirla? (Google AI Studio, 2 min)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${guiaAbierta ? "rotate-180" : ""}`} />
            </button>
            {guiaAbierta && (
              <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground list-decimal ml-4 leading-relaxed">
                <li>Abrí <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[#c4b5fd] underline">aistudio.google.com/apikey</a> e iniciá sesión con tu cuenta de Google.</li>
                <li>Hacé clic en <b>“Create API key”</b> y elegí un proyecto.</li>
                <li>Copiá la clave (empieza por <b>AIza…</b>).</li>
                <li>Pégala acá arriba y dale a <b>“Guardar y probar”</b>.</li>
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}