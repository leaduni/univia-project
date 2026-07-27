// Login page with dark theme, email/password only
"use client"

import { Suspense, useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Sparkles, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiService } from "@/lib/api-service"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthErrorBanner } from "@/app/auth/auth-error-banner"

const loginSchema = z.object({
  email: z.string().email("Ingresa un correo institucional válido (@uni.pe)"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#0B0C14] flex items-center justify-center"><p className="text-gray-100">Cargando...</p></div>}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setShowSuccessToast(true)
      const timer = setTimeout(() => setShowSuccessToast(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setError("")
    try {
      await apiService.login({
        email: data.email,
        password: data.password,
      })
      router.push("/")
    } catch (err: any) {
      setError(err.message || "No pudimos validar tus credenciales académicas.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0C14] grid grid-cols-1 lg:grid-cols-12 text-gray-100 font-sans selection:bg-violet-500/30 selection:text-white">
      {showSuccessToast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/20">
            <Sparkles className="w-5 h-5 animate-bounce" />
            <p className="font-bold text-sm">¡Cuenta creada! Ya puedes iniciar sesión.</p>
          </div>
        </div>
      )}

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
            Toda la UNI,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-purple-400 to-violet-400">
              en un solo lugar.
            </span>
          </h1>
          <p className="text-gray-400 text-sm xl:text-base 2xl:text-lg leading-relaxed">
            Tu malla, tus cursos, exámenes pasados y evaluaciones de práctica generadas con IA. UniVia ordena tu camino académico para que tú solo te ocupes de aprender.
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500 tracking-widest uppercase font-medium pt-2">
            <span className="h-0.5 w-8 bg-gradient-to-r from-rose-500 to-violet-500 inline-block rounded-full" />
            Learn. Explore. Aspire. Discover.
          </div>
        </div>

        <p className="text-xs text-gray-600 z-10">
          Un proyecto de ayuda social de LEAD UNI para la comunidad UNI.
        </p>
      </div>

      {/* SECCIÓN DERECHA: FORMULARIO */}
      <div className="col-span-1 lg:col-span-7 bg-[#0B0C14] flex flex-col justify-center items-center p-6 sm:p-12 xl:p-16 2xl:p-24 min-h-screen">
        <div className="w-full max-w-md xl:max-w-lg 2xl:max-w-xl space-y-6 2xl:space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-bold tracking-tight text-white">UniVia</h2>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                Portal
              </span>
            </div>
            <p className="text-sm xl:text-base 2xl:text-lg text-gray-400">
              Qué bueno verte por acá 👋 Ingresa con tu correo institucional.
            </p>
          </div>

          {error && <AuthErrorBanner message={error} />}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-xs 2xl:text-sm font-medium text-gray-400">
                      Correo institucional
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="tucodigo@uni.pe"
                        className="w-full px-4 py-3 2xl:py-4 bg-[#1E2030] border border-[#2A2D42] rounded-xl text-sm 2xl:text-base text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-200 h-auto"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-xs 2xl:text-sm font-medium text-gray-400">
                      Contraseña
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 2xl:py-4 bg-[#1E2030] border border-[#2A2D42] rounded-xl text-sm 2xl:text-base text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-200 pr-10 h-auto"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs"
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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 2xl:py-4 px-4 bg-gradient-to-r from-rose-600 via-purple-600 to-violet-600 hover:opacity-95 text-white font-semibold rounded-xl text-sm 2xl:text-base transition-all duration-200 shadow-lg shadow-purple-900/20 active:scale-[0.99] mt-2 h-auto"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Validando...</>
                ) : (
                  <>Ingresar a UniVia <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </form>
          </Form>

          <div className="flex items-center justify-between text-xs 2xl:text-sm text-gray-400 pt-1">
            <Link href="/auth/forgot-password" className="hover:text-white transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
            <Link className="text-violet-400 hover:text-violet-300 font-medium transition-colors" href="/auth/signup">
              Crear cuenta
            </Link>
          </div>

          <div className="p-4 2xl:p-5 bg-[#161826] border border-[#2A2D42] rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs 2xl:text-sm text-gray-400 leading-relaxed">
              Solo necesitas tu correo <strong className="text-gray-200 font-medium">@uni.pe</strong> — sin trámites, sin costo.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
