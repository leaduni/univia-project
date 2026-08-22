// Navegación lateral de la app colapsable y armónica
"use client"
import { Grid, FileText, User, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"

interface SidebarProps {
  open: boolean
  onToggle?: () => void
}

const MENU = [
  { icon: Grid, label: "Mi aprendizaje", id: "Dashboard", href: "/dashboard" },
  { icon: GraduationCap, label: "Mi malla", id: "Malla", href: "/malla" },
  { icon: FileText, label: "Recursos", id: "Recursos", href: "/recursos" },
  { icon: User, label: "Perfil", id: "Perfil", href: "/perfil" },
]

export function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname()

  if (pathname?.startsWith("/onboarding") || pathname?.startsWith("/auth")) {
    return null
  }

  const activo =
    MENU.find((m) => pathname === m.href || (m.href !== "/dashboard" && pathname?.startsWith(m.href)))?.id ||
    "Dashboard"

  return (
    <aside
      className={cn(
        "bg-[rgba(9,11,21,0.80)] backdrop-blur-xl text-[#e9e9ed] border-r border-white/[0.07] shadow-[4px_0_24px_rgba(0,0,0,0.4),1px_0_0_rgba(255,255,255,0.04)] transition-all duration-300 ease-in-out hidden md:flex flex-col relative z-20 shrink-0",
        open ? "w-64" : "w-20",
      )}
    >
      {/* Header del Sidebar con Logo y Botón Toggle */}
      <div className={cn("p-4 flex items-center justify-between min-h-[64px] mb-2 pb-4 border-b border-white/[0.07]", !open && "justify-center px-2")}>
        <Logo compact={!open} />
        {open && onToggle && (
          <button
            onClick={onToggle}
            className="h-8 w-8 rounded-lg bg-[#232532] border border-[#3f424d]/60 text-muted-foreground hover:text-foreground hover:border-primary/50 flex items-center justify-center transition-all duration-200"
            title="Colapsar menú"
            aria-label="Colapsar menú lateral"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Botón Toggle centrado cuando está colapsado */}
      {!open && onToggle && (
        <div className="px-2 pt-3 flex justify-center">
          <button
            onClick={onToggle}
            className="h-8 w-8 rounded-lg bg-[#232532] border border-[#3f424d]/60 text-muted-foreground hover:text-foreground hover:border-primary/50 flex items-center justify-center transition-all duration-200"
            title="Expandir menú"
            aria-label="Expandir menú lateral"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navegación principal */}
      <nav className="flex-1 p-3 space-y-1.5" aria-label="Navegación principal">
        {MENU.map((item) => {
          const Icon = item.icon
          const isActive = activo === item.id
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={!open ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground/70 transition-all duration-200 relative group font-sans text-sm font-medium",
                !open && "justify-center px-0 group/item",
                isActive
                  ? "text-white bg-gradient-to-r from-[#7957f1]/20 to-[#a6249d]/10 border border-[#7957f1]/25 shadow-[0_0_16px_rgba(121,87,241,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "hover:text-foreground hover:bg-white/[0.07] hover:shadow-[0_0_12px_rgba(121,87,241,0.1)]",
              )}
            >
              {/* Barra de acento de marca activa */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-gradient-to-b from-[#d93340] via-[#a6249d] to-[#7957f1] shadow-[0_0_8px_rgba(121,87,241,0.5)]" />
              )}
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-all duration-200 group-hover:scale-110",
                  isActive
                    ? "text-[#c4b5fd] drop-shadow-[0_0_6px_rgba(121,87,241,0.6)]"
                    : "text-muted-foreground/70 group-hover:text-foreground",
                )}
              />
              {open && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer del Sidebar */}
      {open ? (
        <div className="p-4 border-t border-[#3f424d]/30">
          <p className="text-[11px] text-[#e9e9ed]/40 tracking-wider">UniVia · v1.0.0</p>
        </div>
      ) : (
        <div className="p-3 border-t border-[#3f424d]/30 text-center">
          <span className="text-[9px] text-[#e9e9ed]/40 font-bold">v1.0</span>
        </div>
      )}
    </aside>
  )
}
