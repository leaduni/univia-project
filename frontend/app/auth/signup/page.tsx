// Signup page with dark theme, unified hero layout
"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, ArrowRight, ChevronRight, Eye, EyeOff, Loader2 } from "lucide-react"
import { AuthErrorBanner } from "@/app/auth/auth-error-banner"
import { BrandLogo } from "@/app/auth/brand-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiService } from "@/lib/api-service"
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

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

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
    <div className="min-h-screen w-full bg-background grid grid-cols-1 lg:grid-cols-12 text-foreground font-sans selection:bg-accent/30 selection:text-foreground">
      {/* SECCIÓN IZQUIERDA: HERO / BRANDING */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-card border-r border-border p-8 xl:p-12 2xl:p-16 3xl:p-24 relative overflow-hidden min-h-screen">
        <div className="absolute -top-24 -left-24 w-96 h-96 2xl:w-[500px] 2xl:h-[500px] bg-accent/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 2xl:w-[500px] 2xl:h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <BrandLogo />

        <div className="z-10 my-auto max-w-md space-y-6">
          <h1 className="font-heading text-3xl xl:text-4xl 2xl:text-5xl 3xl:text-6xl font-bold tracking-tight leading-tight text-foreground">
            Únete a la<br />
            <span className="gradient-brand-text">
              Revolución Académica.
            </span>
          </h1>
          <p className="text-muted-foreground text-sm xl:text-base 2xl:text-lg leading-relaxed">
            Acceso a herramientas inteligentes que transformarán tu trayectoria universitaria en una experiencia de aprendizaje personalizada.
          </p>
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 p-3 2xl:p-4 bg-card border border-border rounded-xl">
              <div className="p-2 rounded-lg bg-primary/10 text-primary text-lg">📚</div>
              <div>
                <p className="text-xs 2xl:text-sm font-semibold text-foreground">Malla Curricular Inteligente</p>
                <p className="text-[11px] 2xl:text-xs text-muted-foreground">Visualiza tu progreso y planifica tu ciclo.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 2xl:p-4 bg-card border border-border rounded-xl">
              <div className="p-2 rounded-lg bg-accent/10 text-accent text-lg">🤖</div>
              <div>
                <p className="text-xs 2xl:text-sm font-semibold text-foreground">Evaluaciones adaptativas con IA</p>
                <p className="text-[11px] 2xl:text-xs text-muted-foreground">Practica con exámenes alineados a tu syllabus.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/70 z-10">
          © 2026 LEAD UNI — Plataforma de Gestión Académica Superior.
        </p>
      </div>

      {/* SECCIÓN DERECHA: FORMULARIO DE REGISTRO */}
      <div className="col-span-1 lg:col-span-7 bg-background flex flex-col justify-center items-center p-6 sm:p-12 xl:p-16 2xl:p-24 min-h-screen">
        <div className="w-full max-w-md xl:max-w-lg 2xl:max-w-xl space-y-6 2xl:space-y-8">
          <div className="space-y-2">
            <h2 className="font-heading text-2xl xl:text-3xl 2xl:text-4xl font-bold tracking-tight text-foreground">Regístrate</h2>
            <p className="text-sm xl:text-base 2xl:text-lg text-muted-foreground">
              Completa tus datos para acceder a UniVia y transformar tu experiencia.
            </p>
          </div>

          {error && <AuthErrorBanner message={error} />}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-xs 2xl:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Nombre Completo
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Juan Carlos Pérez García"
                        className="w-full px-4 py-2.5 2xl:py-4 bg-input border border-border rounded-xl text-sm 2xl:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all duration-200 h-auto"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-destructive" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="studentCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-xs 2xl:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Código UNI
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="20241000"
                          className="w-full px-4 py-2.5 2xl:py-4 bg-input border border-border rounded-xl text-sm 2xl:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all duration-200 h-auto"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-xs 2xl:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Correo Institucional
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="nombre@uni.pe"
                          className="w-full px-4 py-2.5 2xl:py-4 bg-input border border-border rounded-xl text-sm 2xl:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all duration-200 h-auto"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-destructive" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-xs 2xl:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Contraseña
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="w-full px-4 py-2.5 2xl:py-4 bg-input border border-border rounded-xl text-sm 2xl:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all duration-200 pr-10 h-auto"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-xs 2xl:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Confirmar Contraseña
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="w-full px-4 py-2.5 2xl:py-4 bg-input border border-border rounded-xl text-sm 2xl:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all duration-200 pr-10 h-auto"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-destructive" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 pt-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-border bg-input text-accent focus:ring-ring focus:ring-offset-0 cursor-pointer"
                        checked={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <div className="flex-1">
                      <label className="text-xs 2xl:text-sm text-muted-foreground cursor-pointer leading-relaxed">
                        Acepto los <a href="#" className="text-accent underline">términos y condiciones</a> y la <a href="#" className="text-accent underline">política de privacidad</a> de LEAD UNI.
                      </label>
                      <FormMessage className="text-xs text-destructive mt-1" />
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 2xl:py-4 px-4 gradient-login-btn text-foreground font-semibold rounded-xl text-sm 2xl:text-base transition-all duration-200 shadow-lg shadow-accent/20 active:scale-[0.99] mt-2 h-auto"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creando cuenta...</>
                ) : (
                  <>Crear Cuenta Académica <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center text-xs 2xl:text-sm text-muted-foreground pt-2">
            ¿Ya tienes cuenta?{" "}
            <Link className="text-accent hover:text-accent/80 font-medium transition-colors" href="/auth/login">
              Inicia sesión aquí →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
