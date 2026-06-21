"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiService } from "@/lib/api-service"

const loginSchema = z.object({
  codigoUni: z.string().optional(),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Contraseña demasiado corta"),
})

type LoginFormValues = z.infer<typeof loginSchema>

import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")


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
      const response = await apiService.login({
        email: data.email,
        password: data.password
      })
      console.log("Login successful:", response)
      // Redirect to dashboard
      router.push("/")
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Error al iniciar sesión. Verifica tus credenciales.")
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
        
        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-magenta-500/10 rounded-full blur-3xl" />

        {/* Logo & Brand */}
        <div className="relative z-10 text-center">
          <div className="inline-block mx-auto mb-8">
            <img src="/logos/logo-white.svg" alt="LEAD UNI Logo" className="h-16 object-contain rounded-lg" />
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-4 font-poppins tracking-tight">UniVia</h1>
          <p className="text-xl text-lilac/80 max-w-md mx-auto leading-relaxed font-poppins">
            Tu compañera de ruta académica personalizada
          </p>

          {/* Features */}
          <div className="mt-16 space-y-6">
            {[
              { icon: "🎯", title: "Rutas Personalizadas", desc: "Caminos de aprendizaje ajustados a tu ritmo" },
              { icon: "📚", title: "Recursos Completos", desc: "Acceso a miles de materiales educativos" },
              { icon: "🤖", title: "Análisis con IA", desc: "Recomendaciones inteligentes de estudio" },
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

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-8 bg-background relative overflow-hidden">
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
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Bienvenido de vuelta</h2>
            <p className="text-muted-foreground">Inicia sesión en tu cuenta UniVia</p>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Login Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                        className="h-11 bg-[#02072c]/60 border-white/10 text-white placeholder:text-muted-foreground/40 focus:border-violet focus:ring-1 focus:ring-violet"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {/* Email Institucional */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white">Correo Institucional</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="nombre@uni.pe"
                        type="email"
                        disabled={isLoading}
                        className="h-11 bg-[#02072c]/60 border-white/10 text-white placeholder:text-muted-foreground/40 focus:border-violet focus:ring-1 focus:ring-violet"
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
                          className="h-11 bg-[#02072c]/60 border-white/10 text-white placeholder:text-muted-foreground/40 pr-10 focus:border-violet focus:ring-1 focus:ring-violet"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {/* Remember & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border border-white/10 bg-[#02072c]/60 accent-primary" />
                  <span className="text-sm text-muted-foreground">Recuérdame</span>
                </label>
                <Link href="/auth/forgot-password" className="text-sm text-violet hover:text-lilac font-medium transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-primary hover:bg-[#bf2a51] text-white font-bold rounded-lg transition-all duration-200 font-poppins tracking-wide shadow-sm"
              >
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-background text-muted-foreground">O continúa con</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 border-white/10 hover:bg-[#121b58] text-white bg-[#02072c]/40 hover:text-white"
              disabled={isLoading}
            >
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 border-white/10 hover:bg-[#121b58] text-white bg-[#02072c]/40 hover:text-white"
              disabled={isLoading}
            >
              Microsoft
            </Button>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿No tienes cuenta?{" "}
            <Link href="/auth/signup" className="text-violet hover:text-lilac font-bold transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
