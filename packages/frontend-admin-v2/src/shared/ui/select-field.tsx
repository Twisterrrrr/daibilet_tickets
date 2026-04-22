import { forwardRef, type SelectHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full min-h-[var(--control-height)] appearance-none rounded-control border border-border-soft bg-surface px-3 pr-9 text-body text-text-primary',
          'transition-colors hover:border-border',
          'focus-visible:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
          'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-text-muted" />
    </div>
  );
});
Select.displayName = 'Select';
