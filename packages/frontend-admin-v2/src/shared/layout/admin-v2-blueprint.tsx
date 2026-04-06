import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import type { AdminV2BlueprintSpec } from '@/shared/config/admin-v2-blueprints';
import { cn } from '@/shared/lib/cn';

/**
 * Раскрывающийся блок: какие шаги интеграции с бэкендом ожидаются для экрана.
 */
export function IntegrationBlueprint({
  screen,
  steps,
  defaultOpen = false,
}: AdminV2BlueprintSpec & { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className="rounded-card border border-dashed border-border-soft bg-surface-alt/25 shadow-none"
      aria-label={`План интеграции: ${screen}`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-alt/50"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">План интеграции</p>
          <p className="mt-0.5 text-small font-medium text-text-primary">{screen}</p>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-text-muted transition-transform', open && 'rotate-180')}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open ? (
        <ol className="list-decimal space-y-3 border-t border-border-soft/70 px-4 py-4 pl-9 text-small text-text-secondary">
          {steps.map((s, i) => (
            <li key={i} className="pl-1">
              <span className="font-medium text-text-primary">{s.title}</span>
              {s.detail ? <span className="mt-1 block text-text-muted leading-relaxed">{s.detail}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
