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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />

        <div className="relative z-10 text-center">
          <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center mb-8 mx-auto border border-white/30">
            <span className="text-white font-bold text-5xl">U</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">UniVia</h1>
          <p className="text-xl text-white/80 max-w-md mx-auto leading-relaxed">
            Comienza tu viaje hacia el éxito académico hoy
          </p>

          <div className="mt-16 space-y-6">
            {[
              { icon: "✨", title: "Configuración Rápida", desc: "Completa tu perfil en minutos" },
              { icon: "🚀", title: "Comienza Inmediatamente", desc: "Acceso instantáneo a tu dashboard" },
              { icon: "🎓", title: "Comunidad Estudiantil", desc: "Conecta con otros estudiantes" },
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

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">U</span>
            </div>
            <h1 className="text-2xl font-bold text-center text-foreground">UniVia</h1>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-foreground mb-2">Crear cuenta</h2>
            <p className="text-muted-foreground">Únete a miles de estudiantes en UniVia</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-6">
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
                    <FormLabel className="text-sm font-medium">Nombre Completo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Juan Pérez García"
                        type="text"
                        disabled={isLoading}
                        className="h-10 border-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

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
                        className="h-10 border-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Email */}
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
                        className="h-10 border-input"
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
                          className="h-10 border-input pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Password Requirements */}
              <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
                {passwordRequirements.map((req, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${req.met ? "text-green-500" : "text-gray-300"}`} />
                    <span className={`text-xs ${req.met ? "text-green-600" : "text-muted-foreground"}`}>
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
                    <FormLabel className="text-sm font-medium">Confirmar Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="••••••••"
                          type={showConfirmPassword ? "text" : "password"}
                          disabled={isLoading}
                          className="h-10 border-input pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Terms */}
              <div className="flex items-start gap-2 pt-2">
                <input type="checkbox" id="terms" className="w-4 h-4 rounded border border-input mt-0.5" />
                <label htmlFor="terms" className="text-xs text-muted-foreground">
                  Acepto los{" "}
                  <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                    Términos de Servicio
                  </Link>{" "}
                  y la{" "}
                  <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                    Política de Privacidad
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200 mt-4"
              >
                {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-muted-foreground">O regístrate con</span>
            </div>
          </div>

          {/* Social Signup */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-9 border-input hover:bg-secondary text-sm bg-transparent"
              disabled={isLoading}
            >
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-input hover:bg-secondary text-sm bg-transparent"
              disabled={isLoading}
            >
              Microsoft
            </Button>
          </div>

          {/* Login Link */}
          <p className="text-center text-xs text-muted-foreground mt-5">
            ¿Ya tienes cuenta?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
