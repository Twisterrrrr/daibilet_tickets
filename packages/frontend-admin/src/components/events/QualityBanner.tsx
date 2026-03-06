import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import type { EventQuality, EventQualityIssue, QualityTabKey } from '@/api/adminEventsQuality';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Props = {
  quality: EventQuality | null;
  loading: boolean;
  error: string | null;
  isImported?: boolean;
  onIssueClick: (tabKey: QualityTabKey, issue: EventQualityIssue) => void;
};

export function QualityBanner({ quality, loading, error, isImported, onIssueClick }: Props) {
  const issues = quality?.issues ?? [];

  const blockingCount = issues.filter((i) => i.severity === 'BLOCKING').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING').length;

  if (loading) {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        Проверка готовности…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/5 p-3 text-sm text-destructive">
        Не удалось загрузить проверку готовности: {error}
      </div>
    );
  }

  if (!quality) return null;

  const ok = blockingCount === 0;
  const header = ok ? 'Готовность: OK' : `Не готово: ${blockingCount} проблем`;

  const hasScheduleIssues = issues.some((i) => i.tabKey === 'schedule');

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          )}

          <div>
            <div className="text-sm font-medium">{header}</div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Причины: {issues.length}</span>
              {warningCount > 0 && <Badge variant="secondary">Warning: {warningCount}</Badge>}
            <Badge variant={quality.isSellable ? 'outline' : 'destructive'}>
              Готово к продаже: {quality.isSellable ? 'Да' : 'Нет'}
            </Badge>
            </div>

            {isImported && hasScheduleIssues && (
              <div className="mt-2 text-xs text-muted-foreground">
                Сеансы импортируются из источника и здесь доступны только для просмотра.
              </div>
            )}
          </div>
        </div>

        {issues.length > 0 && (
          <details className="w-full text-xs sm:w-auto">
            <summary className="cursor-pointer select-none text-primary underline-offset-2 hover:underline">
              Показать причины
            </summary>
            <ul className="mt-2 space-y-1">
              {issues.map((issue) => (
                <li key={`${issue.code}:${issue.field ?? ''}`} className="flex items-start gap-2">
                  <span
                    className={[
                      'mt-1 inline-flex h-2 w-2 rounded-full',
                      issue.severity === 'BLOCKING' ? 'bg-destructive' : 'bg-amber-400',
                    ].join(' ')}
                  />
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-left text-xs"
                    onClick={() => onIssueClick(issue.tabKey, issue)}
                  >
                    {issue.message}
                  </Button>
                  {issue.ownership && (
                    <span
                      className="mt-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-border bg-muted px-1 text-[9px] font-medium text-muted-foreground"
                      title={issue.ownership === 'local' ? 'Редакция' : 'Источник'}
                    >
                      {issue.ownership === 'local' ? 'L' : 'S'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

