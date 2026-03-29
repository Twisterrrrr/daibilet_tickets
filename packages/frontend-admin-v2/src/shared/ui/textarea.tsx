import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[100px] w-full rounded-card border border-border-soft bg-surface px-3 py-3 text-body text-text-primary placeholder:text-text-muted',
        'transition-colors hover:border-border',
        'focus-visible:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
        'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';
