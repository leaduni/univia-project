"use client"

import { useState, useEffect } from "react"
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
    <div className="min-h-screen flex bg-[#fdfdff] font-sans selection:bg-[#7957f1]/10 selection:text-[#7957f1]">
      
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
      <div className="hidden lg:flex lg:w-[55%] bg-[#030c40] relative flex-col justify-between p-16 overflow-hidden">
        
        {/* Capas de Diseño Premium (No Genérico) */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#7957f1_1px,transparent_1px)] [background-size:32px_32px]" />
        </div>
        
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#a6249d] rounded-full blur-[160px] opacity-20 animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#7957f1] rounded-full blur-[140px] opacity-20 animate-pulse [animation-delay:2s]" />

        <div className="relative z-10">
          <div className="animate-in fade-in slide-in-from-left-4 duration-700">
            <BrandLogo />
          </div>

          <div className="max-w-xl mt-20 space-y-8">
            <h1 className="text-6xl font-display font-black tracking-tight leading-[1.05] text-white animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Tu futuro <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d93340] via-[#a6249d] to-[#7957f1]">
                comienza aquí.
              </span>
            </h1>
            
            <p className="text-xl text-slate-300 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              UniVia es el ecosistema inteligente de LEAD UNI que transforma tu trayectoria académica en un camino de éxito guiado por datos.
            </p>

            <div className="grid grid-cols-1 gap-5 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              {[
                { icon: BookOpen, title: "Expediente 360°", desc: "Visualiza tu progreso académico con claridad absoluta.", color: "from-[#d93340] to-[#bf2a51]" },
                { icon: Cpu, title: "Motor RAG (IA)", desc: "Recomendaciones inteligentes basadas en tu perfil único.", color: "from-[#a6249d] to-[#7957f1]" },
                { icon: ShieldCheck, title: "Protocolo Seguro", desc: "Seguridad institucional de grado militar para tus datos.", color: "from-[#7957f1] to-[#030c40]" },
              ].map((feature, idx) => (
                <div
                  key={feature.title}
                  className="group flex items-center gap-5 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 cursor-default"
                >
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg transition-transform group-hover:scale-110`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{feature.title}</h3>
                    <p className="text-slate-400 text-sm leading-snug">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-widest">
          <span>© 2026 LEAD UNI</span>
          <div className="flex gap-6">
            <span className="hover:text-white transition-colors cursor-pointer">Privacidad</span>
            <span className="hover:text-white transition-colors cursor-pointer">Términos</span>
          </div>
        </div>
      </div>

      {/* Lado Derecho - Portal de Acceso (UX Refinada) */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-12 bg-white">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-[#7957f1] text-[10px] font-black uppercase tracking-tighter mb-4 border border-indigo-100">
              <Sparkles className="w-3 h-3" />
              Portal Universitario
            </div>
            <h2 className="text-4xl font-display font-black text-slate-900 mb-2">Bienvenido</h2>
            <p className="text-slate-500 font-medium">Ingresa tus credenciales académicas para continuar.</p>
          </div>

          {error && <AuthErrorBanner message={error} />}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="codigoUni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        Código Universitario
                      </FormLabel>
                      <FormControl>
                        <div className="group relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7957f1] transition-colors">
                            <IdCard className="w-5 h-5" />
                          </div>
                          <Input
                            placeholder="Ej. 20241000"
                            className="h-14 pl-12 border-slate-200 bg-slate-50/50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#7957f1]/5 focus:border-[#7957f1] transition-all font-bold text-slate-700"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-bold text-red-500 ml-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        Correo Institucional
                      </FormLabel>
                      <FormControl>
                        <div className="group relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7957f1] transition-colors">
                            <Mail className="w-5 h-5" />
                          </div>
                          <Input
                            type="email"
                            placeholder="nombre@uni.pe"
                            className="h-14 pl-12 border-slate-200 bg-slate-50/50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#7957f1]/5 focus:border-[#7957f1] transition-all font-bold text-slate-700"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-bold text-red-500 ml-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-1 px-1">
                        <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                          Contraseña
                        </FormLabel>
                        <Link
                          href="/auth/forgot-password"
                          className="text-[11px] font-black text-[#7957f1] hover:text-[#a6249d] transition-colors uppercase tracking-tighter"
                        >
                          ¿Olvidaste tu clave?
                        </Link>
                      </div>
                      <FormControl>
                        <PasswordField 
                          field={field} 
                          placeholder="••••••••" 
                          className="h-14 bg-slate-50/50 rounded-2xl focus:bg-white transition-all"
                        />
                      </FormControl>
                      <FormMessage className="text-xs font-bold text-red-500 ml-1" />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="group relative w-full h-14 bg-[#030c40] hover:bg-[#051159] text-white rounded-2xl font-black text-lg transition-all active:scale-[0.97] overflow-hidden shadow-xl shadow-indigo-100"
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      Ingresar al Portal
                      <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#7957f1] to-[#a6249d] opacity-0 group-hover:opacity-10 transition-opacity" />
              </Button>
            </form>
          </Form>

          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm font-bold">
              ¿No tienes una cuenta académica? <br />
              <Link 
                href="/auth/signup" 
                className="inline-flex items-center gap-1 text-[#a6249d] hover:text-[#7957f1] transition-colors mt-2 text-base font-black group"
              >
                Regístrate ahora
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}