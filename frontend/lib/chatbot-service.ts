// Cliente del chatbot: un turno contra POST /api/chatbot/mensajes, por SSE.
//
// No usa fetchWithAuth() de api-service.ts a propósito: ese helper reintenta
// (solo GET) y devuelve un Response ya resuelto para hacer .json(), pero acá
// se necesita leer el cuerpo como stream token a token con AbortController
// propio (para poder cancelar un turno a medias), así que se reimplementa el
// fetch con auth mínimo. Sigue el mismo patrón que
// components/learning-path/evaluacion-ia.tsx usa contra
// /evaluaciones/generar-stream.

import type { AdjuntosChat, IntentChat } from "@/types/chatbot"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const API_URL = BASE_URL.endsWith("/api") ? BASE_URL : `${BASE_URL}/api`

// Tiempo para que lleguen las CABECERAS del stream (clasificar intent +
// arrancar el handler), no para la respuesta completa: el LLM puede tardar
// varios segundos en generar y streamea token a token, así que una vez que
// `fetch()` resuelve con la respuesta, el temporizador se cancela y la
// lectura del cuerpo no tiene límite propio.
const TIMEOUT_CONEXION_MS = 20000

interface CabeceraStreamChat {
  conversacionId: number
  intent: IntentChat
  adjuntos?: AdjuntosChat
}

interface CallbacksMensajeChat {
  /** Primer evento del stream: a qué hilo se enganchó y con qué intención se va a responder. */
  onCabecera?: (info: CabeceraStreamChat) => void
  /** Un fragmento de texto de la respuesta, en el orden en que llega. */
  onDelta?: (fragmento: string) => void
  /** El backend cortó el turno con un error (cuota, proveedor caído, respuesta vacía). */
  onError?: (mensaje: string) => void
}

/**
 * Un AbortSignal que se aborta apenas lo hace cualquiera de los de entrada.
 *
 * `AbortSignal.any()` haría esto en una línea, pero no está en todos los
 * navegadores que este proyecto todavía necesita soportar; la composición
 * manual con `addEventListener` cubre lo mismo sin esa dependencia.
 */
function combinarSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const controlador = new AbortController()
  for (const s of signals) {
    if (!s) continue
    if (s.aborted) {
      controlador.abort(s.reason)
      break
    }
    s.addEventListener("abort", () => controlador.abort(s.reason), { once: true })
  }
  return controlador.signal
}

/**
 * Manda un mensaje del chatbot y consume la respuesta por SSE.
 *
 * Resuelve cuando el stream termina (con éxito o con un evento de error ya
 * entregado a `onError`); rechaza ante un fallo de red/HTTP/timeout antes o
 * durante la lectura del stream, o si `signal` se aborta (con `AbortError`,
 * para que quien llama distinga una cancelación propia de un fallo real).
 */
export async function enviarMensajeChat(
  mensaje: string,
  conversacionId: number | null,
  token: string,
  callbacks: CallbacksMensajeChat,
  signal?: AbortSignal,
): Promise<void> {
  const controladorTimeout = new AbortController()
  const señalCombinada = combinarSignals(signal, controladorTimeout.signal)
  const temporizador = setTimeout(() => controladorTimeout.abort(), TIMEOUT_CONEXION_MS)

  let response: Response
  try {
    response = await fetch(`${API_URL}/chatbot/mensajes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        mensaje,
        conversacion_id: conversacionId ?? undefined,
      }),
      signal: señalCombinada,
    })
  } catch (e: any) {
    if (controladorTimeout.signal.aborted) {
      throw new Error("El asistente tardó demasiado en responder. Revisa tu conexión e intenta de nuevo.")
    }
    // AbortError por cancelación real (desmontaje, logout): se deja pasar
    // tal cual para que ChatBubble no la muestre como un error de verdad.
    if (e?.name === "AbortError") throw e
    throw new Error("No se pudo conectar con el asistente. Revisa tu conexión a internet.")
  } finally {
    clearTimeout(temporizador)
  }

  if (!response.ok || !response.body) {
    const cuerpo = await response.json().catch(() => null)
    throw new Error(cuerpo?.detail || "No se pudo contactar al asistente.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    let resultado: ReadableStreamReadResult<Uint8Array>
    try {
      resultado = await reader.read()
    } catch (e: any) {
      if (e?.name === "AbortError") throw e
      throw new Error("Se perdió la conexión con el asistente a mitad de la respuesta.")
    }
    if (resultado.done) break

    // Igual que en evaluacion-ia.tsx: se acumula en buffer y solo se procesan
    // eventos SSE completos (separados por doble salto de línea); el chunk
    // de red puede cortar un evento a la mitad.
    buffer += decoder.decode(resultado.value, { stream: true })
    const eventos = buffer.split("\n\n")
    buffer = eventos.pop() ?? ""

    for (const evento of eventos) {
      const linea = evento.split("\n").find((l) => l.startsWith("data: "))
      if (!linea) continue

      let payload: any
      try {
        payload = JSON.parse(linea.slice(6))
      } catch {
        continue
      }

      if (typeof payload.conversacion_id === "number") {
        callbacks.onCabecera?.({
          conversacionId: payload.conversacion_id,
          intent: payload.intent,
          adjuntos: payload.adjuntos,
        })
      } else if (typeof payload.delta === "string") {
        callbacks.onDelta?.(payload.delta)
      } else if (payload.error) {
        callbacks.onError?.(payload.error)
      }
      // El evento `done` no aporta nada que los `delta` acumulados no
      // tengan ya: se ignora.
    }
  }
}
