// Login page with dark theme, email/password only
"use client"

import { Suspense, useState, useEffect } from "react"
import Link from "next/link"
import { Sparkles, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react"
import { BrandLogo } from "@/app/auth/brand-logo"
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
    <Suspense fallback={<div className="h-screen bg-background flex items-center justify-center"><p className="text-foreground">Cargando...</p></div>}>
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
    <div className="min-h-screen w-full bg-background grid grid-cols-1 lg:grid-cols-12 text-foreground font-sans selection:bg-accent/30 selection:text-foreground">
      {showSuccessToast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/20">
            <Sparkles className="w-5 h-5 animate-bounce" />
            <p className="font-bold text-sm">¡Cuenta creada! Ya puedes iniciar sesión.</p>
          </div>
        </div>
      )}

      {/* SECCIÓN IZQUIERDA: HERO / BRANDING */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-card border-r border-border p-8 xl:p-12 2xl:p-16 3xl:p-24 relative overflow-hidden min-h-screen">
        <div className="absolute -top-24 -left-24 w-96 h-96 2xl:w-[500px] 2xl:h-[500px] bg-accent/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 2xl:w-[500px] 2xl:h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <BrandLogo />

        <div className="z-10 my-auto max-w-md space-y-6">
          <h1 className="font-heading text-3xl xl:text-4xl 2xl:text-5xl 3xl:text-6xl font-bold tracking-tight leading-tight text-foreground">
            Toda la UNI,<br />
            <span className="gradient-brand-text">
              en un solo lugar.
            </span>
          </h1>
          <p className="text-muted-foreground text-sm xl:text-base 2xl:text-lg leading-relaxed">
            Tu malla, tus cursos, exámenes pasados y evaluaciones de práctica generadas con IA. UniVia ordena tu camino académico para que tú solo te ocupes de aprender.
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground tracking-widest uppercase font-medium pt-2">
            <span className="h-0.5 w-8 gradient-brand inline-block rounded-full" />
            Learn. Explore. Aspire. Discover.
          </div>
        </div>

        <p className="text-xs text-muted-foreground/70 z-10">
          Un proyecto de ayuda social de LEAD UNI para la comunidad UNI.
        </p>
      </div>

      {/* SECCIÓN DERECHA: FORMULARIO */}
      <div className="col-span-1 lg:col-span-7 bg-background flex flex-col justify-center items-center p-6 sm:p-12 xl:p-16 2xl:p-24 min-h-screen">
        <div className="w-full max-w-md xl:max-w-lg 2xl:max-w-xl space-y-6 2xl:space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-2xl xl:text-3xl 2xl:text-4xl font-bold tracking-tight text-foreground">UniVia</h2>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 uppercase tracking-wider">
                Portal
              </span>
            </div>
            <p className="text-sm xl:text-base 2xl:text-lg text-muted-foreground">
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
                    <FormLabel className="block text-xs 2xl:text-sm font-medium text-muted-foreground">
                      Correo institucional
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="tucodigo@uni.pe"
                        className="w-full px-4 py-3 2xl:py-4 bg-input border border-border rounded-xl text-sm 2xl:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all duration-200 h-auto"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-destructive" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-xs 2xl:text-sm font-medium text-muted-foreground">
                      Contraseña
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 2xl:py-4 bg-input border border-border rounded-xl text-sm 2xl:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all duration-200 pr-10 h-auto"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 2xl:py-4 px-4 gradient-login-btn text-primary-foreground font-semibold rounded-xl text-sm 2xl:text-base transition-all duration-200 shadow-lg shadow-accent/20 active:scale-[0.99] mt-2 h-auto"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Validando...</>
                ) : (
                  <>Ingresar a UniVia <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </form>
          </Form>

          <div className="flex items-center justify-between text-xs 2xl:text-sm text-muted-foreground pt-1">
            <Link href="/auth/forgot-password" className="hover:text-foreground transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
            <Link className="text-accent hover:text-accent/80 font-medium transition-colors" href="/auth/signup">
              Crear cuenta
            </Link>
          </div>

          <div className="p-4 2xl:p-5 bg-card border border-border rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-accent shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs 2xl:text-sm text-muted-foreground leading-relaxed">
              Solo necesitas tu correo <strong className="text-foreground font-medium">@uni.pe</strong> — sin trámites, sin costo.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
