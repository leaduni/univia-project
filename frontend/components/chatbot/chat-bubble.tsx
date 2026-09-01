// Círculo flotante del chatbot: punto de montaje único (ver app/layout.tsx).
//
// Guarda el estado de la conversación (mensajes, conversacion_id, si hay un
// turno en curso) porque vive en el layout raíz y no se desmonta al navegar
// entre páginas — a diferencia de DashboardLayout, que cada página instancia
// de nuevo. Montarlo ahí perdería el hilo del chat en cada clic de la barra
// lateral.
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MessageCircle, X } from "lucide-react"
import { useAuth } from "@/components/providers/auth-context"
import { apiService } from "@/lib/api-service"
import { enviarMensajeChat } from "@/lib/chatbot-service"
import { useOnline } from "@/lib/use-online"
import { ChatPanel } from "./chat-panel"
import type { MensajeChat } from "@/types/chatbot"

function idTemporal(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/** Clave de localStorage donde vive el `conversacion_id` activo de un usuario. */
function claveConversacion(userId: string): string {
  return `univia_chat_conversacion_${userId}`
}

function leerConversacionGuardada(userId: string): number | null {
  try {
    const crudo = localStorage.getItem(claveConversacion(userId))
    const id = crudo ? Number(crudo) : NaN
    return Number.isFinite(id) ? id : null
  } catch {
    // Modo privado o almacenamiento restringido: se arranca sin hilo previo,
    // no es motivo para romper el chat.
    return null
  }
}

function guardarConversacion(userId: string, conversacionId: number): void {
  try {
    localStorage.setItem(claveConversacion(userId), String(conversacionId))
  } catch {
    /* nada que hacer si no se puede persistir */
  }
}

function olvidarConversacion(userId: string): void {
  try {
    localStorage.removeItem(claveConversacion(userId))
  } catch {
    /* idem */
  }
}

/** Fila de chat_mensajes (GET /chatbot/conversaciones/{id}) al shape del panel. */
function mapearMensajeGuardado(fila: any): MensajeChat {
  return {
    id: String(fila.id),
    rol: fila.rol,
    contenido: fila.contenido,
    intent: fila.intent ?? undefined,
    adjuntos: fila.metadata && Object.keys(fila.metadata).length ? fila.metadata : undefined,
  }
}

export function ChatBubble() {
  const { user, session } = useAuth()
  const enLinea = useOnline()
  const [abierto, setAbierto] = useState(false)
  const [expandido, setExpandido] = useState(false)
  // Controla el pulso de "mírame" del botón; se apaga en la primera
  // interacción y no vuelve a mostrarse en este montaje.
  const [yaInteractuo, setYaInteractuo] = useState(false)
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [enviando, setEnviando] = useState(false)
  // Sube cuando una respuesta termina de llegar con el panel cerrado: es el
  // único caso real de "mensaje no leído" en un chat que el propio usuario
  // inicia (no hay push del servidor).
  const [sinVer, setSinVer] = useState(false)

  const conversacionIdRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const abiertoRef = useRef(abierto)
  abiertoRef.current = abierto
  const contenedorRef = useRef<HTMLDivElement>(null)

  // Cancela un turno en vuelo si el usuario navega fuera de la app
  // autenticada (logout) mientras el stream sigue abierto.
  useEffect(() => () => abortRef.current?.abort(), [])

  // Retoma el hilo activo al recargar la página: sin esto, F5 con el chat a
  // medias deja al estudiante con la burbuja vacía y el historial solo en la
  // BD (recuperable por API, pero no por sí solo). Un id guardado que ya no
  // exista (borrado, o expirado por la retención de 30 días) se descarta en
  // silencio: no es un error, es motivo para empezar un hilo nuevo.
  useEffect(() => {
    if (!user?.id) return
    const idGuardado = leerConversacionGuardada(user.id)
    if (idGuardado === null) return

    let cancelado = false
    apiService
      .obtenerConversacionChat(idGuardado)
      .then((datos) => {
        if (cancelado) return
        if (!datos) {
          olvidarConversacion(user.id)
          return
        }
        conversacionIdRef.current = idGuardado
        setMensajes((datos.mensajes || []).map(mapearMensajeGuardado))
      })
      .catch(() => {
        olvidarConversacion(user.id)
      })

    return () => {
      cancelado = true
    }
  }, [user?.id])

  // Cerrar con Escape o clic fuera: el panel no es un modal (el resto de la
  // página sigue interactiva detrás), pero un widget flotante que solo se
  // cierra con su propio botón de X es una fricción que cualquier pasada de
  // diseño señalaría.
  useEffect(() => {
    if (!abierto) return

    const alHacerClicFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    const alPresionarEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false)
    }

    document.addEventListener("mousedown", alHacerClicFuera)
    document.addEventListener("keydown", alPresionarEscape)
    return () => {
      document.removeEventListener("mousedown", alHacerClicFuera)
      document.removeEventListener("keydown", alPresionarEscape)
    }
  }, [abierto])

  const alternar = () => {
    setYaInteractuo(true)
    setAbierto((previo) => {
      const siguiente = !previo
      if (siguiente) setSinVer(false)
      return siguiente
    })
  }

  const enviar = useCallback(
    async (texto: string) => {
      const token = session?.access_token
      if (!token || enviando) return

      const idUsuario = idTemporal()
      const idAsistente = idTemporal()

      // Cortar acá y no dejar que la petición falle sola: sin conexión no
      // hay nada que el backend pueda responder, y esperar el fetch solo
      // demoraría el aviso hasta que el navegador termine de darse cuenta.
      if (!enLinea) {
        setMensajes((prev) => [
          ...prev,
          { id: idUsuario, rol: "user", contenido: texto },
          {
            id: idAsistente,
            rol: "assistant",
            contenido: "Estás sin conexión a internet. Cuando vuelva, dale a reintentar.",
            esError: true,
            textoOrigen: texto,
          },
        ])
        if (!abiertoRef.current) setSinVer(true)
        return
      }

      setMensajes((prev) => [
        ...prev,
        { id: idUsuario, rol: "user", contenido: texto },
        { id: idAsistente, rol: "assistant", contenido: "", enCurso: true },
      ])
      setEnviando(true)

      const controlador = new AbortController()
      abortRef.current = controlador

      const actualizarAsistente = (cambios: Partial<MensajeChat>) => {
        setMensajes((prev) =>
          prev.map((m) => (m.id === idAsistente ? { ...m, ...cambios } : m)),
        )
      }

      try {
        await enviarMensajeChat(
          texto,
          conversacionIdRef.current,
          token,
          {
            onCabecera: ({ conversacionId, intent, adjuntos }) => {
              conversacionIdRef.current = conversacionId
              if (user?.id) guardarConversacion(user.id, conversacionId)
              actualizarAsistente({ intent, adjuntos })
            },
            onDelta: (fragmento) => {
              setMensajes((prev) =>
                prev.map((m) =>
                  m.id === idAsistente ? { ...m, contenido: m.contenido + fragmento } : m,
                ),
              )
            },
            onError: (mensajeError) => {
              actualizarAsistente({ contenido: mensajeError, esError: true, textoOrigen: texto })
            },
          },
          controlador.signal,
        )
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          actualizarAsistente({
            contenido: e?.message || "No se pudo contactar al asistente. Intenta de nuevo en unos segundos.",
            esError: true,
            textoOrigen: texto,
          })
        }
      } finally {
        actualizarAsistente({ enCurso: false })
        setEnviando(false)
        if (!abiertoRef.current) setSinVer(true)
      }
    },
    [session?.access_token, enviando, enLinea, user?.id],
  )

  // Solo para estudiantes autenticados que ya completaron el onboarding:
  // `estado_academico` y `recurso` necesitan carrera/malla resueltas, y
  // mostrar la burbuja antes solo invitaría a un turno que el bot no puede
  // responder bien.
  const onboardingCompletado =
    user?.onboarding_completado || user?.estudiante?.onboarding_completado
  if (!user || !onboardingCompletado || !session?.access_token) return null

  return (
    <div
      ref={contenedorRef}
      className={
        abierto && expandido
          ? "fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          : "fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3"
      }
    >
      {abierto && (
        <ChatPanel
          mensajes={mensajes}
          enviando={enviando}
          enLinea={enLinea}
          onEnviar={enviar}
          onCerrar={() => setAbierto(false)}
          expandido={expandido}
          onAlternarExpandido={() => setExpandido((previo) => !previo)}
        />
      )}

      {(!abierto || !expandido) && (
        <button
          type="button"
          onClick={alternar}
          aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente"}
          aria-expanded={abierto}
          className="relative w-14 h-14 rounded-full gradient-ai-neon text-white shadow-lg shadow-[var(--ai-neon-magenta)]/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          {!yaInteractuo && !abierto && (
            <span
              className="absolute inset-0 rounded-full bg-[var(--ai-neon-pink)]/50 animate-ping"
              aria-hidden="true"
            />
          )}
          {sinVer && !abierto && (
            <span
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0b0c16]"
              aria-hidden="true"
            />
          )}
          {abierto ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </button>
      )}
    </div>
  )
}
