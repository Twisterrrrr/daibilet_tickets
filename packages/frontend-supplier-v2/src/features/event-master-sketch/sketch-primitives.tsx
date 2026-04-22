import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export function Badge({
  variant = 'default',
  className,
  children,
}: {
  variant?: 'default' | 'accent';
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-label font-medium transition-colors',
        variant === 'accent'
          ? 'border-accent/20 bg-accent/10 text-accent'
          : 'border-border-soft bg-surface-alt text-text-secondary',
        className,
      )}
    >
      {children}
    </span>
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md';
  }
>(({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-label font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:pointer-events-none disabled:opacity-45',
      variant === 'primary' && 'bg-accent text-accent-foreground shadow-none hover:bg-accent/92 active:bg-accent/88',
      variant === 'secondary' &&
        'border border-border bg-surface text-text-primary hover:bg-surface-alt active:bg-surface-alt/80',
      variant === 'ghost' && 'text-text-secondary hover:bg-surface-alt hover:text-text-primary',
      size === 'sm' && 'h-9 px-3 text-[0.8125rem]',
      size === 'md' && 'h-10 min-h-[var(--control-height)] px-4 text-label',
      className,
    )}
    {...props}
  />
));
Button.displayName = 'SketchButton';

export function Surface({
  padding = 'md',
  tone = 'default',
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  padding?: 'md' | 'none';
  tone?: 'default' | 'muted';
}) {
  return (
    <div
      className={cn(
        'rounded-card border border-border-soft bg-surface',
        padding === 'md' && 'p-6',
        tone === 'muted' && 'bg-surface-alt',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="text-section text-text-primary">{title}</h2>
      {description ? <p className="mt-1 max-w-2xl text-small text-text-secondary">{description}</p> : null}
    </div>
  );
}
