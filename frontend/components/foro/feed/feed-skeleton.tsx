"use client"

// Skeletons de la lista del feed (Fase 5): mismas proporciones que PostCard.

export function FeedSkeleton({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/10 bg-card/80 p-4 sm:p-5 anim-up"
          style={{ animationDelay: `${i * 45}ms` }}
        >
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/10" />
            <div className="flex-1 space-y-2.5">
              <div className="h-3 w-2/5 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-full animate-pulse rounded bg-white/5" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-white/5" />
              <div className="flex gap-2 pt-1">
                <div className="h-6 w-14 animate-pulse rounded-lg bg-white/5" />
                <div className="h-6 w-14 animate-pulse rounded-lg bg-white/5" />
                <div className="h-6 w-14 animate-pulse rounded-lg bg-white/5" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
