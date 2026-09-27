// Establecer una contraseña manual para cuentas creadas con Google SSO.
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { AuthErrorBanner } from "@/app/auth/auth-error-banner"
import { apiService } from "@/lib/api-service"
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

const schema = z
  .object({
    passwordNueva: z
      .string()
      .min(PASSWORD_MIN_LENGTH, MSG_PASSWORD_CORTA)
      .max(PASSWORD_MAX_LENGTH, MSG_PASSWORD_LARGA)
      .refine(tieneLetra, MSG_PASSWORD_SIN_LETRA)
      .refine(tieneNumero, MSG_PASSWORD_SIN_NUMERO),
    confirmar: z.string(),
  })
  .refine((d) => d.passwordNueva === d.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  })

type Valores = z.infer<typeof schema>

const INPUT =
  "w-full px-4 py-2.5 bg-input border border-border rounded-xl text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all pr-12 h-auto"

export function EstablecerPasswordForm({ onPasswordSet }: { onPasswordSet?: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")
  const [listo, setListo] = useState(false)
  const [verPassword, setVerPassword] = useState(false)

  const form = useForm<Valores>({
    resolver: zodResolver(schema),
    defaultValues: { passwordNueva: "", confirmar: "" },
  })

  const onSubmit = async (datos: Valores) => {
    setEnviando(true)
    setError("")
    try {
      await apiService.establecerPassword(datos.passwordNueva)
      setListo(true)
      form.reset()
      onPasswordSet?.()
      // Los campos se limpian de inmediato; el aviso se retira solo.
      setTimeout(() => setListo(false), 5000)
      setAbierto(false)
    } catch (err: any) {
      setError(err.message || "No se pudo asignar la contraseña.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="border-t border-border pt-6">
      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="font-heading text-base sm:text-lg font-bold text-foreground">
            Establecer contraseña para acceso en PCs públicas
          </h2>
          <p className="text-xs text-muted-foreground">
            Si creaste tu cuenta con Google, puedes asignar una clave manual para ingresar desde
            cualquier equipo.
          </p>
        </div>
        {!abierto && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto shrink-0"
            onClick={() => {
              setAbierto(true)
              setError("")
            }}
          >
            <KeyRound className="w-4 h-4 mr-2" />
            Establecer contraseña
          </Button>
        )}
      </div>

      {listo && (
        <div className="flex items-center gap-2 text-sm text-emerald-500 mb-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Clave asignada. Ya puedes ingresar manualmente.</span>
        </div>
      )}

      {error && <AuthErrorBanner message={error} />}

      {abierto && (
        <div className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="passwordNueva"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      Contraseña nueva
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={verPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className={INPUT}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setVerPassword((v) => !v)}
                          aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          className="absolute right-1 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          {verPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-destructive" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      Repite la contraseña nueva
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className={INPUT}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-destructive" />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
                <Button type="submit" variant="brand" size="sm" className="w-full sm:w-auto" disabled={enviando}>
                  {enviando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (
                    "Establecer contraseña"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={enviando}
                  onClick={() => {
                    setAbierto(false)
                    setError("")
                    form.reset()
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  )
}