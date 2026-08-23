// UI primitive: button with CVA variants including neon
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-[#0a0d1e] border-2 border-[#5b8bf7] text-white shadow-[0_0_10px_rgba(91,139,247,0.2)] hover:shadow-[0_0_20px_rgba(91,139,247,0.5)] hover:bg-[#11172b] rounded-xl [text-shadow:-1px_0_0_#0ff,1px_0_0_#f00] tracking-wide font-bold',
        brand: 'bg-[#0a0d1e] border-2 border-[#7957f1] text-white shadow-[0_0_10px_rgba(121,87,241,0.2)] hover:shadow-[0_0_20px_rgba(121,87,241,0.5)] hover:bg-[#11172b] rounded-xl [text-shadow:-1px_0_0_#0ff,1px_0_0_#f00] tracking-wide font-bold',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'bg-transparent border-2 border-[#5b8bf7] text-white shadow-[0_0_10px_rgba(91,139,247,0.1)] hover:shadow-[0_0_20px_rgba(91,139,247,0.4)] hover:bg-[#5b8bf7]/10 rounded-xl tracking-wide font-bold',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl',
        ghost:
          'hover:bg-[#5b8bf7]/10 text-white rounded-xl font-bold',
        link: 'text-[#5b8bf7] underline-offset-4 hover:underline font-bold',
        neon: 'gradient-ai-neon text-white hover:opacity-90 shadow-lg shadow-[var(--ai-neon-magenta)]/30 border-0',
        'neon-outline': 'border-[var(--ai-neon-pink)] text-[var(--ai-neon-pink)] bg-[var(--ai-neon-magenta)]/10 hover:bg-[var(--ai-neon-magenta)]/20 hover:text-[var(--ai-neon-pink)]',

      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
