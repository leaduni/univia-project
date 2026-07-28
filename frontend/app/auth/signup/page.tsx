// Signup page with dark theme, unified hero layout
"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, ArrowRight, ChevronRight, Eye, EyeOff, Loader2 } from "lucide-react"
import { AuthErrorBanner } from "@/app/auth/auth-error-banner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiService } from "@/lib/api-service"
import { useRouter } from "next/navigation"

const signupSchema = z.object({
  fullName: z.string().min(5, "El nombre debe tener al menos 5 caracteres"),
  studentCode: z.string().min(8, "El código UNI debe tener al menos 8 caracteres"),
  email: z.string().email("Ingresa un correo institucional válido (@uni.pe)"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
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
        err.validationErrors.forEach((ve: { field: string; message: string }) => {
          const formField = fieldMap[ve.field] as FormFieldName | undefined;
          if (formField) {
            form.setError(formField, { message: ve.message });
          }
        });
        setError("Corrige los errores marcados en los campos.");
      } else {
        setError(err.message || "Error al registrar tu cuenta. Intenta nuevamente.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0C14] p-6">
        <div className="max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-purple-500 to-violet-500 rounded-full blur-2xl opacity-30 animate-pulse" />
              <div className="relative p-6 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">¡Cuenta Creada!</h1>
          <p className="text-gray-400 mb-8 leading-relaxed text-lg">
            Bienvenido a la comunidad de <span className="font-bold text-white">LEAD UNI</span>. Tu expediente académico está listo.
          </p>
          <div className="space-y-3">
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-violet-500 animate-pulse" />
            </div>
            <p className="text-sm text-gray-500 font-bold">Redirigiendo al portal de acceso...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0C14] grid grid-cols-1 lg:grid-cols-12 text-gray-100 font-sans selection:bg-violet-500/30 selection:text-white">
      {/* SECCIÓN IZQUIERDA: HERO / BRANDING */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-[#0E0F1D] border-r border-[#1E2030] p-8 xl:p-12 2xl:p-16 3xl:p-24 relative overflow-hidden min-h-screen">
        <div className="absolute -top-24 -left-24 w-96 h-96 2xl:w-[500px] 2xl:h-[500px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 2xl:w-[500px] 2xl:h-[500px] bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 z-10 py-2">
          <Image
            src="/Logo_LEAD_UNI.png"
            alt="LEAD UNI"
            width={48}
            height={48}
            priority
            className="w-12 h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16 object-contain drop-shadow-[0_4px_16px_rgba(244,63,94,0.4)]"
          />
          <span className="font-extrabold tracking-wider text-white text-lg xl:text-xl 2xl:text-2xl uppercase font-sans select-none">
            LEAD UNI
          </span>
        </div>

        <div className="z-10 my-auto max-w-md space-y-6">
          <h1 className="text-3xl xl:text-4xl 2xl:text-5xl 3xl:text-6xl font-bold tracking-tight leading-tight text-white">
            Únete a la<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-purple-400 to-violet-400">
              Revolución Académica.
            </span>
          </h1>
          <p className="text-gray-400 text-sm xl:text-base 2xl:text-lg leading-relaxed">
            Acceso a herramientas inteligentes que transformarán tu trayectoria universitaria en una experiencia de aprendizaje personalizada.
          </p>
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 p-3 2xl:p-4 bg-[#161826] border border-[#2A2D42] rounded-xl">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 text-lg">📚</div>
              <div>
                <p className="text-xs 2xl:text-sm font-semibold text-gray-200">Malla Curricular Inteligente</p>
                <p className="text-[11px] 2xl:text-xs text-gray-400">Visualiza tu progreso y planifica tu ciclo.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 2xl:p-4 bg-[#161826] border border-[#2A2D42] rounded-xl">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 text-lg">🤖</div>
              <div>
                <p className="text-xs 2xl:text-sm font-semibold text-gray-200">Evaluaciones adaptativas con IA</p>
                <p className="text-[11px] 2xl:text-xs text-gray-400">Practica con exámenes alineados a tu syllabus.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-600 z-10">
          © 2026 LEAD UNI — Plataforma de Gestión Académica Superior.
        </p>
      </div>

      {/* SECCIÓN DERECHA: FORMULARIO DE REGISTRO */}
      <div className="col-span-1 lg:col-span-7 bg-[#0B0C14] flex flex-col justify-center items-center p-6 sm:p-12 xl:p-16 2xl:p-24 min-h-screen">
        <div className="w-full max-w-md xl:max-w-lg 2xl:max-w-xl space-y-6 2xl:space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-bold tracking-tight text-white">Regístrate</h2>
            <p className="text-sm xl:text-base 2xl:text-lg text-gray-400">
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
                    <FormLabel className="block text-xs 2xl:text-sm font-medium text-gray-400 uppercase tracking-wider">
                      Nombre Completo
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Juan Carlos Pérez García"
                        className="w-full px-4 py-2.5 2xl:py-4 bg-[#1E2030] border border-[#2A2D42] rounded-xl text-sm 2xl:text-base text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-200 h-auto"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="studentCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-xs 2xl:text-sm font-medium text-gray-400 uppercase tracking-wider">
                        Código UNI
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="20241000"
                          className="w-full px-4 py-2.5 2xl:py-4 bg-[#1E2030] border border-[#2A2D42] rounded-xl text-sm 2xl:text-base text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-200 h-auto"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-xs 2xl:text-sm font-medium text-gray-400 uppercase tracking-wider">
                        Correo Institucional
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="nombre@uni.pe"
                          className="w-full px-4 py-2.5 2xl:py-4 bg-[#1E2030] border border-[#2A2D42] rounded-xl text-sm 2xl:text-base text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-200 h-auto"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
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
                      <FormLabel className="block text-xs 2xl:text-sm font-medium text-gray-400 uppercase tracking-wider">
                        Contraseña
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="w-full px-4 py-2.5 2xl:py-4 bg-[#1E2030] border border-[#2A2D42] rounded-xl text-sm 2xl:text-base text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-200 pr-10 h-auto"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-xs 2xl:text-sm font-medium text-gray-400 uppercase tracking-wider">
                        Confirmar Contraseña
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="w-full px-4 py-2.5 2xl:py-4 bg-[#1E2030] border border-[#2A2D42] rounded-xl text-sm 2xl:text-base text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-200 pr-10 h-auto"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                            aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
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
                        className="mt-1 rounded border-[#2A2D42] bg-[#1E2030] text-violet-600 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer"
                        checked={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <div className="flex-1">
                      <label className="text-xs 2xl:text-sm text-gray-400 cursor-pointer leading-relaxed">
                        Acepto los <a href="#" className="text-violet-400 underline">términos y condiciones</a> y la <a href="#" className="text-violet-400 underline">política de privacidad</a> de LEAD UNI.
                      </label>
                      <FormMessage className="text-xs text-red-400 mt-1" />
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 2xl:py-4 px-4 bg-gradient-to-r from-rose-600 via-purple-600 to-violet-600 hover:opacity-95 text-white font-semibold rounded-xl text-sm 2xl:text-base transition-all duration-200 shadow-lg shadow-purple-900/20 active:scale-[0.99] mt-2 h-auto"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creando cuenta...</>
                ) : (
                  <>Crear Cuenta Académica <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center text-xs 2xl:text-sm text-gray-400 pt-2">
            ¿Ya tienes cuenta?{" "}
            <Link className="text-violet-400 hover:text-violet-300 font-medium transition-colors" href="/auth/login">
              Inicia sesión aquí →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
