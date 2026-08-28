// Callback de autenticación OAuth (Google SSO).
// Supabase restaura la sesión al volver a esta ruta; el AuthProvider ya la
// detecta y carga el perfil (GET /usuarios/me) en `user`. Aquí solo se decide
// el destino según el estado de onboarding.
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { BrandLogo } from "@/app/auth/brand-logo"
import { useAuth } from "@/components/providers/auth-context"

export default function AuthCallbackPage() {
  const router = useRouter()
  const { user, session, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    // Sin sesión (p. ej. cancelación o error de Google) -> login.
    if (!session) {
      router.replace("/auth/login")
      return
    }

    // Onboarding pendiente -> al wizard (prellena con los datos de la sesión
    // que ya tiene el AuthProvider). Completado -> al dashboard.
    const onboardingCompletado =
      user?.onboarding_completado ?? user?.estudiante?.onboarding_completado ?? false

    router.replace(onboardingCompletado ? "/dashboard" : "/onboarding")
  }, [isLoading, session, user, router])

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center text-foreground">
      <div className="mb-8">
        <BrandLogo />
      </div>
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
        <p>Completando tu autenticación…</p>
      </div>
    </div>
  )
}