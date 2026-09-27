// Custom 404 page with space/rocket illustration
// Página global de recurso no existente

"use client"

import Link from "next/link"
import { Rocket, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center relative overflow-hidden px-4 py-10">
      {/* Stars */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      {/* Planet (bottom-left) */}
      <div className="absolute bottom-[-80px] left-[-80px] w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] rounded-full gradient-brand opacity-30 blur-md" />
      <div className="absolute bottom-[-60px] left-[-60px] w-[190px] h-[190px] sm:w-[260px] sm:h-[260px] rounded-full gradient-brand-br opacity-60 blur-sm animate-float" />

      {/* Moon (top-right) */}
      <div className="absolute top-[-30px] right-[-30px] w-[100px] h-[100px] rounded-full bg-muted opacity-40 ring-1 ring-muted-foreground/20" />
      <div className="absolute top-[-20px] right-[-20px] w-[80px] h-[80px] rounded-full bg-muted-foreground/10" />
      <div className="absolute top-[-10px] right-[-10px] w-[60px] h-[60px] rounded-full bg-muted-foreground/5" />

      {/* Arc path from planet to moon */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400" preserveAspectRatio="none">
        <path d="M 60 320 Q 200 200 320 60" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.25" />
      </svg>

      {/* Rocket */}
      <div className="relative z-10 animate-rocket">
        <div className="p-4 sm:p-5 rounded-full gradient-ai-neon shadow-lg shadow-[var(--ai-neon-pink)]/30">
          <Rocket className="w-10 h-10 sm:w-14 sm:h-14 text-white" />
        </div>
      </div>

      {/* Text */}
      <div className="text-center z-10 mt-8 sm:mt-10 w-full max-w-md">
        <h1 className="text-6xl sm:text-8xl font-heading font-black text-transparent bg-clip-text gradient-brand leading-none mb-4">
          404
        </h1>
        <p className="text-lg sm:text-xl font-bold text-foreground mb-2 text-balance">
          ¡Oh no! Parece que saliste fuera de órbita
        </p>
        <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
          La página que buscas no existe o se fue a explorar otros rumbos del universo.
        </p>
        <Link href="/dashboard" className="inline-block w-full sm:w-auto">
          <Button className="w-full sm:w-auto min-h-10 gradient-brand-hover text-white border-0 gap-2 px-6">
            <Home className="w-4 h-4" />
            Volver al Dashboard
          </Button>
        </Link>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .animate-rocket {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}