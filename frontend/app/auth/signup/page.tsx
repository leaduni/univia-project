"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  ChevronRight,
  User,
  Mail,
  IdCard,
  Lock,
  BookOpen,
  Cpu,
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiService } from "@/lib/api-service"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { BrandLogo } from "@/app/auth/brand-logo"

const signupSchema = z.object({
  nombreCompleto: z.string().min(5, "El nombre debe tener al menos 5 caracteres"),
  codigoUni: z.string().min(8, "El código UNI debe tener al menos 8 caracteres"),
  email: z.string().email("Ingresa un correo institucional válido (@uni.pe)"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string(),
  aceptaTerminos: z.boolean().refine(val => val === true, "Debes aceptar los términos y condiciones"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type SignupFormValues = z.infer<typeof signupSchema>

interface SignupPayload {
  email: string
  password: string
  fullName: string
  codigoUni: string
}

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      nombreCompleto: "",
      codigoUni: "",
      email: "",
      password: "",
      confirmPassword: "",
      aceptaTerminos: false,
    },
  })

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true)
    setError("")
    try {
      const payload: SignupPayload = {
        email: data.email,
        password: data.password,
        fullName: data.nombreCompleto,
        codigoUni: data.codigoUni,
      }
      
      await apiService.signup(payload as any)
      setSuccess(true)
      
      setTimeout(() => {
        router.push("/auth/login?registered=true")
      }, 2500)
    } catch (err: any) {
      setError(err.message || "Error al registrar tu cuenta. Intenta nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fdfdff] to-slate-50 p-6">
        <div className="max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#d93340] via-[#a6249d] to-[#7957f1] rounded-full blur-2xl opacity-30 animate-pulse" />
              <div className="relative p-6 rounded-full bg-emerald-50 border-2 border-emerald-200">
                <CheckCircle2 className="w-16 h-16 text-emerald-600 animate-bounce" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-heading font-black text-slate-900 mb-3">¡Cuenta Creada!</h1>
          <p className="text-slate-600 mb-8 leading-relaxed text-lg">
            Bienvenido a la comunidad de <span className="font-black text-[#030c40]">LEAD UNI</span>. Tu expediente académico está listo.
          </p>
          <div className="space-y-3">
            <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#d93340] via-[#a6249d] to-[#7957f1] animate-pulse" />
            </div>
            <p className="text-sm text-slate-500 font-bold">Redirigiendo al portal de acceso...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#fdfdff] font-sans selection:bg-[#7957f1]/10 selection:text-[#7957f1]">
      
      {/* Lado Izquierdo - Inmersión Académica (LEAD UNI) */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-[#030c40] via-[#1a1a5c] to-[#0a0a2e] relative flex-col justify-between p-16 overflow-hidden">
        
        {/* Capas de Diseño Premium */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#7957f1_1px,transparent_1px)] [background-size:32px_32px]" />
        </div>
        
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#a6249d] rounded-full blur-[160px] opacity-20 animate-pulse" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#7957f1] rounded-full blur-[140px] opacity-20 animate-pulse [animation-delay:2s]" />

        <div className="relative z-10">
          <div className="animate-in fade-in slide-in-from-left-4 duration-700">
            <BrandLogo />
          </div>

          <div className="max-w-xl mt-20 space-y-8">
            <h1 className="text-6xl font-heading font-black tracking-tight leading-[1.05] text-white animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Únete a la <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d93340] via-[#a6249d] to-[#7957f1]">
                Revolución Académica
              </span>
            </h1>
            
            <p className="text-xl text-slate-300 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              Acceso a herramientas inteligentes que transformarán tu trayectoria universitaria en una experiencia de aprendizaje personalizado.
            </p>

            <div className="grid grid-cols-1 gap-5 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              {[
                { icon: BookOpen, title: "Malla Curricular Inteligente", desc: "Visualiza tu progreso y planifica tu futuro académico." },
                { icon: Cpu, title: "Recomendaciones IA", desc: "Sistema de aprendizaje adaptativo basado en tu perfil." },
                { icon: ShieldCheck, title: "Seguridad Institucional", desc: "Protección de datos de nivel universitario." },
              ].map((feature, idx) => (
                <div
                  key={feature.title}
                  className="group flex items-center gap-5 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 cursor-default"
                >
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[#a6249d] to-[#7957f1] text-white shadow-lg transition-transform group-hover:scale-110">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{feature.title}</h3>
                    <p className="text-slate-300 text-sm leading-snug">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 text-slate-400 text-xs font-bold uppercase tracking-widest">
          © 2026 LEAD UNI — Plataforma de Gestión Académica Superior
        </div>
      </div>

      {/* Lado Derecho - Formulario de Registro (UX Refinada) */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-[#7957f1] text-[10px] font-black uppercase tracking-tighter mb-4 border border-indigo-100">
              <Sparkles className="w-3 h-3" />
              Crear Cuenta
            </div>
            <h2 className="text-4xl font-heading font-black text-slate-900 mb-2">Regístrate</h2>
            <p className="text-slate-500 font-medium">Completa tus datos para acceder a UniVia y transformar tu experiencia académica.</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-100 bg-red-50 text-red-700 mb-8 text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-5">
                {/* Nombre Completo */}
                <FormField
                  control={form.control}
                  name="nombreCompleto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        Nombre Completo
                      </FormLabel>
                      <FormControl>
                        <div className="group relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7957f1] transition-colors">
                            <User className="w-5 h-5" />
                          </div>
                          <Input
                            placeholder="Juan Carlos Pérez García"
                            className="h-14 pl-12 border-slate-200 bg-slate-50/50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#7957f1]/5 focus:border-[#7957f1] transition-all font-bold text-slate-700"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-bold text-red-500 ml-1" />
                    </FormItem>
                  )}
                />

                {/* Código UNI */}
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
                            placeholder="202410001234"
                            className="h-14 pl-12 border-slate-200 bg-slate-50/50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#7957f1]/5 focus:border-[#7957f1] transition-all font-bold text-slate-700"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-bold text-red-500 ml-1" />
                    </FormItem>
                  )}
                />

                {/* Email Institucional */}
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

                {/* Contraseña */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        Contraseña
                      </FormLabel>
                      <FormControl>
                        <div className="group relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7957f1] transition-colors">
                            <Lock className="w-5 h-5" />
                          </div>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-14 pl-12 pr-12 border-slate-200 bg-slate-50/50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#7957f1]/5 focus:border-[#7957f1] transition-all font-bold text-slate-700"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#7957f1] transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-bold text-red-500 ml-1" />
                    </FormItem>
                  )}
                />

                {/* Confirmar Contraseña */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        Confirmar Contraseña
                      </FormLabel>
                      <FormControl>
                        <div className="group relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7957f1] transition-colors">
                            <Lock className="w-5 h-5" />
                          </div>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-14 pl-12 pr-12 border-slate-200 bg-slate-50/50 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#7957f1]/5 focus:border-[#7957f1] transition-all font-bold text-slate-700"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#7957f1] transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-bold text-red-500 ml-1" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Términos y Condiciones */}
              <FormField
                control={form.control}
                name="aceptaTerminos"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-indigo-200 accent-[#7957f1] cursor-pointer mt-0.5 flex-shrink-0"
                        checked={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <div className="flex-1">
                      <label className="text-sm text-slate-700 cursor-pointer font-bold">
                        Acepto los <span className="text-[#7957f1]">términos y condiciones</span> y la <span className="text-[#7957f1]">política de privacidad</span> de LEAD UNI.
                      </label>
                      <FormMessage className="text-xs font-bold text-red-500 mt-1" />
                    </div>
                  </FormItem>
                )}
              />

              {/* Botón de Envío */}
              <Button
                type="submit"
                disabled={isLoading}
                className="group relative w-full h-14 bg-[#030c40] hover:bg-[#051159] text-white rounded-2xl font-black text-lg transition-all active:scale-[0.97] overflow-hidden shadow-xl shadow-indigo-100"
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {isLoading ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      Crear Cuenta Académica
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
              ¿Ya tienes cuenta? <br />
              <Link 
                href="/auth/login" 
                className="inline-flex items-center gap-1 text-[#a6249d] hover:text-[#7957f1] transition-colors mt-2 text-base font-black group"
              >
                Inicia sesión aquí
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}