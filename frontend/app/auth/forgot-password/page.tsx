// Solicitud de recuperación de contraseña (RF-03)
"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiService } from "@/lib/api-service"
import { AuthErrorBanner } from "@/app/auth/auth-error-banner"
import { BrandLogo } from "@/app/auth/brand-logo"
import { EMAIL_PATTERN, MSG_EMAIL_INVALIDO } from "@/lib/validaciones"

const recuperarSchema = z.object({
  email: z.string().regex(EMAIL_PATTERN, MSG_EMAIL_INVALIDO),
})

type RecuperarFormValues = z.infer<typeof recuperarSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [enviado, setEnviado] = useState(false)

  const form = useForm<RecuperarFormValues>({
    resolver: zodResolver(recuperarSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (data: RecuperarFormValues) => {
    setIsLoading(true)
    setError("")
    try {
      await apiService.solicitarRecuperacion(data.email)
      setEnviado(true)
    } catch (err: any) {
      setError(err.message || "No pudimos procesar tu solicitud.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 text-foreground font-sans selection:bg-accent/30">
      <div className="w-full max-w-md space-y-8">
        <BrandLogo className="justify-center py-0" />

        {enviado ? (
          /* El mensaje es idéntico exista o no la cuenta: decir "ese correo no
             está registrado" permitiría averiguar quién tiene cuenta. */
          <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex justify-center">
              <div className="p-5 rounded-full bg-accent/10 border-2 border-accent/30">
                <MailCheck className="w-12 h-12 text-accent" />
              </div>
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Revisa tu correo</h1>
            <p className="text-muted-foreground leading-relaxed">
              Si el correo está registrado, recibirás un enlace para restablecer tu
              contraseña. Puede tardar un par de minutos en llegar.
            </p>
            <p className="text-xs text-muted-foreground/70">
              ¿No lo ves? Revisa tu carpeta de spam.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 font-medium transition-colors pt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <h1 className="font-heading text-2xl xl:text-3xl font-bold tracking-tight text-foreground">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="text-sm text-muted-foreground">
                Escribe tu correo institucional y te enviaremos un enlace para crear
                una nueva.
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
                      <FormLabel className="block text-xs font-medium text-muted-foreground">
                        Correo institucional
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="tucodigo@uni.pe"
                          className="w-full px-4 py-3 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all duration-200 h-auto"
                          {...field}
                        />
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
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</>
                  ) : (
                    "Enviarme el enlace"
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
