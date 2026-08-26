// Barra superior: buscador, notificaciones y menú de usuario
"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Bell, User, LogOut } from "lucide-react"
import { HeaderSearch } from "./header-search"
import { ExplorarMenu } from "./explorar-menu"
import { Logo } from "./logo"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

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
  const [isAtTop, setIsAtTop] = useState(true)
  const [isHidden, setIsHidden] = useState(false)
  const ultimoScroll = useRef(0)

  const nombre = user?.nombre_completo || "Estudiante"

  useEffect(() => {
    const main = document.querySelector("main")

    const manejarScroll = (event: Event) => {
      const posicion =
        event.currentTarget === main
          ? main.scrollTop
          : window.scrollY

      setIsAtTop(posicion === 0)
      setIsHidden(posicion > ultimoScroll.current && posicion > 0)
      ultimoScroll.current = posicion
    }

    const posicionInicial = main?.scrollTop ?? window.scrollY
    setIsAtTop(posicionInicial === 0)
    ultimoScroll.current = posicionInicial

    window.addEventListener("scroll", manejarScroll, { passive: true })
    main?.addEventListener("scroll", manejarScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", manejarScroll)
      main?.removeEventListener("scroll", manejarScroll)
    }
  }, [])

  return (
    <header
      className={cn(
        "absolute top-3 left-0 right-0 z-50 w-[calc(100%-2rem)] mx-auto transition-all duration-300 ease-out",
        isHidden
          ? "-translate-y-28 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100",
        isAtTop
          ? "rounded-2xl backdrop-blur-xl bg-[rgba(11,12,22,0.85)] border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          : "rounded-2xl backdrop-blur-xl bg-[rgba(11,12,22,0.75)] border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
      )}
    >
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

          <div className="md:hidden">
            <Logo compact />
          </div>
          <div className="hidden md:block">
            <Logo />
          </div>

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
                  <AvatarImage src={user?.avatar_url} alt={user?.nombre_completo} />
                  <AvatarFallback className="gradient-brand-br text-primary-foreground text-xs font-semibold">
                    {iniciales(user?.nombre_completo)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user?.avatar_url} alt={user?.nombre_completo} />
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
