// Pantalla de donaciones: aporte por Yape, transparencia y cuadro de honor.
"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, BadgeCheck, Megaphone, Server } from "lucide-react"
import {
  getMuroDonaciones,
  getResumenDonaciones,
  getTopDonantes,
  type DonanteTop,
  type MensajeMuro,
  type ResumenDonaciones,
} from "@/lib/donaciones-service"
import { DonarForm } from "./donar-form"
import { LibroCaja } from "./libro-caja"
import { MuroMensajes } from "./muro-mensajes"
import { RielMeta } from "./riel-meta"
import { TopDonantes } from "./top-donantes"

const DESTINOS = [
  {
    icono: Server,
    titulo: "Servidor 24/7",
    texto: "Que la plataforma aguante en matrícula y en semana de exámenes.",
  },
  {
    icono: BadgeCheck,
    titulo: "Sin intermediarios",
    texto: "El aporte entra directo al fondo. Yape no cobra comisión.",
  },
  {
    icono: Megaphone,
    titulo: "Cero publicidad",
    texto: "Venus no vende anuncios ni datos de nadie.",
  },
]

export function DonacionesView() {
  const [resumen, setResumen] = useState<ResumenDonaciones | null>(null)
  const [donantes, setDonantes] = useState<DonanteTop[]>([])
  const [mensajes, setMensajes] = useState<MensajeMuro[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setError(null)
    try {
      // En paralelo: los tres bloques son independientes entre sí.
      const [resumenData, topData, muroData] = await Promise.all([
        getResumenDonaciones(),
        getTopDonantes(10),
        getMuroDonaciones(20),
      ])
      setResumen(resumenData)
      setDonantes(topData)
      setMensajes(muroData)
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las donaciones.")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-6xl px-0 py-4 sm:px-6 sm:py-6">
        <header className="mb-6 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#c4b5fd]">
            Financiamiento comunitario
          </p>
<h1 className="mt-1.5 font-heading text-2xl font-bold break-words text-foreground sm:text-4xl">
            Ayuda a crecer a Venus
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Venus es independiente y sin publicidad, hecha por y para la comunidad UNI.
            Cada aporte mantiene la plataforma en pie y gratuita.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">No pudimos cargar las donaciones</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <button
              onClick={cargar}
              className="min-h-10 shrink-0 px-1 text-xs font-bold uppercase underline-offset-4 hover:underline sm:min-h-0"
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          <RielMeta resumen={resumen} cargando={cargando} />

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-7">
              <DonarForm onDonacionRegistrada={cargar} />
            </div>

            <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-5">
              <LibroCaja resumen={resumen} cargando={cargando} />

              <section className="rounded-3xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-5 sm:p-6">
                <h2 className="font-heading text-base font-bold text-foreground">
                  ¿A dónde va tu aporte?
                </h2>
                <ul className="mt-4 space-y-4">
                  {DESTINOS.map(({ icono: Icono, titulo, texto }) => (
                    <li key={titulo} className="flex gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#7957f1]/12 text-[#c4b5fd]">
                        <Icono className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{titulo}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{texto}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <TopDonantes donantes={donantes} cargando={cargando} />

          <MuroMensajes mensajes={mensajes} cargando={cargando} />
        </div>
      </div>
    </div>
  )
}
