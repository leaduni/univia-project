// Chat flotante rediseñado (módulo `components/chat/`): FAB con gradiente AI,
// badge de no leídos, overlay con fade in/out y panel flotante animado con GSAP.
//
// Conserva SIN CAMBIOS la lógica de sesión, la comunicación SSE/streaming, el
// aborto de turnos y la persistencia del hilo en Supabase (localStorage + API)
// que ya vivía en components/chatbot/chat-bubble.tsx; solo se rediseña la capa
// de render y las transiciones.
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useGSAP } from "@gsap/react"
import { MessageCircle, X } from "lucide-react"
import gsap from "gsap"
import { useAuth } from "@/components/providers/auth-context"
import { apiService } from "@/lib/api-service"
import { enviarMensajeChat } from "@/lib/chatbot-service"
import { useOnline } from "@/lib/use-online"
import type { AdjuntosChat, IntentChat, MensajeChat } from "@/types/chatbot"
import { CHAT_TOKENS } from "./chat-tokens"
import { ChatPanel } from "./chat-panel"
import { animateOut, animatePanelOpen } from "./use-gsap-chat"

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

/** Fila de chat_mensajes tal como llega de GET /chatbot/conversaciones/{id}. */
interface FilaMensajeGuardado {
  id: number
  rol: "user" | "assistant"
  contenido: string
  intent?: IntentChat | null
  metadata?: AdjuntosChat | null
}

