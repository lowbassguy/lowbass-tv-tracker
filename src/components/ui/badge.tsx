import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/15 text-primary-foreground ring-primary/30',
        secondary: 'bg-secondary/60 text-secondary-foreground ring-border',
        outline: 'text-foreground ring-border',
        success: 'bg-success/15 text-success ring-success/30',
        warning: 'bg-warning/15 text-warning ring-warning/30',
        destructive: 'bg-destructive/15 text-destructive ring-destructive/30',
        crimson: 'bg-primary/20 text-primary-foreground ring-primary/40',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
