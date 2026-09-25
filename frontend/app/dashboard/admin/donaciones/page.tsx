// Panel de verificación de donaciones: cruza lo autodeclarado contra el Yape.
"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react"
import { useAuth } from "@/components/providers/auth-context"
import {
  confirmarDonacion,
  getDonacionesPendientes,
  rechazarDonacion,
  type DonacionPendiente,
} from "@/lib/donaciones-service"
import { formatearSoles } from "@/components/donaciones/constantes"

const TIPOS_DONANTE_TEXTO: Record<string, string> = {
  estudiante: "Estudiante",
  egresado: "Egresado",
}

export default function AdminDonacionesPage() {
  const router = useRouter()
  const { isLoading } = useAuth()

  const [pendientes, setPendientes] = useState<DonacionPendiente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolviendo, setResolviendo] = useState<number | null>(null)

  const cargar = useCallback(async () => {
    setError(null)
    try {
      setPendientes(await getDonacionesPendientes())
    } catch (e: any) {
      // Guardia de ruta: sin privilegios de admin el servidor devuelve 403 y
      // el usuario vuelve al dashboard. El servidor sigue siendo la barrera
      // real; este redirect es solo UX.
      if (e?.message === "403") {
        router.replace("/dashboard")
        return
      }
      setError(e?.message || "No se pudo cargar la bandeja.")
    } finally {
      setCargando(false)
    }
  }, [router])

  useEffect(() => {
    // Espera a que la sesión se restaure antes de llamar a la API: un 403 con
    // token aún no renovado mandaría al dashboard a un admin legítimo.
    if (!isLoading) cargar()
  }, [isLoading, cargar])

  const resolver = async (id: number, aprobar: boolean) => {
    setResolviendo(id)
    setError(null)
    try {
      if (aprobar) await confirmarDonacion(id)
      else await rechazarDonacion(id)
      // Sale de la bandeja al instante; la recarga la hace el botón refresh.
      setPendientes((prev) => prev.filter((d) => d.id !== id))
    } catch (e: any) {
      setError(e?.message || "No se pudo resolver la donación.")
      await cargar()
    } finally {
      setResolviendo(null)
    }
  }

  if (isLoading || cargando) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Verificando acceso…</span>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#c4b5fd]">
            <ShieldCheck className="h-3.5 w-3.5" /> Solo administradores
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-foreground sm:text-3xl">
            Verificación de donaciones
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Compara cada monto exacto (con su céntimo identificador) contra el historial
            de Yape. Solo lo confirmado suma al total público.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-white/[0.06]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </header>

      {error && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {pendientes.length === 0 ? (
        <section className="rounded-3xl border border-white/[0.08] bg-card/60 p-8 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-400" />
          Bandeja limpia: no hay aportes pendientes de verificación.
        </section>
      ) : (
        <ul className="space-y-3">
          {pendientes.map((d) => {
            const ocupado = resolviendo === d.id
            return (
              <li
                key={d.id}
                className="rounded-3xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-2">
                      <span className="font-heading text-xl font-bold tabular-nums text-foreground">
                        {formatearSoles(d.monto_exacto)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        base {formatearSoles(d.monto_base)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {d.nombre}
                      {/* En el Yape el abono llega con el nombre real de la cuenta,
                          que el panel sí puede mostrar (nunca sale en rutas públicas). */}
                      {d.nombre_real && d.nombre !== d.nombre_real && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (declaró: {d.nombre_real})
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {TIPOS_DONANTE_TEXTO[d.tipo_donante] || d.tipo_donante}
                      {d.facultad ? ` · ${d.facultad}` : ""}
                      {" · reportado "}
                      {new Date(d.reportado_en).toLocaleString("es-PE", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    {d.mensaje_muro && (
                      <p className="mt-2 border-l-2 border-[#7957f1]/40 pl-3 text-xs italic text-muted-foreground">
                        “{d.mensaje_muro}”
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => resolver(d.id, true)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Aprobar
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => resolver(d.id, false)}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-500/15 border border-rose-400/30 px-3.5 py-2 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/25 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rechazar
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
