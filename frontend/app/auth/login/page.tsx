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

const loginSchema = z.object({
  codigoUni: z.string().min(6, "Código UNI debe tener al menos 6 caracteres"),
  email: z.string().email("Email inválido").endsWith("@uni.edu.pe", "Email debe ser institucional"),
  password: z.string().min(8, "Contraseña debe tener al menos 8 caracteres"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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
    try {
      // Simulate login
      console.log("[v0] Login data:", data)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      // Redirect to dashboard
      window.location.href = "/"
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Visual/Logo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />

        {/* Logo & Brand */}
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center mb-8 mx-auto border border-white/30">
            <span className="text-white font-bold text-5xl">U</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">UniVia</h1>
          <p className="text-xl text-white/80 max-w-md mx-auto leading-relaxed">
            Tu compañera de ruta académica personalizada
          </p>

          {/* Features */}
          <div className="mt-16 space-y-6">
            {[
              { icon: "🎯", title: "Rutas Personalizadas", desc: "Caminos de aprendizaje ajustados a tu ritmo" },
              { icon: "📚", title: "Recursos Completos", desc: "Acceso a miles de materiales educativos" },
              { icon: "🤖", title: "Análisis con IA", desc: "Recomendaciones inteligentes de estudio" },
            ].map((feature, i) => (
              <div key={i} className="text-left">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{feature.icon}</span>
                  <div>
                    <p className="text-white font-semibold">{feature.title}</p>
                    <p className="text-white/60 text-sm">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">U</span>
            </div>
            <h1 className="text-2xl font-bold text-center text-foreground">UniVia</h1>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Bienvenido de vuelta</h2>
            <p className="text-muted-foreground">Inicia sesión en tu cuenta UniVia</p>
          </div>

          {/* Login Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Código UNI */}
              <FormField
                control={form.control}
                name="codigoUni"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Código UNI</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="202410001"
                        type="text"
                        disabled={isLoading}
                        className="h-11 border-input placeholder:text-muted-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Email Institucional */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Correo Institucional</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="nombre@uni.edu.pe"
                        type="email"
                        disabled={isLoading}
                        className="h-11 border-input placeholder:text-muted-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="••••••••"
                          type={showPassword ? "text" : "password"}
                          disabled={isLoading}
                          className="h-11 border-input pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Remember & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border border-input" />
                  <span className="text-sm text-muted-foreground">Recuérdame</span>
                </label>
                <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200"
              >
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-muted-foreground">O continúa con</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 border-input hover:bg-secondary bg-transparent"
              disabled={isLoading}
            >
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 border-input hover:bg-secondary bg-transparent"
              disabled={isLoading}
            >
              Microsoft
            </Button>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿No tienes cuenta?{" "}
            <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
