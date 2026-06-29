// Password input with show/hide toggle for auth forms
"use client"

import { useState } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import type { ControllerRenderProps, FieldPath, FieldValues } from "react-hook-form"
import { Input } from "@/components/ui/input"

interface PasswordFieldProps<T extends FieldValues> {
  field: ControllerRenderProps<T, FieldPath<T>>
  placeholder?: string
  className?: string
}

/**
 * Input de contraseña con icono de candado + botón de mostrar/ocultar.
 * Antes esta misma lógica (estado showPassword, botón, aria-label) estaba
 * copiada dos veces en signup.tsx y una vez más, sin aria-label, en
 * login.tsx. Ahora es un único componente con su propio estado interno,
 * usado igual en ambas pantallas.
 */
export function PasswordField<T extends FieldValues>({ field, placeholder }: PasswordFieldProps<T>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        className="h-12 pl-10 pr-11 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/50"
        {...field}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors active:scale-[0.92]"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  )
}