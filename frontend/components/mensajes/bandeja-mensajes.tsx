"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { dmService } from "@/lib/dm-service"
import type { ConversacionDM } from "@/types/dm"
import { ChatDM } from "./chat-dm"
import { BadgeModerador } from "@/components/foro/badge-moderador"

export function BandejaMensajes() {
  const [conversaciones, setConversaciones] = useState<ConversacionDM[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activa, setActiva] = useState<ConversacionDM | null>(null)
  const searchParams = useSearchParams()
  const dmParam = searchParams.get("dm")

  const cargar = useCallback(() => {
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
  }, [dmParam])

  useEffect(() => {
    cargar()
  }, [cargar])

  const abrir = (conversacion: ConversacionDM) => {
    setActiva(conversacion)
    // Optimista: limpiar el contador al abrir.
    setConversaciones((prev) =>
      prev.map((c) => (c.id === conversacion.id ? { ...c, no_leidos: 0 } : c)),
    )
  }

  return (
    <main className="relative min-h-[calc(100vh-96px)] overflow-hidden bg-[#090a12] text-white">

      {/* =========================================================
          ATMÓSFERA
      ========================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Orbe principal */}
        <div className="absolute left-[18%] top-[22%] h-[520px] w-[520px] rounded-full bg-cyan-500/[0.055] blur-[120px]" />

        {/* Orbe secundario */}
        <div className="absolute right-[8%] top-[5%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/[0.045] blur-[120px]" />

        {/* Glow inferior */}
        <div className="absolute bottom-[-250px] left-[45%] h-[500px] w-[500px] rounded-full bg-violet-600/[0.035] blur-[140px]" />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#090a12_100%)]" />
      </div>


      {/* =========================================================
          PAGE CONTENT
      ========================================================== */}

      <div className="relative mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-8 lg:px-10 lg:py-8">

        {/* Page heading */}
        <header className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />

            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/60">
              Comunicación
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            Mensajes
          </h1>

          <p className="mt-2 text-sm text-white/40">
            Conversa en privado con otros estudiantes.
          </p>
        </header>


        {/* =========================================================
            GLASS CHAT WORKSPACE
        ========================================================== */}

        <div className="group relative">

          {/* Exterior glow */}
          <div className="pointer-events-none absolute -inset-px rounded-[24px] bg-gradient-to-br from-cyan-400/[0.10] via-transparent to-fuchsia-500/[0.08] opacity-60 blur-sm" />

          {/* Main glass window */}
          <div
            className="
              relative
              flex
              h-[calc(100dvh-245px)]
              min-h-[560px]
              overflow-hidden
              rounded-[24px]
              border
              border-white/[0.08]
              bg-white/[0.02]
              shadow-2xl
              shadow-black/40
              backdrop-blur-2xl
            "
          >

            {/* Top glass reflection */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/[0.14] to-transparent" />

            {/* =====================================================
                SIDEBAR
            ====================================================== */}

            <aside
              className="
                flex
                w-full
                max-w-[330px]
                shrink-0
                flex-col
                border-r
                border-white/[0.06]
                bg-white/[0.01]
              "
            >

              {/* Sidebar header */}
              <div className="flex h-[64px] shrink-0 items-center border-b border-white/[0.06] px-5">
                <div>
                  <h2 className="text-sm font-semibold tracking-[-0.01em] text-white/90">
                    Conversaciones
                  </h2>

                  <p className="mt-0.5 text-[10px] text-white/25">
                    Tus mensajes privados
                  </p>
                </div>
              </div>


              {/* =================================================
                  CONVERSATION LIST
              ================================================== */}

              <div className="flex-1 overflow-y-auto p-2">

                {cargando ? (
                  <div className="space-y-2 p-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
                    ))}
                  </div>
                ) : error ? (
                  <p className="p-4 text-xs text-red-400">{error}</p>
                ) : conversaciones.length > 0 ? (
                  <div className="space-y-1">

                    {conversaciones.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => abrir(c)}
                        className={`
                          group/conversation
                          relative
                          flex
                          w-full
                          items-center
                          gap-3
                          rounded-xl
                          px-3
                          py-3
                          text-left
                          transition-all
                          duration-200

                          ${
                            activa?.id === c.id
                              ? "border border-white/[0.08] bg-white/[0.055]"
                              : "border border-transparent hover:border-white/[0.05] hover:bg-white/[0.03]"
                          }
                        `}
                      >

                        {/* Active indicator */}
                        {activa?.id === c.id && (
                          <span className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.65)]" />
                        )}

                        {/* Avatar */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-medium uppercase text-white/60">
                          {(c.otro_nombre || "E").charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-white/75">
                              <span className="truncate">{c.otro_nombre || "Estudiante"}</span>
                              <BadgeModerador perfilId={c.otro_id} />
                            </span>

                            {c.no_leidos > 0 && (
                              <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-cyan-500/90 px-1.5 text-[10px] font-semibold text-slate-950">
                                {c.no_leidos}
                              </span>
                            )}
                          </div>

                          {c.ultimo_mensaje && (
                            <p className="mt-1 truncate text-[11px] text-white/30">
                              {c.ultimo_mensaje}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}

                  </div>
                ) : (

                  /* =================================================
                     EMPTY STATE — SIDEBAR
                  ================================================== */

                  <div className="flex h-full min-h-[360px] flex-col items-center justify-start px-6 pt-14 text-center">

                    {/* Icon container (variante pulida con brillo) */}
                    <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.07] text-cyan-400">
                      <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 blur-xl" />
                      <svg className="relative h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 15a3 3 0 01-3 3H8l-4 3v-9a3 3 0 013-3h10a3 3 0 013 3v3z" />
                      </svg>
                    </div>

                    <h3 className="text-sm font-medium tracking-[-0.01em] text-white/80">
                      Aún no tienes conversaciones
                    </h3>

                    <p className="mt-2 max-w-[210px] text-xs leading-5 text-white/35">
                      Usa <span className="text-white/55">"Enviar mensaje"</span>{" "}
                      en el foro para empezar.
                    </p>
                  </div>
                )}

              </div>
            </aside>


            {/* =====================================================
                CHAT AREA
            ====================================================== */}

            <section className="relative flex min-w-0 flex-1 flex-col">

              {/* Subtle radial light inside chat */}
              <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-cyan-500/[0.025] blur-[100px]" />
              </div>


              {/* Chat activo: header, lista de mensajes y composer actuales
                  viven dentro de ChatDM (caja transparente que hereda el glass). */}
              {activa ? (
                <ChatDM
                  key={activa.id}
                  conversacion={activa}
                  onVolver={() => setActiva(null)}
                />
              ) : (

                /* =================================================
                   EMPTY STATE — CHAT PRINCIPAL
                ================================================== */

                <div className="relative flex flex-1 items-center justify-center px-6">

                  <div className="flex max-w-md flex-col items-center text-center">

                    {/* Icon container (variante pulida con brillo) */}
                    <div className="relative mb-6">
                      <div className="absolute -inset-5 rounded-full bg-cyan-400/[0.06] blur-2xl" />
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.07] text-cyan-400">
                        <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 blur-xl" />
                        <svg className="relative h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 15a3 3 0 01-3 3H8l-4 3v-9a3 3 0 013-3h10a3 3 0 013 3v3z" />
                        </svg>
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-medium tracking-[-0.02em] text-white/80 sm:text-lg">
                      Selecciona una conversación
                    </h2>

                    {/* Description */}
                    <p className="mt-2 max-w-sm text-sm leading-6 text-white/35">
                      Selecciona una conversación para verla,
                      <br className="hidden sm:block" />
                      o inicia una desde el foro.
                    </p>

                  </div>
                </div>
              )}

            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
