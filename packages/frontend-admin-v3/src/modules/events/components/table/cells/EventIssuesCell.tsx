import { cn } from '@/shared/lib/cn';

export function EventIssuesCell({
  issueCount,
  warningCount,
  readinessStatus,
  issues,
}: {
  issueCount?: number;
  warningCount?: number;
  readinessStatus?: 'READY' | 'NEEDS_WORK' | 'BLOCKED' | null;
  issues?: Array<{ code: string; label: string; severity: 'warning' | 'error' }>;
}) {
  const errors = issueCount ?? 0;
  const warnings = warningCount ?? 0;
  const total = errors + warnings;

  const tooltip =
    issues && issues.length
      ? issues
          .slice(0, 12)
          .map((i) => `${i.severity.toUpperCase()}: ${i.code} — ${i.label}`)
          .join('\n')
      : undefined;

  if (readinessStatus === 'READY' && total === 0) return <span className="text-muted-foreground">—</span>;

  const tone =
    readinessStatus === 'BLOCKED'
      ? 'bg-rose-600'
      : readinessStatus === 'NEEDS_WORK'
        ? 'bg-amber-500'
        : errors > 0
          ? 'bg-rose-600'
          : warnings > 0
            ? 'bg-amber-500'
            : 'bg-muted-foreground';

  return (
    <div className="flex items-center gap-2" title={tooltip}>
      <span
        className={cn(
          'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white tabular-nums',
          tone,
        )}
        aria-label={`Проблемы: ${total}`}
      >
        {total}
      </span>
    </div>
  );
}

