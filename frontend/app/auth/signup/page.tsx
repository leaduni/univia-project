"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiService } from "@/lib/api-service"

const signupSchema = z
  .object({
    fullName: z.string().min(3, "Nombre debe tener al menos 3 caracteres"),
    codigoUni: z.string().min(6, "Código UNI debe tener al menos 6 caracteres"),
    email: z.string().email("Email inválido").endsWith("@uni.pe", "Email debe ser institucional"),
    password: z.string().min(8, "Contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

type SignupFormValues = z.infer<typeof signupSchema>

import { useRouter } from "next/navigation"

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      codigoUni: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const password = form.watch("password")
  const passwordRequirements = [
    { label: "Al menos 8 caracteres", met: password.length >= 8 },
    { label: "Letra mayúscula", met: /[A-Z]/.test(password) },
    { label: "Letra minúscula", met: /[a-z]/.test(password) },
    { label: "Número", met: /[0-9]/.test(password) },
  ]

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true)
    setError("")
    try {
      console.log("Starting signup for:", data.email)
      await apiService.signup({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        rol: 'estudiante'
      })

      // Redirect to onboarding after successful signup
      router.push("/onboarding")
    } catch (err: any) {
      console.error("Signup error:", err)
      setError(err.message || "Error al crear la cuenta. Por favor intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Visual/Logo */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#02072c] border-r border-white/5 flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:36px_36px]" />
        
        <div className="absolute top-20 right-20 w-72 h-72 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-magenta-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 text-center">
          <div className="inline-block mx-auto mb-8">
            <img src="/logos/logo-white.svg" alt="LEAD UNI Logo" className="h-16 object-contain rounded-lg" />
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-4 font-poppins tracking-tight">UniVia</h1>
          <p className="text-xl text-lilac/80 max-w-md mx-auto leading-relaxed font-poppins">
            Comienza tu viaje hacia el éxito académico hoy
          </p>

          <div className="mt-16 space-y-6">
            {[
              { icon: "✨", title: "Configuración Rápida", desc: "Completa tu perfil en minutos" },
              { icon: "🚀", title: "Comienza Inmediatamente", desc: "Acceso instantáneo a tu dashboard" },
              { icon: "🎓", title: "Comunidad Estudiantil", desc: "Conecta con otros estudiantes" },
            ].map((feature, i) => (
              <div key={i} className="text-left bg-[#030c40]/40 backdrop-blur-sm border border-white/5 p-4 rounded-xl max-w-sm mx-auto transition-all duration-300 hover:border-white/10 hover:bg-[#030c40]/60">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{feature.icon}</span>
                  <div>
                    <p className="text-white font-semibold">{feature.title}</p>
                    <p className="text-muted-foreground text-sm">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-8 bg-background overflow-y-auto relative">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:36px_36px]" />
        
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-block mx-auto mb-4">
              <img src="/logos/logo-white.svg" alt="LEAD UNI Logo" className="h-10 object-contain rounded" />
            </div>
            <h1 className="text-2xl font-extrabold text-center text-white font-poppins">UniVia</h1>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">Crear cuenta</h2>
            <p className="text-muted-foreground">Únete a miles de estudiantes en UniVia</p>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Signup Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white">Nombre Completo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Juan Pérez García"
                        type="text"
                        disabled={isLoading}
                        className="h-10 bg-[#02072c]/60 border-white/10 text-white placeholder:text-muted-foreground/40 focus:border-violet focus:ring-1 focus:ring-violet"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {/* Código UNI */}
              <FormField
                control={form.control}
                name="codigoUni"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white">Código UNI</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="202410001"
                        type="text"
                        disabled={isLoading}
                        className="h-10 bg-[#02072c]/60 border-white/10 text-white placeholder:text-muted-foreground/40 focus:border-violet focus:ring-1 focus:ring-violet"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white">Correo Institucional</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="nombre@uni.edu.pe"
                        type="email"
                        disabled={isLoading}
                        className="h-10 bg-[#02072c]/60 border-white/10 text-white placeholder:text-muted-foreground/40 focus:border-violet focus:ring-1 focus:ring-violet"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white">Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="••••••••"
                          type={showPassword ? "text" : "password"}
                          disabled={isLoading}
                          className="h-10 bg-[#02072c]/60 border-white/10 text-white placeholder:text-muted-foreground/40 pr-10 focus:border-violet focus:ring-1 focus:ring-violet"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {/* Password Requirements */}
              <div className="space-y-2 p-3 bg-[#02072c]/60 border border-white/5 rounded-lg">
                {passwordRequirements.map((req, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${req.met ? "text-green-400" : "text-white/20"}`} />
                    <span className={`text-xs ${req.met ? "text-green-300" : "text-muted-foreground"}`}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Confirm Password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white">Confirmar Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="••••••••"
                          type={showConfirmPassword ? "text" : "password"}
                          disabled={isLoading}
                          className="h-10 bg-[#02072c]/60 border-white/10 text-white placeholder:text-muted-foreground/40 pr-10 focus:border-violet focus:ring-1 focus:ring-violet"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {/* Terms */}
              <div className="flex items-start gap-2 pt-2">
                <input type="checkbox" id="terms" className="w-4 h-4 rounded border border-white/10 bg-[#02072c]/60 mt-0.5 accent-primary" />
                <label htmlFor="terms" className="text-xs text-muted-foreground">
                  Acepto los{" "}
                  <Link href="#" className="text-violet hover:text-lilac font-medium">
                    Términos de Servicio
                  </Link>{" "}
                  y la{" "}
                  <Link href="#" className="text-violet hover:text-lilac font-medium">
                    Política de Privacidad
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-primary hover:bg-[#bf2a51] text-white font-bold rounded-lg transition-all duration-200 mt-4 font-poppins tracking-wide shadow-sm"
              >
                {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-background text-muted-foreground">O regístrate con</span>
            </div>
          </div>

          {/* Social Signup */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-9 border-white/10 hover:bg-[#121b58] text-white bg-[#02072c]/40 hover:text-white text-sm"
              disabled={isLoading}
            >
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-white/10 hover:bg-[#121b58] text-white bg-[#02072c]/40 hover:text-white text-sm"
              disabled={isLoading}
            >
              Microsoft
            </Button>
          </div>

          {/* Login Link */}
          <p className="text-center text-xs text-muted-foreground mt-5">
            ¿Ya tienes cuenta?{" "}
            <Link href="/auth/login" className="text-violet hover:text-lilac font-bold transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
