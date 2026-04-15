import { Badge } from '@/components/ui/badge';
import type { HubReadinessIssue, HubReadinessSnapshot } from '@/types/hub-readiness';

const STATUS_LABEL: Record<HubReadinessSnapshot['status'], string> = {
  NOT_A_HUB: 'Не хаб',
  DRAFT: 'Черновик',
  NEEDS_WORK: 'Нужна работа',
  READY: 'Готов',
  BLOCKED: 'Заблокирован',
};

function severityClass(s: HubReadinessIssue['severity']): string {
  if (s === 'ERROR') return 'text-destructive';
  if (s === 'WARNING') return 'text-amber-800 dark:text-amber-200';
  return 'text-muted-foreground';
}

export function HubReadinessPanel({
  title,
  snapshot,
}: {
  title: string;
  snapshot: HubReadinessSnapshot | undefined | null;
}) {
  if (!snapshot) return null;

  const errors = snapshot.issues.filter((i) => i.severity === 'ERROR');
  const warnings = snapshot.issues.filter((i) => i.severity === 'WARNING');
  const infos = snapshot.issues.filter((i) => i.severity === 'INFO');

  return (
    <section className="rounded-lg border bg-muted/30 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{title}</span>
        <Badge variant="outline">{STATUS_LABEL[snapshot.status]}</Badge>
        <span className="text-xs text-muted-foreground">{snapshot.hubType.replace('_', ' ')}</span>
        {snapshot.score != null ? (
          <span className="text-muted-foreground">
            score <span className="font-mono">{snapshot.score}</span>/100
          </span>
        ) : null}
        {snapshot.isIndexableTarget ? (
          <Badge variant="success" className="text-xs">
            индексация OK
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            не цель индексации
          </Badge>
        )}
      </div>
      {snapshot.urls?.publicUrl ? (
        <div className="mt-2 text-xs text-muted-foreground">
          URL:{' '}
          <span className="font-mono break-all">{snapshot.urls.publicUrl}</span>
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <IssueColumn label="Блокеры" items={errors} empty="—" />
        <IssueColumn label="Предупреждения" items={warnings} empty="—" />
        <IssueColumn label="Инфо" items={infos} empty="—" />
      </div>
    </section>
  );
}

function IssueColumn({
  label,
  items,
  empty,
}: {
  label: string;
  items: HubReadinessIssue[];
  empty: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <ul className="mt-1 space-y-1">
        {items.length ? (
          items.map((i) => (
            <li key={i.code} className={`text-xs ${severityClass(i.severity)}`}>
              <span className="font-mono text-[10px] opacity-70">{i.code}</span> {i.title}
            </li>
          ))
        ) : (
          <li className="text-xs text-muted-foreground">{empty}</li>
        )}
      </ul>
    </div>
  );
}
