// Perfil del estudiante: datos personales, avance académico y preferencias
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, LogOut, Pencil, X } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/components/providers/auth-context"
import { CambiarPasswordForm } from "@/components/perfil/cambiar-password-form"
import { PreferenciasCard } from "@/components/perfil/preferencias-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiService } from "@/lib/api-service"
import { aRomano } from "@/lib/ciclos"
import { calcularRacha } from "@/lib/racha"
import { validarNombre } from "@/lib/validaciones"
import type { Carrera } from "@/types/onboarding"

interface Perfil {
  id: string
  email?: string
  nombre_completo?: string
  codigo_estudiante?: string
  carrera_id?: number
  ciclo_actual?: number
}

function iniciales(nombre?: string): string {
  if (!nombre) return "U"
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return "U"
  return (partes[0][0] + (partes[1]?.[0] ?? "")).toUpperCase()
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4 py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground shrink-0">{etiqueta}</span>
      <span className="font-medium text-foreground text-right">{valor}</span>
    </div>
  )
}

export default function PerfilPage() {
  const { signOut } = useAuth()
  const router = useRouter()

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

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
        {/* Cabecera */}
        <div className="bg-card border border-border p-6 lg:p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-20 h-20 rounded-full gradient-brand-br p-0.5 shrink-0">
              <div className="w-full h-full bg-card rounded-full flex items-center justify-center font-heading text-2xl font-bold text-foreground">
                {iniciales(perfil.nombre_completo)}
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              {editando ? (
                <div className="space-y-2">
                  <Input
                    value={nombreBorrador}
                    onChange={(e) => setNombreBorrador(e.target.value)}
                    autoFocus
                    aria-label="Nombres y apellidos"
                    className="px-3 py-2 bg-input border border-border rounded-xl text-lg text-foreground h-auto"
                  />
                  {errorNombre && <p className="text-xs text-destructive">{errorNombre}</p>}
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="brand" onClick={guardarNombre} disabled={guardando}>
                      {guardando ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
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
                      <X className="w-4 h-4" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight truncate">
                  {nombre}
                </h1>
              )}

              {/* El correo y el código se muestran pero no se editan: son los
                  identificadores del estudiante ante la UNI (RF-PRF-02). */}
              <p className="text-xs text-muted-foreground font-mono truncate">
                {perfil.email}
                {perfil.codigo_estudiante ? ` · ${perfil.codigo_estudiante}` : ""}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {carrera && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/30">
                    {carrera.name}
                  </span>
                )}
                {perfil.ciclo_actual && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                    Ciclo {aRomano(perfil.ciclo_actual)}
                  </span>
                )}
                {racha > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                    🔥 Racha {racha} {racha === 1 ? "día" : "días"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!editando && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditando(true)}
              className="shrink-0"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar nombre
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Información académica */}
          <div className="bg-card border border-border p-6 rounded-3xl">
            <h2 className="font-heading text-lg font-bold text-foreground mb-4">
              Información académica
            </h2>
            <div className="text-sm">
              <Dato etiqueta="Carrera" valor={carrera?.name ?? "No asignada"} />
              <Dato etiqueta="Facultad" valor={carrera?.facultad?.nombre ?? "—"} />
              <Dato
                etiqueta="Ciclo actual"
                valor={perfil.ciclo_actual ? aRomano(perfil.ciclo_actual) : "—"}
              />
              <Dato
                etiqueta="Plan de estudios"
                valor={carrera?.duracion_ciclos ? `${carrera.duracion_ciclos} ciclos` : "—"}
              />
              <Dato
                etiqueta="Créditos aprobados"
                valor={
                  avance
                    ? `${avance.creditos_aprobados} de ${avance.creditos_totales}`
                    : "—"
                }
              />
              <Dato
                etiqueta="Avance de carrera"
                valor={avance ? `${avance.porcentaje_avance}%` : "—"}
              />
              <Dato
                etiqueta="Promedio ponderado"
                valor={
                  diagnostico?.promedio_ponderado
                    ? diagnostico.promedio_ponderado.toFixed(2)
                    : "Sin notas registradas"
                }
              />
            </div>
          </div>

          {/* Gestión, seguridad y preferencias */}
          <div className="bg-card border border-border p-6 rounded-3xl space-y-6">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground mb-2">
                Gestión académica
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                ¿Cambiaste de ciclo o aprobaste cursos nuevos? Actualiza tu situación para
                recalcular tu malla y tu ruta.
              </p>
              <Button
                variant="brand"
                onClick={() => router.push("/onboarding")}
                className="w-full"
              >
                Actualizar situación académica
              </Button>
            </div>

            <CambiarPasswordForm />
            <PreferenciasCard />
          </div>
        </div>

        <div>
          <Button
            variant="outline"
            onClick={() => signOut()}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
