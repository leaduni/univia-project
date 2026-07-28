// App header with search bar, notifications, and user menu
"use client"

import { useState } from "react"
import { Search, Menu, Bell, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { useAuth } from "@/components/providers/auth-context"
import { User, LogOut } from "lucide-react"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const [searchFocus, setSearchFocus] = useState(false)
  const { user, signOut } = useAuth()

  const userFullInitial = user?.nombre_completo?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "U"

  return (
    <header className="bg-[#0b0c16]/80 backdrop-blur-md border-b border-[#1d1b38] sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        {/* Left: Menu & Search */}
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>

          {/* Search Bar — pill with neon button */}
          <div className="relative flex-1 max-w-xl hidden md:flex items-center">
            <input
              type="text"
              placeholder="¿Qué curso quieres reforzar hoy?"
              className="w-full py-2.5 pl-5 pr-12 rounded-full bg-[#151428] border border-[#2d2959] text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#ec4899] transition-all"
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
            />
            <button
              type="button"
              aria-label="Buscar"
              className="absolute right-1.5 p-2 rounded-full bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white hover:opacity-90 transition-opacity shadow-md shadow-pink-500/20"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.foto_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'default'}`} />
                  <AvatarFallback>{userFullInitial}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user?.foto_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'default'}`} />
                  <AvatarFallback>{userFullInitial}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user?.nombre_completo || "Usuario"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
