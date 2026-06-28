"use client"

import { Suspense, useState, useEffect } from "react"
import Link from "next/link"
import { 
  ShieldCheck, 
  BookOpen, 
  Cpu, 
  ArrowRight, 
  Mail, 
  IdCard, 
  Loader2,
  Sparkles,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiService } from "@/lib/api-service"
import { useRouter, useSearchParams } from "next/navigation"
import { FieldIcon } from "@/app/auth/field-icon"
import { PasswordField } from "@/app/auth/password-field"
import { AuthErrorBanner } from "@/app/auth/auth-error-banner"
import { BrandLogo } from "@/app/auth/brand-logo"

const loginSchema = z.object({
  codigoUni: z.string().min(1, "El código UNI es obligatorio para tu expediente"),
  email: z.string().email("Ingresa un correo institucional válido (@uni.pe)"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginPayload {
  email: string
  password: string
  codigoUni: string
}

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

  // Efecto para detectar si viene de un registro exitoso
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
      codigoUni: "",
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setError("")
    try {
      const payload: LoginPayload = {
        email: data.email,
        password: data.password,
        codigoUni: data.codigoUni,
      }
      await apiService.login(payload)
      router.push("/")
    } catch (err: any) {
      setError(err.message || "No pudimos validar tus credenciales académicas.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen flex bg-[#fdfdff] font-sans overflow-hidden selection:bg-[#7957f1]/10 selection:text-[#7957f1]">
      
      {/* Toast de Registro Exitoso (UX Dinámica) */}
      {showSuccessToast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/20">
            <Sparkles className="w-5 h-5 animate-bounce" />
            <p className="font-bold text-sm">¡Cuenta creada! Ya puedes iniciar sesión.</p>
          </div>
        </div>
      )}

      {/* Lado Izquierdo - Inmersión Académica (LEAD UNI) */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#030c40] relative flex-col px-16 py-6 overflow-hidden">
        
        {/* Fondos decorativos */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#7957f1_1px,transparent_1px)] [background-size:32px_32px]" />
        </div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#a6249d] rounded-full blur-[160px] opacity-20 animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#7957f1] rounded-full blur-[140px] opacity-20 animate-pulse [animation-delay:2s]" />

        {/* Logo */}
        <div className="relative z-10 animate-in fade-in slide-in-from-left-4 duration-700 shrink-0">
          <BrandLogo />
        </div>

        {/* Contenido central — siempre centrado sin importar el zoom */}
        <div className="relative z-10 flex-1 flex flex-col justify-center pb-10">
          <div className="w-full max-w-md mx-auto space-y-4">
            <h1 className="text-4xl font-heading font-black tracking-tight leading-[1.05] text-white animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Tu futuro <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d93340] via-[#a6249d] to-[#7957f1]">
                comienza aquí.
              </span>
            </h1>

            <p className="text-base text-slate-300 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              UniVia es el ecosistema inteligente de LEAD UNI que transforma tu trayectoria académica en un camino de éxito guiado por datos.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              {[
                { icon: BookOpen, title: "Expediente 360°", desc: "Visualiza tu progreso académico con claridad absoluta.", color: "from-[#d93340] to-[#bf2a51]" },
                { icon: Cpu, title: "Motor RAG (IA)", desc: "Recomendaciones inteligentes basadas en tu perfil único.", color: "from-[#a6249d] to-[#7957f1]" },
                { icon: ShieldCheck, title: "Protocolo Seguro", desc: "Seguridad institucional de grado militar para tus datos.", color: "from-[#7957f1] to-[#030c40]" },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="group flex items-start gap-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 cursor-default"
                >
                  <div className={`shrink-0 mt-0.5 p-3 rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg transition-transform group-hover:scale-110`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-white font-bold text-base">{feature.title}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer — siempre abajo */}
        <div className="relative z-10 flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-widest shrink-0">
          <span>© 2026 LEAD UNI</span>
          <div className="flex gap-6">
            <span className="hover:text-white transition-colors cursor-pointer">Privacidad</span>
            <span className="hover:text-white transition-colors cursor-pointer">Términos</span>
          </div>
        </div>
      </div>

      {/* Lado Derecho - Portal de Acceso */}
      <div className="w-full lg:w-[45%] flex items-center justify-center bg-[#060e4a] relative overflow-hidden">

        {/* Acento magenta arriba-derecha */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#a6249d] rounded-full blur-[120px] opacity-25 pointer-events-none" />
        {/* Acento violeta abajo-izquierda */}
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#7957f1] rounded-full blur-[100px] opacity-20 pointer-events-none" />

        <div className="w-full max-w-md px-10 py-14 animate-in fade-in duration-500 relative z-10">

          {/* Ícono central con glow */}
          <div className="flex justify-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7957f1] to-[#a6249d] flex items-center justify-center shadow-lg shadow-[#7957f1]/40">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Header centrado */}
          <div className="text-center mb-8">
            <p className="text-[#a78bfa] text-xs font-bold uppercase tracking-widest mb-3">Portal Universitario</p>
            <h2 className="text-3xl font-heading font-black text-white mb-2">Bienvenido</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Ingresa tus credenciales académicas para continuar.
            </p>
          </div>

          {error && <AuthErrorBanner message={error} />}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              <FormField
                control={form.control}
                name="codigoUni"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-300 block">
                      Código Universitario
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                        <Input
                          placeholder="Ej. 20241000"
                          className="auth-input h-12 pl-10 w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-1 focus-visible:ring-[#7957f1] focus-visible:border-[#7957f1] transition-colors font-medium text-sm"
                          {...field}
                        />
                      </div>
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
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-300 block">
                      Correo Institucional
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="nombre@uni.pe"
                          className="auth-input h-12 pl-10 w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-400 rounded-xl focus-visible:ring-1 focus-visible:ring-[#7957f1] focus-visible:border-[#7957f1] transition-colors font-medium text-sm"
                          {...field}
                        />
                      </div>
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
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                        Contraseña
                      </FormLabel>
                      <Link
                        href="/auth/forgot-password"
                        className="text-[10px] font-bold text-[#a78bfa] hover:text-[#d93340] transition-colors"
                      >
                        ¿Olvidaste tu clave?
                      </Link>
                    </div>
                    <FormControl>
                      <PasswordField
                        field={field}
                        placeholder="••••••••"
                        className="h-12 w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-400 rounded-xl focus-visible:ring-1 focus-visible:ring-[#7957f1] focus-visible:border-[#7957f1] transition-colors auth-input"
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="group w-full h-12 bg-gradient-to-r from-[#7957f1] to-[#a6249d] hover:from-[#6644e0] hover:to-[#8e1e8a] text-white rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#7957f1]/30"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Validando...</>
                  ) : (
                    <>Ingresar al Portal <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" /></>
                  )}
                </Button>
              </div>

            </form>
          </Form>

          <div className="mt-8 text-center">
            <p className="text-slate-300 text-sm">
              ¿No tienes cuenta?{" "}
              <Link
                href="/auth/signup"
                className="text-[#a6249d] hover:text-[#7957f1] font-bold transition-colors"
              >
                Regístrate ahora →
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}



