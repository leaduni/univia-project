// Dashboard layout wrapper with sidebar and header
"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "./header"
import { useAuth } from "./providers/auth-context"
import { apiService } from "@/lib/api-service"

interface DashboardLayoutProps {
  children?: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [, setIsCollapsed] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const { user, session, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  // Una sola vez por montaje: evita repetir el prefetch ante cada evento de
  // auth (p. ej. TOKEN_REFRESHED al volver a la pestaña).
  const prefetchHecho = useRef(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("univia_sidebar_collapsed")
      if (saved !== null) {
        setIsCollapsed(saved === "true")
      } else {
        setIsCollapsed(true)
      }
    } catch (err) {
      console.error("Error reading sidebar preference:", err)
    }
  }, [])

  const handleToggle = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev
      try {
        localStorage.setItem("univia_sidebar_collapsed", String(nextState))
      } catch (err) {
        console.error("Error saving sidebar preference:", err)
      }
      return nextState
    })
  }

  useEffect(() => {
    if (isAuthLoading) return

    // Sin sesión ni usuario -> al login.
    if (!session && !user) {
      setIsRedirecting(true)
      router.replace("/auth/login")
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

  useEffect(() => {
    // Prefetch silencioso tras autenticarse: getMalla, getAvanceCarrera y
    // getRecursos quedan en la caché de api-service (con TTL), así que abrir
    // /malla o /recursos no espera la red. Fire-and-forget: un fallo aquí no
    // debe afectar la sesión.
    if (isAuthLoading || prefetchHecho.current) return
    if (!session || !user) return
    prefetchHecho.current = true
    apiService.getMalla().catch(() => {})
    apiService.getAvanceCarrera().catch(() => {})
    apiService.getRecursos({}).catch(() => {})
  }, [isAuthLoading, session, user])

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
    <div className="flex h-screen bg-[#0b0c16] text-[#e9e9ed] overflow-hidden">
      {/* Barra lateral colapsable */}

      {/* Contenido principal con transición suave */}
      <div className="relative flex-1 h-full min-w-0 overflow-hidden">
        <Header onMenuClick={handleToggle} />
        <main className="w-full h-full overflow-y-auto custom-scrollbar pt-20 px-4 pb-6">{children}</main>
      </div>
    </div>
  )
}
