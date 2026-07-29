// Navegación lateral de la app
"use client"
import { Grid, FileText, User, GraduationCap } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"

interface SidebarProps {
  open: boolean
}

const MENU = [
  { icon: Grid, label: "Mi aprendizaje", id: "Dashboard", href: "/" },
  { icon: GraduationCap, label: "Mi malla", id: "Malla", href: "/malla" },
  { icon: FileText, label: "Recursos", id: "Recursos", href: "/recursos" },
  { icon: User, label: "Perfil", id: "Perfil", href: "/perfil" },
]

export function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname()

  if (pathname?.startsWith("/onboarding") || pathname?.startsWith("/auth")) {
    return null
  }

  const activo =
    MENU.find((m) => pathname === m.href || (m.href !== "/" && pathname?.startsWith(m.href)))?.id ||
    "Dashboard"

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 hidden md:flex flex-col",
        open ? "w-64" : "w-20",
      )}
    >
      <div className="p-4">
        <Logo compact={!open} />
      </div>

      <nav className="flex-1 p-4 space-y-1.5" aria-label="Navegación principal">
        {MENU.map((item) => {
          const Icon = item.icon
          const isActive = activo === item.id
          return (
            <Link
              key={item.id}
              href={item.href}
              // aria-current es lo que un lector de pantalla anuncia como
              // "página actual"; el color por sí solo no lo comunica.
              aria-current={isActive ? "page" : undefined}
              title={!open ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative",
                !open && "justify-center px-0",
                isActive
                  ? "bg-accent/15 border border-accent/40 text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent",
              )}
            >
              {/* Barra de marca en el borde: marca el activo aunque el sidebar
                  esté colapsado y no se lea la etiqueta. */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full gradient-brand" />
              )}
              <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-accent")} />
              {open && <span className="text-sm">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {open && (
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-muted-foreground/60">UniVia · v1.0.0</p>
        </div>
      )}
    </aside>
  )
}
