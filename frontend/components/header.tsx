// Barra superior: buscador, notificaciones y menú de usuario
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Bell, User, LogOut } from "lucide-react"
import { HeaderSearch } from "./header-search"
import { ExplorarMenu } from "./explorar-menu"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { useAuth } from "@/components/providers/auth-context"

interface HeaderProps {
  onMenuClick: () => void
}

/** Iniciales del estudiante para el avatar. */
function iniciales(nombre?: string): string {
  if (!nombre) return "U"
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return "U"
  return (partes[0][0] + (partes[1]?.[0] ?? "")).toUpperCase()
}

/** Accesos directos del mockup, además del sidebar. */
const ACCESOS = [
  { label: "Mi aprendizaje", href: "/dashboard" },
  { label: "Mi malla", href: "/malla" },
  { label: "Recursos", href: "/recursos" },
]

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const nombre = user?.nombre_completo || "Estudiante"

  return (
    <header className="backdrop-blur-md sticky top-0 z-40 bg-[rgba(9,11,21,0.75)] rounded-2xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-300">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            aria-label="Abrir o cerrar el menú"
            className="md:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <HeaderSearch />
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Accesos directos. Duplican al sidebar a propósito: el mockup los
              pide arriba, y en pantallas donde el sidebar va colapsado son la
              única navegación con texto. */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Accesos rápidos">
            {ACCESOS.map((acceso) => {
              const activo =
                pathname === acceso.href ||
                (acceso.href !== "/" && pathname?.startsWith(acceso.href))
              return (
                <Link
                  key={acceso.href}
                  href={acceso.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
                    activo
                      ? "text-white bg-white/[0.08] shadow-[0_0_12px_rgba(121,87,241,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/[0.12]"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.07]",
                  )}
                >
                  {acceso.label}
                </Link>
              )
            })}
            <ExplorarMenu />
          </nav>

          {/* Sin punto de "no leídas": no hay fuente de notificaciones todavía
              y un indicador siempre encendido deja de significar algo. */}
          <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative rounded-full p-1.5 text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-white/[0.08] hover:shadow-[0_0_10px_rgba(121,87,241,0.15)]">
            <Bell className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full ring-2 ring-white/[0.08] transition-all duration-200 hover:ring-[#7957f1]/50 hover:shadow-[0_0_12px_rgba(121,87,241,0.25)]"
                aria-label={`Menú de ${nombre}`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="gradient-brand-br text-primary-foreground text-xs font-semibold">
                    {iniciales(user?.nombre_completo)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="gradient-brand-br text-primary-foreground text-sm font-semibold">
                    {iniciales(user?.nombre_completo)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                  {user?.codigo_estudiante && (
                    <p className="text-xs text-muted-foreground/70 truncate">
                      {user.codigo_estudiante}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/perfil">
                  <User className="w-4 h-4 mr-2" />
                  Mi perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
