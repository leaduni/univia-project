// Paso 1 del flujo de donación: elegir monto e identidad pública.
"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/components/providers/auth-context"
import { crearIntencion, reportarEnvio, type IntencionDonacion } from "@/lib/donaciones-service"
import { FACULTADES, MONTO_MAXIMO, MONTO_MINIMO, PRESETS, RANGO_TEXTO, formatearSoles, type TipoDonante } from "./constantes"
import { YapeModal } from "./yape-modal"

interface DonarFormProps {
  onDonacionRegistrada: () => void
}

const REGEX_MONTO = /^\d{1,4}([.,]\d{1,2})?$/

const CLASE_CAMPO =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-[#7957f1]/60 focus:outline-none"

export function DonarForm({ onDonacionRegistrada }: DonarFormProps) {
  const { user } = useAuth()

  const [tipo, setTipo] = useState<TipoDonante>("estudiante")
  const [preset, setPreset] = useState<number | null>(null)
  const [otroMonto, setOtroMonto] = useState("")
  const [facultad, setFacultad] = useState("")
  const [nombre, setNombre] = useState("")
  const [esAnonimo, setEsAnonimo] = useState(false)
  const [mensaje, setMensaje] = useState("")

  const [intencion, setIntencion] = useState<IntencionDonacion | null>(null)
  const [generando, setGenerando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  // El nombre del perfil es solo el valor inicial: el estudiante decide con qué
  // nombre aparecer públicamente, y puede cambiarlo o quedar anónimo.
  useEffect(() => {
    if (user?.nombre_completo && !nombre) setNombre(user.nombre_completo)
  }, [user?.nombre_completo])

  // Solo dígitos con hasta 2 decimales: rechaza "e", "-", "+", "20abc", "5.5.5"
  // que parseFloat toleraría silenciosamente y desincronizaría lo que el usuario
  // ve de lo que se envía al backend.

  const monto = useMemo(() => {
    const texto = otroMonto.trim()
    if (texto) {
      if (!REGEX_MONTO.test(texto)) return null
      const valor = Number(texto.replace(",", "."))
      return Number.isFinite(valor) ? valor : null
    }
    return preset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otroMonto, preset])

  const montoValido = monto !== null && monto >= MONTO_MINIMO && monto <= MONTO_MAXIMO

  /** Rechaza de raíz los caracteres aceptaría un <input type="number">: e, E, +, -. */
  const bloquearTeclaInvalida = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault()
  }

  const continuar = async () => {
    if (!montoValido || monto === null) return
    setGenerando(true)
    setError(null)
    setExito(null)
    try {
      const creada = await crearIntencion({
        monto,
        tipo_donante: tipo,
        facultad: facultad || null,
        nombre_mostrar: esAnonimo ? null : nombre.trim() || null,
        es_anonimo: esAnonimo,
        mensaje_muro: mensaje.trim() || null,
      })
      setIntencion(creada)
    } catch (e: any) {
      setError(e?.message || "No se pudo iniciar tu donación.")
    } finally {
      setGenerando(false)
    }
  }

  const confirmarEnvio = async () => {
    if (!intencion) return
    setEnviando(true)
    setError(null)
    try {
      await reportarEnvio(intencion.id)
      setExito("Aporte registrado. Ya aparece en el cuadro de honor.")
      setIntencion(null)
      setMensaje("")
      setPreset(null)
      setOtroMonto("")
      onDonacionRegistrada()
    } catch (e: any) {
      setError(e?.message || "No se pudo registrar tu aporte.")
      setIntencion(null)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-card/60 backdrop-blur-md p-6 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Aportar</h2>
          <p className="text-xs text-muted-foreground">
            Por Yape, sin comisiones · El monto lo eliges tú
          </p>
        </div>

        {/* Segmentado: define el tramo de montos sugeridos. */}
        <div
          role="radiogroup"
          aria-label="Tipo de donante"
          className="flex rounded-full border border-white/[0.08] bg-white/[0.02] p-1"
        >
          {(["estudiante", "egresado"] as TipoDonante[]).map((valor) => {
            const activo = tipo === valor
            return (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => {
                  setTipo(valor)
                  setPreset(null)
                }}
                title={RANGO_TEXTO[valor]}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-bold transition-all",
                  activo
                    ? "gradient-brand text-white shadow-[0_2px_12px_rgba(121,87,241,0.35)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {valor === "estudiante" ? "Estudiante" : "Egresado"}
              </button>
            )
          })}
        </div>
      </header>

      {/* Montos sugeridos: fichas, sin etiquetas. */}
      <div className="mt-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Monto · {RANGO_TEXTO[tipo]}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {PRESETS[tipo].map((valor) => {
            const activo = preset === valor && !otroMonto.trim()
            return (
              <button
                key={valor}
                type="button"
                onClick={() => {
                  setPreset(valor)
                  setOtroMonto("")
                }}
                aria-pressed={activo}
                className={cn(
                  "min-w-[5rem] rounded-2xl border px-5 py-3 font-heading text-lg font-bold tabular-nums transition-all",
                  activo
                    ? "border-transparent gradient-brand text-white shadow-[0_4px_18px_rgba(121,87,241,0.4)]"
                    : "border-white/[0.08] bg-white/[0.02] text-foreground hover:border-white/20 hover:bg-white/[0.05]",
                )}
              >
                S/{valor}
              </button>
            )
          })}
          <input
            type="number"
            inputMode="decimal"
            min={MONTO_MINIMO}
            max={MONTO_MAXIMO}
            step="0.10"
            value={otroMonto}
            onKeyDown={bloquearTeclaInvalida}
            onChange={(e) => {
              const texto = e.target.value
              // Ignora entrada con más de 2 decimales o números absurdamente largos.
              if (texto === "" || /^\d{0,4}([.,]\d{0,2})?$/.test(texto)) setOtroMonto(texto)
            }}
            aria-invalid={!!otroMonto.trim() && monto === null}
            placeholder="Otro"
            aria-label="Otro monto"
            className="w-24 rounded-2xl border border-dashed border-white/20 bg-transparent px-4 py-3 text-center font-heading text-lg font-bold tabular-nums text-foreground placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-[#7957f1]/60 focus:outline-none"
          />
        </div>
      </div>

      {/* Identidad pública */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre en el ranking">
          <input
            type="text"
            value={esAnonimo ? "" : nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={esAnonimo}
            maxLength={60}
            placeholder={esAnonimo ? "Anónimo" : "Cómo quieres aparecer"}
            className={cn(CLASE_CAMPO, "disabled:opacity-50")}
          />
        </Campo>

        <Campo etiqueta="Facultad">
          <Select
            value={facultad || "ninguna"}
            onValueChange={(valor) => setFacultad(valor === "ninguna" ? "" : valor)}
          >
            <SelectTrigger className="w-full rounded-xl border-white/[0.08] bg-white/[0.02] text-sm focus:border-[#7957f1]/60">
              <SelectValue placeholder="Sin facultad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguna">Sin facultad</SelectItem>
              {FACULTADES.map((f) => (
                <SelectItem key={f.sigla} value={f.sigla}>
                  {f.sigla} · {f.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <div className="sm:col-span-2">
          <Campo etiqueta="Mensaje para el muro (opcional)">
            <input
              type="text"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              maxLength={180}
              placeholder="Déjale algo a la comunidad"
              className={CLASE_CAMPO}
            />
          </Campo>
        </div>
      </div>

      <label className="mt-4 flex w-fit cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={esAnonimo}
          onChange={(e) => setEsAnonimo(e.target.checked)}
          className="h-4 w-4 accent-[#7957f1]"
        />
        Aparecer como Anónimo
      </label>

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 text-xs text-rose-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {exito && (
        <p role="status" className="mt-4 text-xs font-medium text-emerald-400">
          {exito}
        </p>
      )}

      <button
        type="button"
        onClick={continuar}
        disabled={!montoValido || generando}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand px-5 py-4 font-heading text-base font-bold text-white shadow-[0_6px_24px_rgba(121,87,241,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(121,87,241,0.45)] disabled:translate-y-0 disabled:opacity-35 disabled:shadow-none"
      >
        {generando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
        {montoValido && monto !== null
          ? `Continuar · ${formatearSoles(monto)}`
          : "Elige un monto"}
      </button>

      {intencion && (
        <YapeModal
          intencion={intencion}
          enviando={enviando}
          onConfirmar={confirmarEnvio}
          onCerrar={() => !enviando && setIntencion(null)}
        />
      )}
    </section>
  )
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {etiqueta}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
