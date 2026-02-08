"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { useAuth } from "./providers/auth-context"

interface DashboardLayoutProps {
  children?: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, session, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthLoading) return;

    // In mock mode, we might have a user but no session
    if (!session && !user) {
      console.log("DashboardLayout: No session or user found, redirecting to /auth/login");
      router.push("/auth/login")
      return;
    }

    // Check if onboarding is completed
    const onboardingCompletado = user?.onboarding_completado || user?.estudiante?.onboarding_completado;

    console.log("DashboardLayout check:", { user, onboardingCompletado });

    if (user && !onboardingCompletado) {
      console.log("DashboardLayout: Onboarding not completed, redirecting to /onboarding");
      router.push("/onboarding")
    }
  }, [session, user, isAuthLoading, router])

  if (isAuthLoading || (!session && !user)) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  )
}