/** Fila de chat_mensajes (GET /chatbot/conversaciones/{id}) al shape del panel. */
function mapearMensajeGuardado(fila: FilaMensajeGuardado): MensajeChat {
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
  // true mientras la conversación está en modo expandido (panel grande).
  const [isExpanded, setIsExpanded] = useState(false)
  // true mientras corre la animación de salida del panel; mantiene montados el
  // overlay y el panel hasta que termina la transición.
  const [cerrando, setCerrando] = useState(false)
  // Controla el pulso de "mírame" del botón; se apaga en la primera
  // interacción y no vuelve a mostrarse en este montaje.
  const [yaInteractuo, setYaInteractuo] = useState(false)
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [enviando, setEnviando] = useState(false)
  // Sube cuando una respuesta termina de llegar con el panel cerrado: es el
  // único caso real de "mensaje no leído" en un chat que el propio usuario
  // inicia (no hay push del servidor).
  const [sinVer, setSinVer] = useState(false)
  // Espera del hilo previo al recargar la página; alimenta el skeleton.
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [inputValue, setInputValue] = useState("")

  const conversacionIdRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const abiertoRef = useRef(abierto)
  abiertoRef.current = abierto
  const cerrandoRef = useRef(false)
  // Espejo síncrono del input para que los chips (que llaman onInputChange y
  // onSend en el siguiente ciclo del event loop) lean el valor actualizado.
  const inputValueRef = useRef("")
  inputValueRef.current = inputValue

  const contenedorRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const fabIconRef = useRef<HTMLDivElement | null>(null)

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

    setCargandoHistorial(true)
    let cancelado = false
    apiService
      .obtenerConversacionChat(idGuardado)
      .then((datos) => {
        if (cancelado) return
        setCargandoHistorial(false)
        if (!datos) {
          olvidarConversacion(user.id)
          return
        }
        conversacionIdRef.current = idGuardado
        setMensajes((datos.mensajes || []).map(mapearMensajeGuardado))
      })
      .catch(() => {
        olvidarConversacion(user.id)
        setCargandoHistorial(false)
      })

    return () => {
      cancelado = true
    }
  }, [user?.id])

  /** Cierra el chat con animación de salida (overlay fade-out + panel animateOut). */
  const cerrarChat = useCallback(() => {
    if (!abiertoRef.current || cerrandoRef.current) return
    cerrandoRef.current = true
    setCerrando(true)

    if (overlayRef.current) {
      // Movimiento reducido: el fade-out del overlay se omite y se deja en su
      // estado visible; el desmontaje lo quita de la pantalla de inmediato.
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: CHAT_TOKENS.FADE_DURATION,
          ease: "power2.in",
        })
      } else {
        gsap.set(overlayRef.current, { opacity: 1, y: 0, scale: 1 })
      }
    }

    const panel = panelRef.current
    if (panel) {
      animateOut(panel, () => {
        cerrandoRef.current = false
        setCerrando(false)
        setAbierto(false)
        // Limpia los estilos inline para que la próxima apertura anime limpio.
        if (overlayRef.current) gsap.set(overlayRef.current, { clearProps: "opacity" })
        if (panelRef.current) gsap.set(panelRef.current, { clearProps: "opacity,transform" })
      })
    } else {
      cerrandoRef.current = false
      setCerrando(false)
      setAbierto(false)
    }
  }, [])

  const abrirChat = useCallback(() => {
    setYaInteractuo(true)
    setSinVer(false)
    cerrandoRef.current = false
    setCerrando(false)
    setAbierto(true)
  }, [])

  const alternar = () => {
    if (abiertoRef.current) {
      cerrarChat()
    } else {
      abrirChat()
    }
  }

  // Cerrar con Escape o clic fuera: el overlay deja la página oscurecida pero
  // el clic en el fondo (o la tecla Escape) cierra el chat con la animación de
  // salida, igual que el botón X del panel.
  useEffect(() => {
    if (!abierto) return

    const alHacerClicFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        cerrarChat()
      }
    }
    const alPresionarEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrarChat()
    }

    document.addEventListener("mousedown", alHacerClicFuera)
    document.addEventListener("keydown", alPresionarEscape)
    return () => {
      document.removeEventListener("mousedown", alHacerClicFuera)
      document.removeEventListener("keydown", alPresionarEscape)
    }
  }, [abierto, cerrarChat])

  // Apertura del chat: fade-in del overlay y entrada rebotada del panel. Corre
  // cuando `abierto` pasa a true; en el resto de los renders no hace nada.
  useGSAP(
    () => {
      if (!abierto) return
      const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      if (overlayRef.current) {
        if (sinMovimiento) {
          gsap.set(overlayRef.current, { opacity: 1, y: 0, scale: 1 })
        } else {
          gsap.from(overlayRef.current, {
            opacity: 0,
            duration: CHAT_TOKENS.FADE_DURATION,
            ease: "power2.out",
          })
        }
      }
      // animatePanelOpen aplica su propio guard de prefers-reduced-motion.
      if (panelRef.current) animatePanelOpen(panelRef.current)
    },
    { scope: contenedorRef, dependencies: [abierto] },
  )

  // Ícono del FAB: rotación y escala con rebote al alternar entre mensaje y X.
  useGSAP(
    () => {
      if (!fabIconRef.current || !yaInteractuo) return
      // Movimiento reducido: el ícono se deja en su estado final (identidad).
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(fabIconRef.current, { opacity: 1, y: 0, scale: 1 })
        return
      }
      gsap.fromTo(
        fabIconRef.current,
        { rotate: abierto ? -120 : 120, scale: 0.75 },
        {
          rotate: 0,
          scale: 1,
          duration: 0.45,
          ease: CHAT_TOKENS.SPRING_EASE,
          overwrite: "auto",
        },
      )
    },
    { scope: contenedorRef, dependencies: [abierto] },
  )

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
      } catch (error) {
        const err = error as { name?: string; message?: string } | null
        if (err?.name !== "AbortError") {
          actualizarAsistente({
            contenido:
              err?.message ||
              "No se pudo contactar al asistente. Intenta de nuevo en unos segundos.",
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
const manejarInputChange = useCallback((texto: string) => {
    inputValueRef.current = texto
    setInputValue(texto)
  }, [])

  const manejarEnvio = useCallback(() => {
    const texto = inputValueRef.current.trim()
    if (!texto || enviando) return
    setInputValue("")
    inputValueRef.current = ""
    void enviar(texto)
  }, [enviar, enviando])

  const limpiarConversacion = useCallback(() => {
    abortRef.current?.abort()
    conversacionIdRef.current = null
    setMensajes([])
    setInputValue("")
    inputValueRef.current = ""
    if (user?.id) olvidarConversacion(user.id)
  }, [user?.id])

  // Solo para estudiantes autenticados que ya completaron el onboarding:
  // `estado_academico` y `recurso` necesitan carrera/malla resueltas, y
  // mostrar la burbuja antes solo invitaría a un turno que el bot no puede
  // responder bien.
  const onboardingCompletado =
    user?.onboarding_completado || user?.estudiante?.onboarding_completado
  if (!user || !onboardingCompletado || !session?.access_token) return null

  const mostrandoChat = abierto || cerrando

  return (
    <>
      {/* Backdrop: oscurece y difumina la página; el clic cierra el chat. */}
      {mostrandoChat && (
        <div
          ref={overlayRef}
          onClick={cerrarChat}
          role="presentation"
          tabIndex={-1}
          className="fixed inset-0 z-[9990] bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}

      <div ref={contenedorRef} className="fixed inset-0 z-[9991] pointer-events-none">
        {/* Panel flotante del chat */}
        {mostrandoChat && (
          <div
            ref={panelRef}
            className={`pointer-events-auto fixed bottom-24 right-6 z-[9991] transition-[width,height] duration-300 ease-out ${
              isExpanded
                ? "w-[min(900px,calc(100vw-32px))] h-[min(85vh,780px)]"
                : "w-[min(420px,calc(100vw-24px))] h-[min(620px,calc(100vh-120px))]"
            }`}
          >
            <ChatPanel
              messages={mensajes}
              inputValue={inputValue}
              isLoading={cargandoHistorial}
              isStreaming={enviando}
              onSend={manejarEnvio}
              onAbort={() => abortRef.current?.abort()}
              onInputChange={manejarInputChange}
              onClear={limpiarConversacion}
              onClose={cerrarChat}
              isOnline={enLinea}
              conversacionId={conversacionIdRef.current}
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded((previo) => !previo)}
            />
          </div>
        )}

        {/* FAB: botón flotante con gradiente AI y badge de no leídos */}
        <button
          type="button"
          onClick={alternar}
          aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente"}
          aria-expanded={abierto}
          className="pointer-events-auto fixed bottom-6 right-6 z-[9991] w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d93340] via-[#a6249d] to-[#7957f1] shadow-[0_8px_24px_rgba(121,87,241,0.45)] text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          {!yaInteractuo && !abierto && (
            <span
              className="absolute inset-0 rounded-2xl bg-white/25 animate-ping"
              aria-hidden="true"
            />
          )}
          <div ref={fabIconRef} className="relative flex items-center justify-center">
            {abierto ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
          </div>
          {sinVer && !abierto && (
            <span
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#d93340] border-2 border-white"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    </>
  )
}