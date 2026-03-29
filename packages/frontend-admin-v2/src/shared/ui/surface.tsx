import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

const surfaceVariants = cva('rounded-card border border-border-soft bg-surface', {
  variants: {
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
    tone: {
      default: '',
      muted: 'bg-surface-alt',
    },
  },
  defaultVariants: {
    padding: 'md',
    tone: 'default',
  },
});

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof surfaceVariants> {}

export function Surface({ className, padding, tone, ...props }: SurfaceProps) {
  return <div className={cn(surfaceVariants({ padding, tone }), className)} {...props} />;
}
