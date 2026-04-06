import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { Select } from '@/shared/ui/select-field';

const inputBase =
  'w-full rounded-control border border-border-soft bg-surface px-3 py-2 text-body text-text-primary placeholder:text-text-muted transition-colors hover:border-border focus-visible:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';

export function FieldSketch({
  label,
  placeholder,
  multiline,
  rows = 4,
  hint,
  variant = 'default',
  className,
}: {
  label: string;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  variant?: 'default' | 'title' | 'compact';
  className?: string;
}) {
  const sizeClass =
    variant === 'title'
      ? 'py-3 text-section font-semibold tracking-tight'
      : variant === 'compact'
        ? 'py-1.5 text-small'
        : '';

  const controlClass = cn(inputBase, sizeClass, multiline && 'min-h-[120px] resize-y', className);

  return (
    <div className="block space-y-1.5">
      <span className="text-label text-text-muted">{label}</span>
      {multiline ? (
        <textarea className={controlClass} placeholder={placeholder} readOnly rows={rows} aria-readonly />
      ) : (
        <input type="text" className={controlClass} placeholder={placeholder} readOnly aria-readonly />
      )}
      {hint ? <p className="text-[11px] leading-snug text-text-muted">{hint}</p> : null}
    </div>
  );
}

export function SelectSketch({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-label text-text-muted">{label}</span>
      <Select disabled className="opacity-90" aria-disabled>
        {children}
      </Select>
      {hint ? <p className="text-[11px] leading-snug text-text-muted">{hint}</p> : null}
    </div>
  );
}
