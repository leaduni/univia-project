// Dashboard right sidebar — donut, achievements list, quick access (prototype-aligned)
"use client"
import { Award, Lock, Zap, Search, BookOpen, Flag, Flame, Trophy } from "lucide-react"

interface RightSidebarProps {
  stats?: any
  achievements?: any[]
  isLoading?: boolean
}

export function RightSidebar({ stats, achievements = [], isLoading }: RightSidebarProps) {
  const pct = stats?.porcentajeProgreso ?? 0
  const completed = stats?.cursosCompletados ?? 0
  const total = stats?.totalCursos ?? 30
  const r = 50
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return (
    <div className="space-y-6">
      {/* Career Progress Donut — horizontal layout */}
      <div className="bg-[#151428] border border-[#262444] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Avance de carrera</h3>
        {isLoading ? (
          <div className="flex items-center gap-4">
            <div className="w-[120px] h-[120px] rounded-full bg-white/5 animate-pulse shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-8 w-16 bg-white/10 animate-pulse rounded" />
              <div className="h-4 w-32 bg-white/5 animate-pulse rounded" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
              <circle cx="60" cy="60" r={r} fill="none" stroke="#262444" strokeWidth="10" />
              <circle
                cx="60" cy="60" r={r}
                fill="none" stroke="url(#donutGrad)" strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
              <defs>
                <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a6249d" />
                  <stop offset="100%" stopColor="#7957f1" />
                </linearGradient>
              </defs>
            </svg>
            <div>
              <div className="text-2xl font-bold text-white">{pct}%</div>
              <div className="text-xs text-white/50 mt-1">{completed} de {total} créditos aprobados</div>
            </div>
          </div>
        )}
      </div>

      {/* Achievements List — neon badges by index */}
      <div className="bg-[#151428] border border-[#262444] rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-white text-base">Tus logros</h3>
          <span className="text-xs text-slate-400 font-medium">
            {isLoading ? "..." : `${unlockedCount} de ${achievements.length}`}
          </span>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 bg-white/10 animate-pulse rounded" />
                  <div className="h-2 w-32 bg-white/5 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {achievements.slice(0, 4).map((a, i) => {
              const isUnlocked = a.unlocked
              const badgeColors = [
                { bg: "bg-fuchsia-600", shadow: "shadow-fuchsia-600/20", icon: Flag },
                { bg: "bg-purple-600", shadow: "shadow-purple-600/20", icon: Flame },
                { bg: "bg-violet-600", shadow: "shadow-violet-600/20", icon: Zap },
                { bg: "bg-[#1d1b38]", shadow: "", icon: Trophy, lockedBorder: "border border-[#2d2a52]" },
              ]
              const color = badgeColors[i % badgeColors.length]
              const Icon = color.icon

              return (
                <div key={a.id} className={`flex items-center gap-3 ${isUnlocked ? "" : "opacity-40"}`}>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isUnlocked
                        ? `${color.bg} ${color.shadow} shadow-lg`
                        : `${color.lockedBorder || "bg-[#1d1b38] border border-[#2d2a52]"}`
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isUnlocked ? "text-white" : "text-slate-500"}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{a.nombre}</h4>
                    <p className="text-xs text-slate-400">{a.descripcion}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Access */}
      <div className="bg-[#151428] border border-[#262444] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-3">Acceso rápido</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
            <Zap className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
            <span className="text-sm text-white/80">Generar evaluación con IA</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
            <Search className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span className="text-sm text-white/80">Buscar exámenes pasados</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
            <BookOpen className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm text-white/80">Revisar mi malla</span>
          </button>
        </div>
      </div>
    </div>
  )
}
