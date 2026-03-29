import { Search } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({ className, ...props }, ref) => {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        className={cn(
          'flex h-10 w-full min-h-[var(--control-height)] rounded-control border border-border-soft bg-surface py-2 pl-9 pr-3 text-body text-text-primary placeholder:text-text-muted',
          'transition-colors hover:border-border',
          'focus-visible:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
        )}
        {...props}
      />
    </div>
  );
});
SearchInput.displayName = 'SearchInput';
