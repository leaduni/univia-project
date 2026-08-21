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
    <header className="bg-sidebar/80 backdrop-blur-md border-b border-sidebar-border sticky top-0 z-40">
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
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                    activo
                      ? "bg-accent/15 text-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
          <Button variant="ghost" size="icon" aria-label="Notificaciones">
            <Bell className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
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
