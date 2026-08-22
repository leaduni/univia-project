// Dashboard layout wrapper with sidebar and header
"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { useAuth } from "./providers/auth-context"
import { apiService } from "@/lib/api-service"

interface DashboardLayoutProps {
  children?: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)
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
    <div className="flex h-screen bg-[#090b15] text-[#e9e9ed] overflow-hidden p-3 gap-3">
      {/* Barra lateral colapsable */}
      <Sidebar open={!isCollapsed} onToggle={handleToggle} />

      {/* Contenido principal con transición suave */}
      <div className="flex flex-col flex-1 h-full gap-3 min-w-0 overflow-hidden transition-all duration-300 ease-in-out">
        <Header onMenuClick={handleToggle} />
        <main className="flex-1 overflow-y-auto rounded-2xl custom-scrollbar p-1">{children}</main>
      </div>
    </div>
  )
}
