// Barra superior: buscador, notificaciones y menú de usuario
"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Menu, Bell, User, LogOut } from "lucide-react"
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

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth()
  const [busqueda, setBusqueda] = useState("")

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

          <div className="relative flex-1 max-w-xl hidden md:flex items-center">
            <label htmlFor="buscador-cursos" className="sr-only">
              Buscar un curso
            </label>
            <input
              id="buscador-cursos"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="¿Qué curso quieres reforzar hoy?"
              className="w-full py-2.5 pl-5 pr-12 rounded-full bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all"
            />
            <button
              type="button"
              aria-label="Buscar"
              className="absolute right-1.5 p-2 rounded-full gradient-login-btn text-primary-foreground transition-opacity shadow-md shadow-accent/20"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
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
