import * as React from 'react'
import { Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AiInsightCardProps {
  title?: string
  description?: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
  badgeText?: string
  variant?: 'default' | 'glow' | 'compact'
  className?: string
}

function AiInsightCard({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  badgeText,
  variant = 'default',
  className,
}: AiInsightCardProps) {
  const defaultIcon = (
    <Sparkles className="size-5 gradient-brand-text" aria-hidden="true" />
  )

  const containerStyles = cn(
    'flex flex-col gap-3',
    {
      'rounded-xl bg-card/90 backdrop-blur-md border border-accent/40 p-5': variant === 'default',
      'relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7957f1]/12 via-[#a6249d]/8 to-[#d93340]/5 border border-[#7957f1]/20 shadow-[var(--glow-brand)] transition-all duration-300 hover:border-[#7957f1]/35 hover:shadow-[0_12px_48px_rgba(121,87,241,0.28)] p-5 anim-up': variant === 'glow',
      'rounded-xl bg-muted/30 p-3': variant === 'compact',
    },
    className,
  )

  return (
    <div className={containerStyles}>
      {variant === 'glow' && (
        <>
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#7957f1]/12 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#d93340]/8 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#a6249d]/50 to-transparent pointer-events-none" aria-hidden="true" />
        </>
      )}
      {(badgeText || icon !== undefined || title) && (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {icon ?? defaultIcon}
          </div>
          <div className="flex-1 space-y-1">
            {badgeText && (
              <Badge variant="in-progress" className="mb-1">
                {badgeText}
              </Badge>
            )}
            {title && (
              <h4
                className={cn(
                  'font-heading font-semibold',
                  variant === 'glow' ? 'ai-glow-text' : 'text-foreground',
                )}
              >
                {title}
              </h4>
            )}
          </div>
        </div>
      )}
      {description && (
        <div className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <div className="pt-1">
          <Button
            onClick={onAction}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-md h-auto border-0",
              variant === "glow"
                ? "bg-gradient-to-r from-[#7957f1] to-[#a6249d] hover:opacity-90 hover:-translate-y-px transition-all duration-200"
                : "bg-gradient-to-r from-[#d93340] via-[#a6249d] to-[#7957f1] hover:brightness-110",
            )}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

export { AiInsightCard }
