import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full min-h-[var(--control-height)] rounded-control border border-border-soft bg-surface px-3 py-2 text-body text-text-primary placeholder:text-text-muted',
        'transition-colors hover:border-border',
        'focus-visible:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
        'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';
