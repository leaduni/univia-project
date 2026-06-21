"use client"
import { LayoutDashboard, BookOpen, FileText, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface SidebarProps {
  open: boolean
}

export function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname()

  if (pathname?.startsWith("/onboarding") || pathname?.startsWith("/auth")) {
    return null
  }

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", id: "Dashboard", href: "/" },
    { icon: BookOpen, label: "Recursos", id: "Recursos", href: "/recursos" },
    { icon: User, label: "Perfil", id: "Perfil", href: "/perfil" },
  ]

  const getActiveItem = () => {
    const item = menuItems.find((m) => m.href === pathname)
    return item?.id || "Dashboard"
  }

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 hidden md:flex flex-col",
        open ? "w-64" : "w-20",
      )}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <img src="/logos/logo-simple.svg" alt="LEAD UNI Logo" className="w-10 h-10 object-contain" />
          </div>
          {open && <span className="font-poppins font-extrabold text-lg tracking-wide text-white">UniVia</span>}
        </div>
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
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {open && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer Section */}
      {open && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/60">v1.0.0</div>
        </div>
      )}
    </aside>
  )
}
