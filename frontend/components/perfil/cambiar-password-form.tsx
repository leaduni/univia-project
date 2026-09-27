// Cambio de contraseña desde el perfil (RF-PRF-03)
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
  MSG_PASSWORD_VACIA,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  tieneLetra,
  tieneNumero,
} from "@/lib/validaciones"

// Mismas reglas que exige el backend, más las dos comprobaciones propias de
// un cambio: que la nueva no repita la actual y que se confirme bien.
const schema = z
  .object({
    passwordActual: z.string().min(1, MSG_PASSWORD_VACIA),
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
  .refine((d) => d.passwordNueva !== d.passwordActual, {
    message: "La contraseña nueva debe ser distinta de la actual.",
    path: ["passwordNueva"],
  })

type Valores = z.infer<typeof schema>

const INPUT =
  "w-full px-4 py-2.5 bg-input border border-border rounded-xl text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all pr-12 h-auto"

export function CambiarPasswordForm() {
  const [abierto, setAbierto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")
  const [listo, setListo] = useState(false)
  const [verPassword, setVerPassword] = useState(false)

  const form = useForm<Valores>({
    resolver: zodResolver(schema),
    defaultValues: { passwordActual: "", passwordNueva: "", confirmar: "" },
  })

  const onSubmit = async (datos: Valores) => {
    setEnviando(true)
    setError("")
    try {
      await apiService.cambiarPassword(datos.passwordActual, datos.passwordNueva)
      setListo(true)
      form.reset()
      // Los campos se limpian de inmediato; el aviso se retira solo.
      setTimeout(() => setListo(false), 5000)
      setAbierto(false)
    } catch (err: any) {
      setError(err.message || "No se pudo actualizar tu contraseña.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="border-t border-border pt-6">
      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="font-heading text-base sm:text-lg font-bold text-foreground">Seguridad</h2>
          <p className="text-xs text-muted-foreground">
            Cambia tu contraseña. Te pediremos la actual para confirmar que eres tú.
          </p>
        </div>
        {!abierto && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setAbierto(true)
              setError("")
            }}
            className="w-full sm:w-auto shrink-0"
          >
            <KeyRound className="w-4 h-4 mr-2" />
            Cambiar
          </Button>
        )}
      </div>

      {listo && (
        <p className="flex items-center gap-2 text-xs text-accent mt-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Tu contraseña se actualizó.
        </p>
      )}

      {abierto && (
        <div className="mt-4 space-y-4">
          {error && <AuthErrorBanner message={error} />}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="passwordActual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      Contraseña actual
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className={INPUT}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-destructive" />
                  </FormItem>
                )}
              />

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
                    "Guardar contraseña"
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
