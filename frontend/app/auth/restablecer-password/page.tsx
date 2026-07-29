// Nueva contraseña tras abrir el enlace del correo (RF-03)
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiService } from "@/lib/api-service"
import { supabase } from "@/lib/supabase"
import { AuthErrorBanner } from "@/app/auth/auth-error-banner"
import { BrandLogo } from "@/app/auth/brand-logo"
import {
  MSG_PASSWORD_CORTA,
  MSG_PASSWORD_LARGA,
  MSG_PASSWORD_SIN_LETRA,
  MSG_PASSWORD_SIN_NUMERO,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  tieneLetra,
  tieneNumero,
} from "@/lib/validaciones"

// Mismas reglas que exige el backend al guardar la contraseña nueva.
const restablecerSchema = z.object({
  password: z.string()
    .min(PASSWORD_MIN_LENGTH, MSG_PASSWORD_CORTA)
    .max(PASSWORD_MAX_LENGTH, MSG_PASSWORD_LARGA)
    .refine(tieneLetra, MSG_PASSWORD_SIN_LETRA)
    .refine(tieneNumero, MSG_PASSWORD_SIN_NUMERO),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type RestablecerFormValues = z.infer<typeof restablecerSchema>

type EstadoEnlace = "verificando" | "valido" | "invalido"

export default function RestablecerPasswordPage() {
  const router = useRouter()
  const [estadoEnlace, setEstadoEnlace] = useState<EstadoEnlace>("verificando")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [listo, setListo] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  /**
   * Al abrir el enlace del correo, Supabase deja los tokens en el fragmento de
   * la URL y el cliente crea una sesión temporal por su cuenta. Esa sesión es
   * la que acredita al estudiante ante el backend: aquí solo hay que esperar a
   * que aparezca y avisar si el enlace ya venció.
   */
  useEffect(() => {
    let activo = true

    const { data: listener } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (!activo) return
      if (sesion) setEstadoEnlace("valido")
      else if (evento === "SIGNED_OUT") setEstadoEnlace("invalido")
    })

    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return
      if (data.session) {
        setEstadoEnlace("valido")
      } else {
        // El fragmento de la URL se procesa de forma asíncrona; se da un
        // margen antes de declarar el enlace inválido.
        setTimeout(() => {
          if (!activo) return
          supabase.auth.getSession().then(({ data: reintento }) => {
            if (!activo) return
            setEstadoEnlace(reintento.session ? "valido" : "invalido")
          })
        }, 1500)
      }
    })

    return () => {
      activo = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const form = useForm<RestablecerFormValues>({
    resolver: zodResolver(restablecerSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const onSubmit = async (data: RestablecerFormValues) => {
    setIsLoading(true)
    setError("")
    try {
      await apiService.restablecerPassword(data.password)
      setListo(true)
      // La sesión de recuperación no debe quedar activa: el estudiante entra
      // de nuevo con su contraseña nueva.
      await supabase.auth.signOut()
      setTimeout(() => router.push("/auth/login"), 2500)
    } catch (err: any) {
      setError(err.message || "No se pudo actualizar la contraseña.")
    } finally {
      setIsLoading(false)
    }
  }

  const inputClase =
    "w-full px-4 py-3 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all duration-200 pr-10 h-auto"

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 text-foreground font-sans selection:bg-accent/30">
      <div className="w-full max-w-md space-y-8">
        <BrandLogo className="justify-center py-0" />

        {estadoEnlace === "verificando" && (
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
            <p className="text-sm text-muted-foreground">Verificando tu enlace...</p>
          </div>
        )}

        {estadoEnlace === "invalido" && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-5 rounded-full bg-destructive/10 border-2 border-destructive/30">
                <ShieldAlert className="w-12 h-12 text-destructive" />
              </div>
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Enlace no válido</h1>
            <p className="text-muted-foreground leading-relaxed">
              Este enlace ya venció o se usó antes. Solicita uno nuevo para continuar.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block w-full py-3 px-4 gradient-login-btn text-primary-foreground font-semibold rounded-xl text-sm transition-all duration-200"
            >
              Pedir un enlace nuevo
            </Link>
          </div>
        )}

        {estadoEnlace === "valido" && listo && (
          <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex justify-center">
              <div className="p-5 rounded-full bg-accent/10 border-2 border-accent/30">
                <CheckCircle2 className="w-12 h-12 text-accent" />
              </div>
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Contraseña actualizada
            </h1>
            <p className="text-muted-foreground">
              Ya puedes iniciar sesión con tu contraseña nueva.
            </p>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full gradient-brand animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground">Llevándote al inicio de sesión...</p>
          </div>
        )}

        {estadoEnlace === "valido" && !listo && (
          <>
            <div className="space-y-2 text-center">
              <h1 className="font-heading text-2xl xl:text-3xl font-bold tracking-tight text-foreground">
                Crea tu contraseña nueva
              </h1>
              <p className="text-sm text-muted-foreground">
                Debe tener al menos {PASSWORD_MIN_LENGTH} caracteres, con letras y números.
              </p>
            </div>

            {error && <AuthErrorBanner message={error} />}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-xs font-medium text-muted-foreground">
                        Contraseña nueva
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="••••••••"
                            className={inputClase}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-xs font-medium text-muted-foreground">
                        Repite la contraseña
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirm ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="••••••••"
                            className={inputClase}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  className="w-full py-3.5 px-4 gradient-login-btn text-primary-foreground font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-accent/20 active:scale-[0.99] h-auto"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</>
                  ) : (
                    "Guardar contraseña"
                  )}
                </Button>
              </form>
            </Form>

            <div className="text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
