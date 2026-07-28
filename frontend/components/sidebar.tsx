// App sidebar navigation with collapsible menu
"use client"
import { Grid, BookOpen, FileText, User, GraduationCap } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"

interface SidebarProps {
  open: boolean
}

export function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname()

  if (pathname?.startsWith("/onboarding") || pathname?.startsWith("/auth")) {
    return null
  }

  const menuItems = [
    { icon: Grid, label: "Mi aprendizaje", id: "Dashboard", href: "/" },
    { icon: GraduationCap, label: "Mi Malla", id: "Malla", href: "/malla" },
    { icon: FileText, label: "Recursos", id: "Recursos", href: "/recursos" },
    { icon: User, label: "Perfil", id: "Perfil", href: "/perfil" },
  ]

  const getActiveItem = () => {
    const item = menuItems.find((m) => pathname === m.href || (m.href !== "/" && pathname.startsWith(m.href)))
    return item?.id || "Dashboard"
  }

  return (
    <aside
      className={cn(
        "bg-[#0b0c16] text-white border-r border-[#1d1b38] transition-all duration-300 hidden md:flex flex-col",
        open ? "w-64" : "w-20",
      )}
    >
      {/* Logo Section */}
      <div className="p-4">
        <Logo />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = getActiveItem() === item.id
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-[#ec4899]/20 to-[#8b5cf6]/20 border border-[#ec4899]/40 text-white font-medium shadow-lg shadow-pink-500/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-[#ec4899]" : ""}`} />
              {open && <span className="brand-wordmark text-xs">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer Section */}
      {open && (
          <div className="p-4 border-t border-[#1d1b38]">
          <div className="text-xs text-white/30">v1.0.0</div>
        </div>
      )}
    </aside>
  )
}