"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FacultyStep } from "./onboarding/faculty-step"
import { CareerStep } from "./onboarding/career-step"
import { MallaStep } from "./onboarding/malla-step"
import { SemesterStep } from "./onboarding/semester-step"
import { CurrentEnrollmentStep } from "./onboarding/current-enrollment-step"
import { CompletionStep } from "./onboarding/completion-step"
import type { Carrera, Facultad, OnboardingData, OnboardingDataResponse } from "@/types/onboarding"
import { useAuth } from "./providers/auth-context"
import { apiService } from "@/lib/api-service"
import { Loader2 } from "lucide-react"
import { BrandLogo } from "@/app/auth/brand-logo"
import { OnboardingProgress } from "./onboarding/onboarding-progress"

const STEPS = ["Facultad", "Carrera", "Plan", "Ciclo", "Cursos", "Confirmación"]

/** Usado solo si el backend no informa la duración del plan. */
const CICLOS_POR_DEFECTO = 10

export function OnboardingWizard() {
  const router = useRouter()
  const { refreshProfile, signOut, user } = useAuth()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  /** El estudiante ya tiene perfil académico: viene a actualizarlo, no a crearlo. */
  const [modoActualizacion, setModoActualizacion] = useState(false)
  /** Ciclo que consta hoy en su perfil, para avisar si elige uno anterior. */
  const [cicloRegistrado, setCicloRegistrado] = useState<number | undefined>()
  const [onboardingMeta, setOnboardingMeta] = useState<{
    careers: Carrera[]
    facultades: Facultad[]
  }>({ careers: [], facultades: [] })

  // `cursosAprobados` arranca sin definir a propósito: el paso de cursos usa
  // "no declarado aún" para pre-marcar los ciclos previos. Un [] inicial se lee
  // como "el estudiante no aprobó nada" y deja el historial en blanco.
  const [data, setData] = useState<OnboardingData>({
    career: 0,
    semester: 1,
    // Los usuarios de Google SSO no traen código; si el registro manual ya lo
    // dejó, se pre-rellena aquí para no pedirlo de nuevo en el Paso 1.
    codigo_estudiante: user?.codigo_estudiante ?? "",
    cursosInscritos: [],
  })

  const selectedCareer = onboardingMeta.careers.find((c) => c.id === data.career)
  const selectedCareerName = selectedCareer?.name || "Tu carrera"

  // El paso de carrera solo ofrece las de la facultad elegida. Sin facultad
  // todavía (primera carga) la lista queda vacía, que es lo correcto: no se
  // llega a ese paso sin haber pasado por el anterior.
  const careersDeFacultad = data.facultad
    ? onboardingMeta.careers.filter((c) => c.facultad?.id === data.facultad)
    : []

  // El tope de ciclos es el del plan de la carrera elegida. Antes la grilla
  // estaba fija en 8, así que quien iba en 9no o 10mo no podía declararlo.
  const maxCiclos = selectedCareer?.duracion_ciclos || CICLOS_POR_DEFECTO

  useEffect(() => {
    const fetchOnboardingMeta = async () => {
      try {
        setLoading(true)
        // El perfil se pide junto al catálogo porque este mismo wizard sirve
        // para "Actualizar situación académica" desde /perfil. Sin él, la
        // pantalla arrancaba siempre en Ciclo I con la carrera sin elegir: el
        // estudiante de ciclo VI veía Ciclo I premarcado, daba Continuar
        // creyendo que reflejaba su situación, y el guardado le devolvía el
        // ciclo a I. Desde su lado "no se actualiza nada".
        const [metaRes, perfilRes] = await Promise.allSettled([
          apiService.getOnboardingData(),
          apiService.getProfile(),
        ])

        const result: OnboardingDataResponse | null =
          metaRes.status === "fulfilled" ? metaRes.value : null
        const carreras = result?.carreras ?? []
        setOnboardingMeta({
          careers: carreras,
          facultades: result?.facultades ?? [],
        })

        const perfil = perfilRes.status === "fulfilled" ? perfilRes.value : null
        // Solo se precarga a quien ya tiene un perfil académico que actualizar.
        // Para el registro inicial el wizard sigue empezando en blanco.
        if (perfil?.carrera_id) {
          const carrera = carreras.find((c: Carrera) => c.id === perfil.carrera_id)
          setModoActualizacion(true)
          setCicloRegistrado(perfil.ciclo_actual ?? undefined)
          setData((prev) => ({
            ...prev,
            facultad: carrera?.facultad?.id ?? prev.facultad,
            career: perfil.carrera_id,
            malla_id: perfil.malla_id ?? prev.malla_id,
            semester: perfil.ciclo_actual ?? prev.semester,
            codigo_estudiante: perfil.codigo_estudiante ?? prev.codigo_estudiante,
          }))
        }
      } catch (error) {
        console.error("Error fetching onboarding meta:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchOnboardingMeta()
  }, [])

  const handleNext = (stepData: Partial<OnboardingData>) => {
    // El error del intento anterior describe datos que el estudiante acaba de
    // cambiar. Dejarlo en pantalla lo hace contradecir al resumen que tiene al
    // lado (p. ej. "6 cursos solapados" junto a una tarjeta que dice 1).
    setSubmitError(null)
    setData((prev) => {
      const siguiente = { ...prev, ...stepData }
      // Cambiar de facultad invalida la carrera elegida (ya no pertenece a la
      // nueva) y, con ella, todo lo que cuelga de la carrera.
      if (stepData.facultad !== undefined && stepData.facultad !== prev.facultad) {
        siguiente.career = 0
        siguiente.malla_id = undefined
      }

      // Cambiar de carrera, plan o ciclo redefine qué cursos existen y cuáles
      // se dan por aprobados: conservar la declaración anterior dejaría marcado
      // historial de otra malla o de un ciclo que ya no aplica.
      const baseCambio =
        (stepData.facultad !== undefined && stepData.facultad !== prev.facultad) ||
        (stepData.career !== undefined && stepData.career !== prev.career) ||
        (stepData.malla_id !== undefined && stepData.malla_id !== prev.malla_id) ||
        (stepData.semester !== undefined && stepData.semester !== prev.semester)
      if (baseCambio) {
        siguiente.cursosAprobados = undefined
        siguiente.cursosInscritos = []
      }
      return siguiente
    })
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  const handleBack = () => {
    setSubmitError(null)
    setStep((prev) => Math.max(prev - 1, 0))
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const payload = {
        carrera_id: data.career,
        malla_id: data.malla_id,
        ciclo_actual: data.semester,
        codigo_estudiante: data.codigo_estudiante || undefined,
        cursos_inscritos: data.cursosInscritos,
        // Se envía tal cual, sin convertir undefined en []: el backend
        // distingue "no declaro historial" (undefined → no toca lo aprobado) de
        // "no aprobé nada" ([] → lo desaprueba). Aplanarlo a [] aquí borraría
        // el avance de quien nunca llegó a ver el paso de historial.
        cursos_aprobados: data.cursosAprobados,
      }
      await apiService.completeOnboarding(payload)
      await refreshProfile()
      // Quien vino a actualizar su situación vuelve a donde la ve reflejada;
      // mandarlo al dashboard lo deja sin confirmación de que algo cambió.
      router.push(modoActualizacion ? "/perfil" : "/dashboard")
    } catch (error: any) {
      console.error("Error completing onboarding:", error)
      // Se muestra dentro del paso final: un alert() del navegador tapa la
      // pantalla y no deja leer qué dato hay que corregir.
      setSubmitError(
        error.message || "No pudimos guardar tu perfil. Inténtalo de nuevo en un momento."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * El dashboard rebota a quien no terminó el onboarding (ver
   * `dashboard-layout`), así que "omitir" no puede llevar a la app: sería un
   * ida y vuelta infinito. Lo único honesto es cerrar la sesión y dejar el
   * onboarding para el próximo ingreso.
   */
  const handleOmitir = async () => {
    // Quien viene de "Actualizar situación académica" ya tiene un perfil válido:
    // solo está cancelando la edición. Cerrarle la sesión por arrepentirse sería
    // desproporcionado; vuelve a su perfil y no se toca nada.
    if (modoActualizacion) {
      router.push("/perfil")
      return
    }
    // El dashboard rebota a quien no terminó el onboarding (ver `dashboard-layout`),
    // así que "omitir" no puede llevar a la app. Se cierra la sesión (signOut ya
    // reenvía a la portada pública /) y el onboarding queda para el próximo ingreso.
    await signOut()
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Halos de marca, muy tenues, para que el fondo no quede plano */}
      <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera + avance */}
      <div className="relative z-10 max-w-4xl mx-auto w-full pt-8 pb-6 px-4">
        <div className="flex items-center justify-between gap-4 mb-8">
          <BrandLogo className="py-0" />
          <button
            type="button"
            onClick={handleOmitir}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {modoActualizacion ? "Cancelar" : "Omitir por ahora"}
          </button>
        </div>

        <OnboardingProgress currentStep={step} steps={STEPS} />
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-4xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-5 py-16">
              <Loader2 className="w-10 h-10 animate-spin text-accent" />
              <div className="text-center space-y-1">
                <p className="font-heading text-lg font-bold text-foreground">
                  Cargando tu malla académica...
                </p>
                <p className="text-sm text-muted-foreground">Esto solo toma unos segundos</p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              {step === 0 && (
                <FacultyStep
                  data={data}
                  onNext={handleNext}
                  facultades={onboardingMeta.facultades}
                  careers={onboardingMeta.careers}
                />
              )}
              {step === 1 && (
                <CareerStep data={data} onNext={handleNext} onBack={handleBack} careers={careersDeFacultad} />
              )}
              {step === 2 && (
                <MallaStep
                  data={data}
                  onNext={handleNext}
                  onBack={handleBack}
                  carrera_id={data.career}
                  careerName={selectedCareerName}
                />
              )}
              {step === 3 && (
                <SemesterStep
                  data={data}
                  onNext={handleNext}
                  onBack={handleBack}
                  maxCiclos={maxCiclos}
                  cicloRegistrado={cicloRegistrado}
                />
              )}
              {step === 4 && (
                <CurrentEnrollmentStep
                  data={data}
                  onNext={handleNext}
                  onBack={handleBack}
                  carrera_id={data.career}
                  malla_id={data.malla_id}
                />
              )}
              {step === 5 && (
                <CompletionStep
                  data={data}
                  onBack={handleBack}
                  onComplete={handleComplete}
                  isSubmitting={isSubmitting}
                  careerName={selectedCareerName}
                  facultadName={selectedCareer?.facultad?.nombre}
                  maxCiclos={maxCiclos}
                  submitError={submitError}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pie discreto. Antes había tres tarjetas glassmorphism con promesas de
          producto ("Experiencia Premium") que competían con los botones del
          paso: en el onboarding lo único que importa es avanzar. */}
      <div className="relative z-10 border-t border-border mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
          <p className="text-xs text-muted-foreground">
            Puedes cambiar estos datos después desde tu perfil.
          </p>
          <span className="text-xs text-muted-foreground/50" aria-hidden="true">·</span>
          <p className="text-xs text-muted-foreground/70">
            Un proyecto de ayuda social de LEAD UNI.
          </p>
        </div>
      </div>
    </div>
  )
}