"use client"

import { useState } from "react"
import { Search, Menu, Bell, Settings } from "lucide-react"
import Link from "next/link"
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
    <header className="bg-[#02072c]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40 text-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        {/* Left: Menu & Search */}
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden text-white hover:bg-white/10">
            <Menu className="w-5 h-5" />
          </Button>



          {/* Search Bar */}
          <div
            className={`relative flex-1 max-w-md hidden md:flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
              searchFocus ? "border-[#a6249d] bg-white/20" : "border-white/20 bg-white/10"
            }`}
          >
            <Search className="w-4 h-4 text-white/70" />
            <input
              type="text"
              placeholder="Buscar cursos, recursos..."
              className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-white/60"
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
            />
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#d93340] rounded-full border border-white" />
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
              <DropdownMenuItem asChild>
                <Link href="/perfil" className="flex items-center w-full cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  Mi Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500 cursor-pointer"
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
