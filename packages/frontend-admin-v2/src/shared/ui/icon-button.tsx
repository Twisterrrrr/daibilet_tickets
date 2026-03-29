import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-control text-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:pointer-events-none disabled:opacity-45 hover:bg-surface-alt hover:text-text-primary',
  {
    variants: {
      size: {
        sm: 'h-9 w-9',
        md: 'h-10 w-10',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size, type = 'button', ...props }, ref) => {
    return <button ref={ref} type={type} className={cn(iconButtonVariants({ size }), className)} {...props} />;
  },
);
IconButton.displayName = 'IconButton';
