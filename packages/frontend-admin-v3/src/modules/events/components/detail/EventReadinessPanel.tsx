import { Badge } from '@/components/ui/badge';
import type { AdminEventSummary } from '@/modules/events/api/summary';

function isBlockerCode(code: string): boolean {
  return (
    code === 'MISSING_IMAGE' ||
    code === 'MISSING_DESCRIPTION' ||
    code === 'MISSING_LOCATION' ||
    code === 'INVALID_VENUE' ||
    code === 'NO_FUTURE_SESSIONS' ||
    code === 'END_DATE_PASSED' ||
    code === 'MISSING_ACTIVE_OFFER' ||
    code === 'NO_VALID_PRICE' ||
    code === 'MISSING_PRIMARY_SUBCATEGORY' ||
    code === 'TOO_MANY_SUBCATEGORIES'
  );
}

export function EventReadinessPanel({ readiness }: { readiness: AdminEventSummary['readiness'] }) {
  const blockers = readiness.issues.filter((i) => i.severity === 'error' || isBlockerCode(i.code));
  const warnings = readiness.issues.filter((i) => i.severity === 'warning' && !isBlockerCode(i.code));

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="text-sm font-medium">Готовность к публикации</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Статус:</span>
        <Badge variant={readiness.status === 'READY' ? 'success' : readiness.status === 'BLOCKED' ? 'danger' : 'warning'}>
          {readiness.status === 'READY'
            ? 'Готово'
            : readiness.status === 'BLOCKED'
              ? 'Блокируется'
              : 'Нужна доработка'}
        </Badge>
        <span className="tabular-nums text-muted-foreground">оценка {readiness.score}</span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs font-medium uppercase text-destructive">Блокеры</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {blockers.length ? (
              blockers.slice(0, 12).map((i) => (
                <li key={i.code}>
                  <span className="font-mono text-xs text-foreground">{i.code}</span> — {i.message}
                </li>
              ))
            ) : (
              <li>Нет критичных блокеров по текущим правилам</li>
            )}
          </ul>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">Предупреждения</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {warnings.length ? (
              warnings.slice(0, 12).map((i) => (
                <li key={i.code}>
                  <span className="font-mono text-xs text-foreground">{i.code}</span> — {i.message}
                </li>
              ))
            ) : (
              <li>Нет дополнительных предупреждений</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
