"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { useAuth } from "./providers/auth-context"

interface DashboardLayoutProps {
  children?: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const { user, session, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthLoading) return

    // Sin sesión ni usuario -> al login.
    if (!session && !user) {
      setIsRedirecting(true)
      router.push("/auth/login")
      return
    }

    // Onboarding incompleto -> al wizard de onboarding.
    const onboardingCompletado =
      user?.onboarding_completado || user?.estudiante?.onboarding_completado

    if (user && !onboardingCompletado) {
      setIsRedirecting(true)
      router.push("/onboarding")
    }
  }, [session, user, isAuthLoading, router])

  // isRedirecting evita que el contenido del dashboard se alcance a
  // renderizar por un instante antes de que router.push() complete la
  // navegación (parpadeo de contenido que el usuario no debería ver).
  if (isAuthLoading || isRedirecting || (!session && !user)) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex items-center justify-center h-screen bg-background"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <span className="sr-only">Cargando tu sesión…</span>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Barra lateral */}
      <Sidebar open={sidebarOpen} />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen((open) => !open)} />
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  )
}