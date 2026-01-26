"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

interface DashboardLayoutProps {
  children?: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    console.log("DashboardLayout: Checking auth...");
    const user = localStorage.getItem("user")
    const token = localStorage.getItem("token")
    console.log("DashboardLayout: user present?", !!user, "token present?", !!token);

    if (!user || !token) {
      console.log("DashboardLayout: No auth found, redirecting to /auth/login");
      router.push("/auth/login")
    } else {
      console.log("DashboardLayout: Auth found, stopping check");
      setIsCheckingAuth(false)
    }
  }, [router])

  if (isCheckingAuth) {
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
