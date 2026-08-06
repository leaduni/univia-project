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
    'flex flex-col gap-3 rounded-xl',
    {
      'bg-card/90 backdrop-blur-md border border-accent/40 p-5': variant === 'default',
      'bg-card/90 backdrop-blur-md border border-accent/40 p-5 ai-glow': variant === 'glow',
      'bg-muted/30 p-3': variant === 'compact',
    },
    className,
  )

  return (
    <div className={containerStyles}>
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
            className="bg-gradient-to-r from-[#d93340] via-[#a6249d] to-[#7957f1] px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-md hover:brightness-110 h-auto border-0"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

export { AiInsightCard }