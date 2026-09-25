// Perfil del estudiante: datos personales, avance académico y preferencias
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, KeyRound, Layers, Loader2, LogOut, ShieldCheck, X } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/components/providers/auth-context"
import { useByok } from "@/components/providers/byok-context"
import { CambiarPasswordForm } from "@/components/perfil/cambiar-password-form"
import { EstablecerPasswordForm } from "@/components/perfil/establecer-password-form"
import { PreferenciasCard } from "@/components/perfil/preferencias-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { apiService } from "@/lib/api-service"
import { aRomano } from "@/lib/ciclos"
import { calcularRacha } from "@/lib/racha"
import { validarNombre } from "@/lib/validaciones"
import type { Carrera, MallaItem } from "@/types/onboarding"

interface Perfil {
  id: string
  email?: string
  nombre_completo?: string
  codigo_estudiante?: string
  avatar_url?: string
  carrera_id?: number
  malla_id?: number
  ciclo_actual?: number
  has_password?: boolean
}

function iniciales(nombre?: string): string {
  if (!nombre) return "U"
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return "U"
  return (partes[0][0] + (partes[1]?.[0] ?? "")).toUpperCase()
}

type PestañaPerfil = "academic" | "security" | "preferences"

export default function PerfilPage() {
  const { signOut } = useAuth()
  const router = useRouter()
  // BYOK: gestión de la clave privada de IA desde la pestaña Seguridad.
  const { abrirModalByok, modoByok } = useByok()

  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carrera, setCarrera] = useState<Carrera | null>(null)
  const [avance, setAvance] = useState<any>(null)
  const [diagnostico, setDiagnostico] = useState<any>(null)
  const [racha, setRacha] = useState(0)
  const [cargando, setCargando] = useState(true)

  // Edición del nombre (RF-PRF-02)
  const [editando, setEditando] = useState(false)
  const [nombreBorrador, setNombreBorrador] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [errorNombre, setErrorNombre] = useState("")

  // Cambio de plan de estudios / malla (PATCH /usuarios/me/malla)
  const [mallasPlan, setMallasPlan] = useState<MallaItem[]>([])
  const [modalMallaAbierto, setModalMallaAbierto] = useState(false)
  const [mallaNuevaId, setMallaNuevaId] = useState<number | undefined>()
  const [cambiandoMalla, setCambiandoMalla] = useState(false)
  const [errorMalla, setErrorMalla] = useState("")

  // Pestaña activa del panel (diseño tipo segmented control).
  const [activeTab, setActiveTab] = useState<PestañaPerfil>("academic")

  useEffect(() => {
    let activo = true

    const cargar = async () => {
      // allSettled: el perfil es lo esencial; si falla el avance o la
      // actividad, la página igual muestra los datos personales.
      const [perfilRes, metaRes, avanceRes, diagRes, actividadRes] = await Promise.allSettled([
        apiService.getProfile(),
        apiService.getOnboardingData(),
        apiService.getAvanceCarrera(),
        apiService.getTestNivel(),
        apiService.getActividad("90d"),
      ])
      if (!activo) return

      const datosPerfil = perfilRes.status === "fulfilled" ? perfilRes.value : null
      setPerfil(datosPerfil)
      setNombreBorrador(datosPerfil?.nombre_completo ?? "")

      if (metaRes.status === "fulfilled" && datosPerfil?.carrera_id) {
        const encontrada = (metaRes.value?.carreras ?? []).find(
          (c: Carrera) => c.id === datosPerfil.carrera_id,
        )
        setCarrera(encontrada ?? null)
      }

      if (datosPerfil?.carrera_id) {
        apiService
          .getMallasPorCarrera(datosPerfil.carrera_id)
          .then((mallas) => {
            if (activo) setMallasPlan(Array.isArray(mallas) ? mallas : [])
          })
          .catch(() => {})
      }

      if (avanceRes.status === "fulfilled") setAvance(avanceRes.value)
      if (diagRes.status === "fulfilled") setDiagnostico(diagRes.value)
      if (actividadRes.status === "fulfilled") {
        setRacha(calcularRacha(actividadRes.value?.actividad_por_dia ?? []))
      }

      setCargando(false)
    }

    cargar()
    return () => {
      activo = false
    }
  }, [])

  const guardarNombre = async () => {
    // Se valida antes de enviar con la misma regla del backend, para no
    // gastar un viaje en algo que ya sabemos que rechazará.
    const problema = validarNombre(nombreBorrador)
    if (problema) {
      setErrorNombre(problema)
      return
    }

    setGuardando(true)
    setErrorNombre("")
    try {
      const respuesta = await apiService.actualizarPerfil(nombreBorrador)
      setPerfil((prev) => ({ ...(prev ?? {}), ...(respuesta?.usuario ?? {}) }) as Perfil)
      setEditando(false)
    } catch (err: any) {
      setErrorNombre(err.message || "No se pudieron guardar tus datos.")
    } finally {
      setGuardando(false)
    }
  }

  const mallaActualNombre = mallasPlan.find((m) => m.id === perfil?.malla_id)?.nombre

  const handleCambiarMalla = async () => {
    if (!mallaNuevaId) return
    setCambiandoMalla(true)
    setErrorMalla("")
    try {
      const respuesta = await apiService.cambiarMalla(mallaNuevaId)
      setPerfil(
        (prev) => ({ ...(prev ?? {}), ...(respuesta?.usuario ?? { malla_id: mallaNuevaId }) }) as Perfil,
      )
      setModalMallaAbierto(false)
      router.push("/onboarding")
    } catch (err: any) {
      setErrorMalla(err.message || "No se pudo cambiar tu plan de estudios.")
    } finally {
      setCambiandoMalla(false)
    }
  }

  if (cargando) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full gap-3 p-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Cargando tu perfil...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!perfil) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <p className="font-heading text-lg font-bold text-foreground">
            No pudimos cargar tu perfil
          </p>
          <p className="text-sm text-muted-foreground">Vuelve a iniciar sesión e inténtalo.</p>
        </div>
      </DashboardLayout>
    )
  }

  const nombre = perfil.nombre_completo || "Estudiante"

  // Derivados de la vista (mapeo a nuestros datos reales del backend)
  const cicloRomano = perfil.ciclo_actual ? aRomano(perfil.ciclo_actual) : null
  const creditosAprobados = avance?.creditos_aprobados ?? null
  const creditosTotales = avance?.creditos_totales ?? null
  const avancePorcentaje = Math.min(100, Math.max(0, Number(avance?.porcentaje_avance ?? 0)))
  const promedioPonderado = diagnostico?.promedio_ponderado
    ? diagnostico.promedio_ponderado.toFixed(2)
    : null
  const planEstudios = perfil.malla_id
    ? (mallaActualNombre ?? `Plan #${perfil.malla_id}`)
    : (carrera?.duracion_ciclos ? `${carrera.duracion_ciclos} ciclos` : "—")

  return (
    <DashboardLayout>
      <main className="relative min-h-screen overflow-hidden bg-[#090a12] text-white">

        {/* =========================================================
            ATMÓSFERA
        ========================================================== */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-48 top-20 h-[560px] w-[560px] rounded-full bg-fuchsia-500/[0.045] blur-[120px]" />

          <div className="absolute right-[-180px] top-[18%] h-[520px] w-[520px] rounded-full bg-violet-500/[0.045] blur-[130px]" />

          <div className="absolute bottom-[-280px] left-[35%] h-[600px] w-[600px] rounded-full bg-cyan-500/[0.025] blur-[150px]" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,#090a12_90%)]" />
        </div>


        {/* =========================================================
            PAGE
        ========================================================== */}

        <div className="relative mx-auto w-full max-w-[1450px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">

          {/* Header */}
          <header className="mb-8">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_12px_rgba(232,121,249,0.7)]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300/60">
                Cuenta
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
              Mi perfil
            </h1>

            <p className="mt-2 text-sm text-white/35">
              Administra tu información personal y académica.
            </p>
          </header>


          {/* =========================================================
              BENTO LAYOUT
          ========================================================== */}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">

            {/* =======================================================
                LEFT — IDENTITY CARD
            ======================================================== */}

            <aside className="group relative lg:col-span-4">

              {/* Card glow */}
              <div className="pointer-events-none absolute -inset-px rounded-[26px] bg-gradient-to-br from-fuchsia-500/15 via-transparent to-violet-500/10 opacity-60 blur-sm" />

              <div className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-7">

                {/* top reflection */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.16] to-transparent" />

                {/* Ambient glow */}
                <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-fuchsia-500/[0.07] blur-[70px]" />


                {/* =================================================
                    AVATAR
                ================================================== */}

                <div className="relative mb-7 flex items-center justify-between">

                  <div className="relative">

                    {/* avatar glow */}
                    <div className="absolute inset-[-8px] rounded-full bg-fuchsia-500/[0.08] blur-xl" />

                    <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/[0.12] bg-white/[0.05] shadow-[0_0_40px_rgba(168,85,247,0.08)]">
                      <Avatar className="h-full w-full rounded-full">
                        <AvatarImage src={perfil.avatar_url} alt={nombre} className="object-cover" />
                        <AvatarFallback className="gradient-brand-br font-heading text-2xl font-bold text-primary-foreground">
                          {iniciales(perfil.nombre_completo)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* online/status indicator */}
                    <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-[#0d0d17] bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]" />
                  </div>


                  {/* Edit button */}
                  {!editando && (
                    <button
                      type="button"
                      onClick={() => setEditando(true)}
                      className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-xl
                        border
                        border-white/[0.09]
                        bg-white/[0.035]
                        px-3.5
                        py-2.5
                        text-xs
                        font-medium
                        text-white/65
                        transition-all
                        duration-200
                        hover:-translate-y-0.5
                        hover:border-fuchsia-400/25
                        hover:bg-white/[0.06]
                        hover:text-white
                        hover:shadow-[0_8px_25px_rgba(168,85,247,0.12)]
                      "
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.5 3.5a2.121 2.121 0 013 3L8 18l-4 1 1-4L16.5 3.5z"
                        />
                      </svg>

                      Editar
                    </button>
                  )}
                </div>


                {/* =================================================
                    IDENTITY
                ================================================== */}

                <div className="relative">
                  {editando ? (
                    <div className="space-y-2">
                      <Input
                        value={nombreBorrador}
                        onChange={(e) => setNombreBorrador(e.target.value)}
                        autoFocus
                        aria-label="Nombres y apellidos"
                        className="h-auto rounded-xl border-white/[0.12] bg-white/[0.05] px-3 py-2 text-lg text-white"
                      />
                      {errorNombre && <p className="text-xs text-red-400">{errorNombre}</p>}
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="brand" onClick={guardarNombre} disabled={guardando}>
                          {guardando ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={guardando}
                          onClick={() => {
                            setEditando(false)
                            setErrorNombre("")
                            setNombreBorrador(perfil.nombre_completo ?? "")
                          }}
                        >
                          <X className="h-4 w-4" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <h2 className="text-xl font-semibold tracking-[-0.035em] text-white">
                      {nombre}
                    </h2>
                  )}

                  {/* El correo y el código se muestran pero no se editan: son los
                      identificadores del estudiante ante la UNI (RF-PRF-02). */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-white/30">
                      {perfil.email}
                    </span>

                    {perfil.codigo_estudiante && (
                      <>
                        <span className="text-white/10">•</span>

                        <span className="font-mono text-[11px] text-white/30">
                          {perfil.codigo_estudiante}
                        </span>
                      </>
                    )}
                  </div>
                </div>


                {/* =================================================
                    BADGES
                ================================================== */}

                <div className="mt-6 flex flex-wrap gap-2">

                  {carrera && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/15 bg-violet-400/[0.08] px-3 py-1.5 text-[10px] font-medium text-violet-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      {carrera.name}
                    </span>
                  )}

                  {cicloRomano && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/15 bg-rose-400/[0.08] px-3 py-1.5 text-[10px] font-medium text-rose-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      Ciclo {cicloRomano}
                    </span>
                  )}

                  {racha > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium text-white/50">
                      🔥 Racha {racha} {racha === 1 ? "día" : "días"}
                    </span>
                  )}

                </div>


                {/* =================================================
                    MINI PROFILE METRICS
                ================================================== */}

                <div className="mt-7 grid grid-cols-2 gap-2">

                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25">
                      Ciclo
                    </p>

                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white/90">
                      {cicloRomano ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25">
                      Créditos
                    </p>

                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white/90">
                      {creditosAprobados ?? "—"}
                    </p>
                  </div>

                </div>


                {/* bottom decoration */}
                <div className="mt-7 flex items-center gap-2 border-t border-white/[0.06] pt-5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />

                  <span className="text-[10px] text-white/30">
                    Perfil académico activo
                  </span>
                </div>

              </div>
            </aside>


            {/* =======================================================
                RIGHT — TABS + CONTENT
            ======================================================== */}

            <section className="min-w-0 lg:col-span-8">

              {/* =====================================================
                  TABS — VERCEL SEGMENTED CONTROL
              ====================================================== */}

              <div className="mb-5 inline-flex max-w-full overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.025] p-1 shadow-lg shadow-black/10 backdrop-blur-xl">

                {(
                  [
                    {
                      id: "academic",
                      label: "Información académica",
                      icon: (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                        </svg>
                      ),
                    },
                    {
                      id: "security",
                      label: "Seguridad",
                      icon: (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <rect x="4" y="10" width="16" height="11" rx="2" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 018 0v3" />
                        </svg>
                      ),
                    },
                    {
                      id: "preferences",
                      label: "Preferencias",
                      icon: (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1.04 1.56V20h-2.4v-.2a1.7 1.7 0 00-1.04-1.56 1.7 1.7 0 00-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 008.4 15a1.7 1.7 0 00-1.56-1.04H6v-2.4h.84A1.7 1.7 0 008.4 10a1.7 1.7 0 00-.34-1.88L8 8.06l1.7-1.7.06.06a1.7 1.7 0 001.88.34A1.7 1.7 0 0012.68 5.2V5h2.4v.2a1.7 1.7 0 001.04 1.56 1.7 1.7 0 001.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0019.4 10a1.7 1.7 0 001.56 1.04h.2v2.4h-.2A1.7 1.7 0 0019.4 15z" />
                        </svg>
                      ),
                    },
                  ] as { id: PestañaPerfil; label: string; icon: React.ReactNode }[]
                ).map((tab) => {
                  const isActive = activeTab === tab.id

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        relative
                        flex
                        shrink-0
                        items-center
                        gap-2
                        rounded-lg
                        px-4
                        py-2.5
                        text-xs
                        font-medium
                        transition-all
                        duration-200
                        ${
                          isActive
                            ? "bg-white/[0.09] text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
                            : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                        }
                      `}
                    >
                      {isActive && (
                        <span className="absolute inset-x-3 -bottom-[1px] h-px bg-gradient-to-r from-transparent via-fuchsia-400/70 to-transparent" />
                      )}

                      {tab.icon}

                      {tab.label}
                    </button>
                  )
                })}

              </div>


              {/* =====================================================
                  CONTENT CARD
              ====================================================== */}

              <div className="group relative">

                <div className="pointer-events-none absolute -inset-px rounded-[24px] bg-gradient-to-br from-white/[0.05] via-transparent to-fuchsia-500/[0.04] opacity-70 blur-sm" />

                <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.02] shadow-2xl shadow-black/30 backdrop-blur-2xl">

                  {/* Top reflection */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />


                  {/* =================================================
                      INFORMACIÓN ACADÉMICA
                  ================================================== */}

                  {activeTab === "academic" && (
                    <div className="p-5 sm:p-7">

                      <div className="mb-7">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-300/60">
                          Academic overview
                        </p>

                        <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                          Información académica
                        </h2>

                        <p className="mt-1.5 text-sm text-white/35">
                          Resumen de tu progreso y situación universitaria.
                        </p>
                      </div>


                      {/* =================================================
                          HERO STATS
                      ================================================== */}

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                        {/* Progress */}
                        <div className="group/stat relative overflow-hidden rounded-2xl border border-fuchsia-400/10 bg-fuchsia-400/[0.035] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-fuchsia-400/20">

                          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-fuchsia-500/[0.08] blur-2xl" />

                          <div className="relative">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                                Avance de carrera
                              </span>

                              <svg className="h-4 w-4 text-fuchsia-400/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-5 3 2 5-7" />
                              </svg>
                            </div>

                            <div className="mt-5 flex items-end gap-1">
                              <span className="text-3xl font-semibold tracking-[-0.06em] text-white">
                                {avance ? Math.round(avancePorcentaje) : "—"}
                              </span>

                              {avance && (
                                <span className="mb-1 text-sm text-fuchsia-300/60">%</span>
                              )}
                            </div>

                            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-400 transition-all duration-700"
                                style={{ width: `${avancePorcentaje}%` }}
                              />
                            </div>
                          </div>
                        </div>


                        {/* Credits */}
                        <div className="group/stat relative overflow-hidden rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/20">

                          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-500/[0.07] blur-2xl" />

                          <div className="relative">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                                Créditos aprobados
                              </span>

                              <svg className="h-4 w-4 text-cyan-400/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4-8 4-8-4 8-4z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12l8 4 8-4" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 17l8 4 8-4" />
                              </svg>
                            </div>

                            <div className="mt-5">
                              <span className="text-3xl font-semibold tracking-[-0.06em] text-white">
                                {creditosAprobados ?? "—"}
                              </span>

                              <span className="ml-1 text-sm text-white/25">
                                / {creditosTotales ?? "—"}
                              </span>
                            </div>

                            <p className="mt-2 text-[10px] text-cyan-300/45">
                              créditos completados
                            </p>
                          </div>
                        </div>


                        {/* Cycle */}
                        <div className="group/stat relative overflow-hidden rounded-2xl border border-violet-400/10 bg-violet-400/[0.025] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400/20">

                          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/[0.07] blur-2xl" />

                          <div className="relative">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                                Ciclo actual
                              </span>

                              <span className="text-xs text-violet-300/60">
                                2026
                              </span>
                            </div>

                            <div className="mt-5 text-4xl font-semibold tracking-[-0.07em] text-white">
                              {cicloRomano ?? "—"}
                            </div>

                            <p className="mt-2 text-[10px] text-violet-300/45">
                              ciclo académico
                            </p>
                          </div>
                        </div>

                      </div>


                      {/* =================================================
                          DETAILS
                      ================================================== */}

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">

                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-5">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">
                            Carrera
                          </span>

                          <p className="mt-3 text-sm font-medium text-white/80">
                            {carrera?.name ?? "No asignada"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-5">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">
                            Facultad
                          </span>

                          <p className="mt-3 text-sm font-medium text-white/80">
                            {carrera?.facultad?.nombre ?? "—"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-5">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">
                            Plan de estudios
                          </span>

                          <p className="mt-3 text-sm font-medium text-white/80">
                            {planEstudios}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-5">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">
                            Promedio ponderado
                          </span>

                          <p className="mt-3 text-sm font-medium text-white/80">
                            {promedioPonderado ?? "Sin notas registradas"}
                          </p>
                        </div>

                      </div>


                      {/* =================================================
                          ACADEMIC ACTIONS
                      ================================================== */}

                      <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.018] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">

                        <div>
                          <h3 className="text-sm font-semibold text-white/85">
                            Gestión académica
                          </h3>

                          <p className="mt-1 text-xs leading-5 text-white/30">
                            ¿Cambiaste de ciclo o aprobaste cursos nuevos?
                            Actualiza tu situación para recalcular tu malla y tu ruta.
                          </p>
                        </div>

                        <div className="mt-4 flex shrink-0 flex-wrap gap-2 sm:mt-0">

                          <button
                            type="button"
                            onClick={() => router.push("/onboarding")}
                            className="
                              inline-flex
                              items-center
                              gap-2
                              rounded-xl
                              border
                              border-fuchsia-400/20
                              bg-fuchsia-500/[0.08]
                              px-4
                              py-2.5
                              text-xs
                              font-semibold
                              text-fuchsia-200
                              transition-all
                              duration-200
                              hover:-translate-y-0.5
                              hover:border-fuchsia-400/35
                              hover:bg-fuchsia-500/[0.13]
                              hover:shadow-[0_8px_25px_rgba(217,70,239,0.12)]
                            "
                          >
                            Actualizar situación académica
                          </button>

                          <button
                            type="button"
                            disabled={!mallasPlan.length}
                            onClick={() => {
                              setMallaNuevaId(undefined)
                              setErrorMalla("")
                              setModalMallaAbierto(true)
                            }}
                            className="
                              inline-flex
                              items-center
                              gap-2
                              rounded-xl
                              border
                              border-white/[0.09]
                              bg-white/[0.03]
                              px-4
                              py-2.5
                              text-xs
                              font-medium
                              text-white/65
                              transition-all
                              duration-200
                              hover:-translate-y-0.5
                              hover:border-white/[0.15]
                              hover:bg-white/[0.06]
                              hover:text-white
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            "
                          >
                            <Layers className="h-3.5 w-3.5" />
                            Cambiar Plan de Estudios
                          </button>

                        </div>
                      </div>

                      {/* Modal de cambio de plan de estudios */}
                      <Sheet open={modalMallaAbierto} onOpenChange={setModalMallaAbierto}>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle>Cambiar Plan de Estudios</SheetTitle>
                            <SheetDescription>
                              Al cambiar de plan, tu avance y progreso de cursos se reajustará para la
                              nueva malla. Deberás volver a seleccionar los cursos que tienes aprobados.
                            </SheetDescription>
                          </SheetHeader>

                          {errorMalla && (
                            <p className="mt-2 text-xs text-destructive">{errorMalla}</p>
                          )}

                          <div className="mt-4 space-y-2">
                            {mallasPlan.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setMallaNuevaId(m.id)}
                                aria-pressed={mallaNuevaId === m.id}
                                className={`w-full rounded-xl border p-3 text-left transition-all ${
                                  mallaNuevaId === m.id
                                    ? "bg-card border-accent ring-1 ring-accent"
                                    : "bg-card/60 border-border hover:border-accent/40"
                                }`}
                              >
                                <span className="font-heading block text-sm font-bold text-foreground">
                                  {m.nombre}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {m.es_vigente ? "Vigente" : "Plan anterior"}
                                  {m.codigo_plan ? ` · ${m.codigo_plan}` : ""}
                                </span>
                              </button>
                            ))}
                          </div>

                          <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
                            <Button variant="outline" size="sm" onClick={() => setModalMallaAbierto(false)}>
                              Cancelar
                            </Button>
                            <Button
                              variant="brand"
                              size="sm"
                              disabled={!mallaNuevaId || cambiandoMalla}
                              onClick={handleCambiarMalla}
                            >
                              {cambiandoMalla && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Cambiar plan
                            </Button>
                          </div>
                        </SheetContent>
                      </Sheet>

                    </div>
                  )}


                  {/* =================================================
                      SEGURIDAD
                  ================================================== */}

                  {activeTab === "security" && (
                    <div className="p-5 sm:p-7">

                      <div className="mb-7">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/60">
                          Account security
                        </p>

                        <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                          Seguridad
                        </h2>

                        <p className="mt-1.5 text-sm text-white/35">
                          Gestiona las opciones de seguridad de tu cuenta.
                        </p>
                      </div>

                      {/* Controles actuales de seguridad */}
                      <div className="space-y-3">

                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-5">
                          {perfil?.has_password === true ? (
                            <CambiarPasswordForm />
                          ) : (
                            <EstablecerPasswordForm
                              onPasswordSet={() => {
                                setPerfil((prev) => ({ ...(prev ?? {}), has_password: true }) as Perfil)
                              }}
                            />
                          )}
                        </div>

                        {/* BYOK: la clave de IA del estudiante vive solo en su navegador;
                            aquí solo se abre el modal global de gestión. */}
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15">
                              <KeyRound className="h-4 w-4 text-accent" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-heading text-sm font-bold text-foreground">
                                Tu clave de IA privada (BYOK)
                              </h3>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                Usa tu propia clave gratuita de Google AI Studio para que el asistente
                                responda sin esperar la cuota compartida. Se guarda{" "}
                                <b>solo en tu navegador</b>: nunca toca nuestra base de datos, viaja
                                encriptada y el servidor la descarta al instante.
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-3">
                                <Button variant="brand" size="sm" onClick={abrirModalByok}>
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Gestionar mi clave de IA privada
                                </Button>
                                {modoByok && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                                    Clave personal activa
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}


                  {/* =================================================
                      PREFERENCIAS
                  ================================================== */}

                  {activeTab === "preferences" && (
                    <div className="p-5 sm:p-7">

                      <div className="mb-7">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/60">
                          Experience
                        </p>

                        <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white">
                          Preferencias
                        </h2>

                        <p className="mt-1.5 text-sm text-white/35">
                          Personaliza cómo utilizas UniVia.
                        </p>
                      </div>

                      {/* Controles actuales de preferencias */}
                      <div className="space-y-3">

                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-5">
                          <PreferenciasCard />
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              </div>

            </section>
          </div>

          {/* Cerrar sesión */}
          <div className="mt-8">
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
