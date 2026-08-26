// Perfil del estudiante: datos personales, avance académico y preferencias
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Layers, Loader2, LogOut, Pencil, X } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/components/providers/auth-context"
import { CambiarPasswordForm } from "@/components/perfil/cambiar-password-form"
import { PreferenciasCard } from "@/components/perfil/preferencias-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  // Cambio de plan de estudios / malla (PATCH /usuarios/me/malla)
  const [mallasPlan, setMallasPlan] = useState<MallaItem[]>([])
  const [modalMallaAbierto, setModalMallaAbierto] = useState(false)
  const [mallaNuevaId, setMallaNuevaId] = useState<number | undefined>()
  const [cambiandoMalla, setCambiandoMalla] = useState(false)
  const [errorMalla, setErrorMalla] = useState("")

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

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
        {/* Cabecera */}
        <div className="bg-card border border-border p-6 lg:p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-20 h-20 shrink-0">
              <Avatar className="w-20 h-20 rounded-full">
                <AvatarImage src={perfil.avatar_url} alt={perfil.nombre_completo} />
                <AvatarFallback className="gradient-brand-br text-primary-foreground font-heading text-2xl font-bold">
                  {iniciales(perfil.nombre_completo)}
                </AvatarFallback>
              </Avatar>
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

        {/* Patrón Tabs + Card documentado en
            documentacion/frontend/patrones-compartidos.md */}
        <Tabs defaultValue="academico" className="gap-4">
          <TabsList className="h-auto p-1">
            <TabsTrigger value="academico" className="px-4 py-2">
              Información académica
            </TabsTrigger>
            <TabsTrigger value="seguridad" className="px-4 py-2">
              Seguridad
            </TabsTrigger>
            <TabsTrigger value="preferencias" className="px-4 py-2">
              Preferencias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="academico">
            <div className="bg-card border border-border p-6 rounded-2xl">
              <div className="text-sm">
              <Dato etiqueta="Carrera" valor={carrera?.name ?? "No asignada"} />
              <Dato etiqueta="Facultad" valor={carrera?.facultad?.nombre ?? "—"} />
              <Dato
                etiqueta="Ciclo actual"
                valor={perfil.ciclo_actual ? aRomano(perfil.ciclo_actual) : "—"}
              />
              <Dato
                etiqueta="Plan de estudios"
                valor={
                  perfil.malla_id
                    ? (mallaActualNombre ?? `Plan #${perfil.malla_id}`)
                    : (carrera?.duracion_ciclos ? `${carrera.duracion_ciclos} ciclos` : "—")
                }
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

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-heading text-sm font-bold text-foreground mb-2">
                  Gestión académica
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  ¿Cambiaste de ciclo o aprobaste cursos nuevos? Actualiza tu situación para
                  recalcular tu malla y tu ruta.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="brand" size="sm" onClick={() => router.push("/onboarding")}>
                    Actualizar situación académica
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!mallasPlan.length}
                    onClick={() => {
                      setMallaNuevaId(undefined)
                      setErrorMalla("")
                      setModalMallaAbierto(true)
                    }}
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Cambiar Plan de Estudios
                  </Button>
                </div>
              </div>
            </div>

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
                  <p className="text-xs text-destructive mt-2">{errorMalla}</p>
                )}

                <div className="space-y-2 mt-4">
                  {mallasPlan.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMallaNuevaId(m.id)}
                      aria-pressed={mallaNuevaId === m.id}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        mallaNuevaId === m.id
                          ? "bg-card border-accent ring-1 ring-accent"
                          : "bg-card/60 border-border hover:border-accent/40"
                      }`}
                    >
                      <span className="font-heading text-sm font-bold text-foreground block">
                        {m.nombre}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {m.es_vigente ? "Vigente" : "Plan anterior"}
                        {m.codigo_plan ? ` · ${m.codigo_plan}` : ""}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
                  <Button variant="outline" size="sm" onClick={() => setModalMallaAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="brand"
                    size="sm"
                    disabled={!mallaNuevaId || cambiandoMalla}
                    onClick={handleCambiarMalla}
                  >
                    {cambiandoMalla && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Cambiar plan
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </TabsContent>

          <TabsContent value="seguridad">
            <div className="bg-card border border-border p-6 rounded-2xl">
              <CambiarPasswordForm />
            </div>
          </TabsContent>

          <TabsContent value="preferencias">
            <div className="bg-card border border-border p-6 rounded-2xl">
              <PreferenciasCard />
            </div>
          </TabsContent>
        </Tabs>

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
