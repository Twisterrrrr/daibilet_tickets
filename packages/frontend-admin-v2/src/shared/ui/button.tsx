import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-label font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-foreground shadow-none hover:bg-accent/92 active:bg-accent/88',
        secondary:
          'border border-border bg-surface text-text-primary hover:bg-surface-alt active:bg-surface-alt/80',
        ghost: 'text-text-secondary hover:bg-surface-alt hover:text-text-primary',
        destructive: 'bg-danger text-white hover:bg-danger/92 active:bg-danger/88',
      },
      size: {
        sm: 'h-9 px-3 text-[0.8125rem]',
        md: 'h-10 min-h-[var(--control-height)] px-4 text-label',
        lg: 'h-11 px-5 text-[0.8125rem]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = 'Button';
