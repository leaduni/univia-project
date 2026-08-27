// Signup page with dark theme, unified hero layout
"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, ArrowRight, ChevronRight, Eye, EyeOff, Loader2, Info } from "lucide-react"
import { toast } from "sonner"
import { AuthErrorBanner } from "@/app/auth/auth-error-banner"
import { BrandLogo } from "@/app/auth/brand-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiService } from "@/lib/api-service"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import {
  CODIGO_PATTERN,
  EMAIL_PATTERN,
  MSG_CODIGO_INVALIDO,
  MSG_EMAIL_INVALIDO,
  MSG_PASSWORD_CORTA,
  MSG_PASSWORD_LARGA,
  MSG_PASSWORD_SIN_LETRA,
  MSG_PASSWORD_SIN_NUMERO,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  tieneLetra,
  tieneNumero,
} from "@/lib/validaciones"

// Las reglas espejan las del backend (lib/validaciones.ts) para que el error
// aparezca mientras el estudiante escribe y no recién al enviar el formulario.
const signupSchema = z.object({
  fullName: z.string().min(5, "El nombre debe tener al menos 5 caracteres"),
  studentCode: z.string().regex(CODIGO_PATTERN, MSG_CODIGO_INVALIDO),
  email: z.string().regex(EMAIL_PATTERN, MSG_EMAIL_INVALIDO),
  password: z.string()
    .min(PASSWORD_MIN_LENGTH, MSG_PASSWORD_CORTA)
    .max(PASSWORD_MAX_LENGTH, MSG_PASSWORD_LARGA)
    .refine(tieneLetra, MSG_PASSWORD_SIN_LETRA)
    .refine(tieneNumero, MSG_PASSWORD_SIN_NUMERO),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, "Debes aceptar los términos y condiciones"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type SignupFormValues = z.infer<typeof signupSchema>

const invitadoSchema = z.object({
  motivoSolicitud: z.string().min(10, "Cuéntanos brevemente el motivo de tu solicitud (mínimo 10 caracteres)."),
})

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [enviandoInvitado, setEnviandoInvitado] = useState(false)
  const [invitado, setInvitado] = useState({
    nombreCompleto: "",
    emailContacto: "",
    universidadEmpresa: "",
    motivoSolicitud: "",
  })

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      studentCode: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  })

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true)
    setError("")
    try {
      await apiService.signup({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        codigoUni: data.studentCode,
      })
      setSuccess(true)
      setTimeout(() => {
        router.push("/auth/login?registered=true")
      }, 2500)
    } catch (err: any) {
      if (err.validationErrors) {
        const fieldMap: Record<string, string> = {
          email: "email",
          codigo_estudiante: "studentCode",
          nombre_completo: "fullName",
        };
        type FormFieldName = "email" | "password" | "studentCode" | "fullName" | "confirmPassword" | "acceptTerms";
        // Los errores que no corresponden a un campo del formulario (field
        // "general", p. ej. un fallo del servidor) se muestran tal cual en el
        // banner: si solo se dijera "corrige los campos" sin marcar ninguno,
        // el estudiante vería un error sin nada que corregir.
        const sinCampo: string[] = [];
        err.validationErrors.forEach((ve: { field: string; message: string }) => {
          const formField = fieldMap[ve.field] as FormFieldName | undefined;
          if (formField) {
            form.setError(formField, { message: ve.message });
          } else {
            sinCampo.push(ve.message);
          }
        });
        setError(
          sinCampo.length > 0
            ? sinCampo.join(" ")
            : "Corrige los errores marcados en los campos."
        );
      } else {
        setError(err.message || "Error al registrar tu cuenta. Intenta nuevamente.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true)
    setError("")
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            hd: "uni.pe", // Restringe el selector de cuentas al dominio uni.pe
          },
        },
      })
      // signInWithOAuth redirige al proveedor; si vuelve aquí sin navegar fue
      // porque la URL no devolvió la sesión (p. ej. popup bloqueado).
    } catch (err: any) {
      setError(err.message || "No pudimos iniciar sesión con Google.")
      setIsLoading(false)
    }
  }

  const enviarSolicitudInvitado = async (event: any) => {
    event.preventDefault()
    setEnviandoInvitado(true)
    setError("")
    try {
      const res = await apiService.solicitarInvitado({
        nombreCompleto: invitado.nombreCompleto,
        emailContacto: invitado.emailContacto,
        universidadEmpresa: invitado.universidadEmpresa,
        motivoSolicitud: invitado.motivoSolicitud,
      })
      if (!res.ok) {
        toast.error(res.error)
        setError(res.error)
        return
      }
      toast.success("Los desarrolladores revisarán la solicitud.")
      setInvitado({
        nombreCompleto: "",
        emailContacto: "",
        universidadEmpresa: "",
        motivoSolicitud: "",
      })
    } catch (error: any) {
      const msg = error?.message || "No pudimos enviar tu solicitud."
      toast.error(msg)
      setError(msg)
    } finally {
      setEnviandoInvitado(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 gradient-brand rounded-full blur-2xl opacity-30 animate-pulse" />
              <div className="relative p-6 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
              </div>
            </div>
          </div>
          <h1 className="font-heading text-4xl font-bold text-foreground mb-3">¡Cuenta Creada!</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
            Bienvenido a la comunidad de <span className="font-bold text-foreground">LEAD UNI</span>. Tu expediente académico está listo.
          </p>
          <div className="space-y-3">
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full gradient-brand animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground font-bold">Redirigiendo al portal de acceso...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans selection:bg-accent/30 selection:text-foreground">
      <div className="pointer-events-none absolute -left-24 -top-10 h-80 w-80 rounded-full bg-[#d93340]/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#7957f1]/10 blur-3xl" aria-hidden="true" />

      <div className="min-h-screen w-full flex flex-col justify-center bg-background p-6 sm:p-8">
        <div className="max-w-5xl mx-auto w-full">
          <div className="mb-8 text-center">
            <div className="font-heading text-xl font-bold tracking-tight text-foreground/90">
              UniVia - Plataforma académica · LEAD UNI
            </div>
          </div>

          {error && <AuthErrorBanner message={error} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <section className="relative rounded-3xl border border-[#7957f1]/70 bg-card p-8 shadow-[0_0_30px_rgba(121,87,241,0.45)] shadow-black/20">
              <div className="absolute top-0 left-0 h-1 w-full rounded-t-3xl bg-gradient-to-r from-[#d93340] via-[#7957f1] to-[#4ade80]" />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#d93340] to-[#7957f1] shadow-[0_0_8px_#7957f1]" />
                  Estudiante UNI
                </span>
              </div>
              <div className="mt-6">
                <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
                  Registrarse con Correo Institucional UNI
                </h1>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  Accede instantáneamente con tu correo institucional @uni.pe y empieza a aprender sin crear una contraseña manual.
                </p>
              </div>
              <div className="mt-8">
                <Button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleSignup}
                  className="w-full py-4 px-4 gradient-login-btn text-primary-foreground font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-accent/20 active:scale-[0.99] h-auto"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                  </svg>
                  Registrarse con Correo Institucional UNI
                </Button>
              </div>
            </section>

            <section className="rounded-3xl border border-white/[0.09] bg-white/[0.04] backdrop-blur-xl p-8 shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Invitado / Desarrollador</span>
              </div>
              <div className="mt-6">
                <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
                  Solicitar acceso como invitado
                </h2>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  Si necesitas evaluar la plataforma o colaborar con el equipo, completa la solicitud y los desarrolladores revisarán tu acceso.
                </p>
              </div>
              <details className="mt-8 rounded-2xl border border-white/[0.09] bg-background/60 p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                  Enviar solicitud
                </summary>
                <form className="mt-4 space-y-4" onSubmit={enviarSolicitudInvitado}>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre Completo</label>
                    <Input
                      className="mt-2 w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.10] rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7957f1] focus:ring-[#7957f1]/50"
                      placeholder="Nombre Completo"
                      value={invitado.nombreCompleto}
                      onChange={(e) => setInvitado({ ...invitado, nombreCompleto: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Correo de Contacto</label>
                    <Input
                      className="mt-2 w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.10] rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7957f1] focus:ring-[#7957f1]/50"
                      placeholder="correo@ejemplo.com"
                      value={invitado.emailContacto}
                      onChange={(e) => setInvitado({ ...invitado, emailContacto: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Universidad/Empresa</label>
                    <Input
                      className="mt-2 w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.10] rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7957f1] focus:ring-[#7957f1]/50"
                      placeholder="Universidad/Empresa"
                      value={invitado.universidadEmpresa}
                      onChange={(e) => setInvitado({ ...invitado, universidadEmpresa: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">Motivo de Solicitud</label>
                    <Input
                      className="mt-2 w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.10] rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-[#7957f1] focus:ring-[#7957f1]/50"
                      placeholder="Motivo de Solicitud"
                      value={invitado.motivoSolicitud}
                      onChange={(e) => setInvitado({ ...invitado, motivoSolicitud: e.target.value })}
                    />
                    {form.formState.errors.motivoSolicitud?.message && (
                      <p className="text-xs font-medium text-red-500 mt-1">
                        {String(form.formState.errors.motivoSolicitud.message)}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={enviandoInvitado}
                    className="w-full py-3 px-4 rounded-xl border border-white/[0.09] bg-gradient-to-r from-[#d93340] to-[#7957f1] text-white font-semibold hover:opacity-95 transition-all duration-200"
                  >
                    {enviandoInvitado ? "Enviando..." : "Enviar solicitud"}
                  </Button>
                </form>
              </details>
            </section>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta? {" "}
            <Link className="bg-gradient-to-r from-[#d93340] to-[#7957f1] bg-clip-text text-transparent hover:opacity-90 transition-colors font-medium" href="/auth/login">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
