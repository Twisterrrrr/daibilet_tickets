import * as React from 'react';
import { Activity, AlertTriangle, CheckCircle2, ListChecks, RefreshCw, Zap } from 'lucide-react';

import { DataTableShell, EmptyState, InfoNote, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  enqueueFullSync,
  enqueueTcSync,
  enqueueTepSync,
  getFullSyncProgress,
  getSyncQueueDetails,
  getSyncStatus,
} from '@/modules/import-sources/api/sync-health';
import type { SyncProgressDto, SyncQueueDetailsDto, SyncStatusDto } from '@/modules/import-sources/types';

const JOB_FULL = 'singleton_sync_full';
const JOB_TEP = 'singleton_sync_tep';
const JOB_TC = 'singleton_sync_tc';

function isActiveState(p: SyncProgressDto | null): boolean {
  return p?.state === 'active' || p?.state === 'waiting' || p?.state === 'delayed' || p?.state === 'paused';
}

function formatDateTime(value?: string | number | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ru-RU');
}

function progressStatus(progress: SyncProgressDto | null): 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error' {
  if (!progress) return 'draft';
  if (progress.state === 'completed') return 'live';
  if (progress.state === 'failed') return 'error';
  if (isActiveState(progress)) return 'ready';
  return 'draft';
}

function progressLabel(progress: SyncProgressDto | null): string {
  return progress?.state ?? 'нет данных';
}

function stringifyReturnValue(value: unknown): string {
  if (value == null) return '-';
  if (typeof value === 'string') return value;
  try {
    const text = JSON.stringify(value);
    return text.length > 180 ? text.slice(0, 177) + '...' : text;
  } catch {
    return String(value);
  }
}

export function SyncHealthPage() {
  const [status, setStatus] = React.useState<SyncStatusDto | null>(null);
  const [queue, setQueue] = React.useState<SyncQueueDetailsDto | null>(null);
  const [progressFull, setProgressFull] = React.useState<SyncProgressDto | null>(null);
  const [progressTep, setProgressTep] = React.useState<SyncProgressDto | null>(null);
  const [progressTc, setProgressTc] = React.useState<SyncProgressDto | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [syncStarting, setSyncStarting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, q, pf, pt, pc] = await Promise.all([
        getSyncStatus(),
        getSyncQueueDetails(),
        getFullSyncProgress(JOB_FULL),
        getFullSyncProgress(JOB_TEP),
        getFullSyncProgress(JOB_TC),
      ]);
      setStatus(s);
      setQueue(q);
      setProgressFull(pf);
      setProgressTep(pt);
      setProgressTc(pc);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!isActiveState(progressFull) && !isActiveState(progressTep) && !isActiveState(progressTc)) return;

    const timer = window.setInterval(() => {
      Promise.all([getFullSyncProgress(JOB_FULL), getFullSyncProgress(JOB_TEP), getFullSyncProgress(JOB_TC)])
        .then(([pf, pt, pc]) => {
          setProgressFull(pf);
          setProgressTep(pt);
          setProgressTc(pc);
        })
        .catch(() => undefined);
    }, 2_000);

    return () => window.clearInterval(timer);
  }, [progressFull, progressTep, progressTc]);

  const activeJobs = (queue?.counts.active ?? 0) + (queue?.counts.waiting ?? 0) + (queue?.counts.delayed ?? 0);

  async function start(kind: 'full' | 'tep' | 'tc-fast') {
    setError('');
    setSyncStarting(true);
    try {
      if (kind === 'full') await enqueueFullSync();
      if (kind === 'tep') await enqueueTepSync();
      if (kind === 'tc-fast') await enqueueTcSync('fast');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка запуска sync');
    } finally {
      setSyncStarting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Sync health"
        description="Очередь импорта и ручной запуск поставщиков. Для Ticketscloud основной MVP-сценарий — быстрый публичный gRPC sync без тихого отката в долгий REST."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => start('tc-fast')} disabled={syncStarting}>
              <Zap className="mr-2 h-4 w-4" />
              TC fast
            </Button>
            <Button size="sm" variant="outline" onClick={() => start('tep')} disabled={syncStarting}>
              TEP sync
            </Button>
            <Button size="sm" variant="outline" onClick={() => start('full')} disabled={syncStarting}>
              Full sync
            </Button>
            <Button size="sm" variant="ghost" onClick={load} disabled={loading} aria-label="Обновить">
              <RefreshCw className={cnSpin(loading)} />
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <InfoNote>
          `TC fast` синхронизирует только публичные события Ticketscloud. `Full sync` оставлен для диагностики и плановых прогонов: он тяжелее,
          потому что включает TC, Teplohod, retag и связанные обновления витрины.
        </InfoNote>
      </div>

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      <div className="mb-3 grid gap-3 lg:grid-cols-2">
        <Card className="border-border p-4">
          <div className="text-sm font-medium">Каталог</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <KV label="Последний sync" value={formatDateTime(status?.lastSyncAt)} />
            <KV label="События" value={status ? `${status.events.active}/${status.events.total}` : '-'} />
            <KV label="Сеансы" value={status ? `${status.sessions.active}/${status.sessions.total}` : '-'} />
            <KV label="Активные job" value={queue ? String(activeJobs) : '-'} />
          </div>
        </Card>

        <Card className="border-border p-4">
          <div className="text-sm font-medium">Очередь sync</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <QueueBadge label="active" value={queue?.counts.active ?? 0} />
            <QueueBadge label="waiting" value={queue?.counts.waiting ?? 0} />
            <QueueBadge label="delayed" value={queue?.counts.delayed ?? 0} />
            <QueueBadge label="completed" value={queue?.counts.completed ?? 0} />
            <QueueBadge label="failed" value={queue?.counts.failed ?? 0} />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            jobIds: <span className="font-mono">{JOB_FULL}</span>, <span className="font-mono">{JOB_TEP}</span>,{' '}
            <span className="font-mono">{JOB_TC}</span>
          </div>
        </Card>
      </div>

      <div className="mb-3 grid gap-3 lg:grid-cols-3">
        <ProgressCard title="TC fast" hint="Ticketscloud public gRPC" progress={progressTc} icon={Zap} />
        <ProgressCard title="TEP sync" hint="Teplohod.info events + sessions" progress={progressTep} icon={CheckCircle2} />
        <ProgressCard title="Full sync" hint="Диагностический тяжелый прогон" progress={progressFull} icon={AlertTriangle} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <DataTableShell
          columns={['Активная job', 'name', 'attempts', 'timestamp']}
          loading={loading}
          empty={!loading ? <EmptyState icon={Activity} title="Активных задач нет" description="Очередь sync сейчас пустая." /> : null}
        >
          {(queue?.active ?? []).map((j) => (
            <tr key={String(j.id)} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="px-4 py-3 font-mono text-xs">{String(j.id ?? '-')}</td>
              <td className="px-4 py-3 text-sm">{j.name}</td>
              <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{j.attemptsMade}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(j.timestamp)}</td>
            </tr>
          ))}
        </DataTableShell>

        <DataTableShell
          columns={['Failed job', 'name', 'reason']}
          loading={loading}
          empty={!loading ? <EmptyState icon={ListChecks} title="Ошибок нет" description="Неуспешных sync job не видно." /> : null}
        >
          {(queue?.failed ?? []).map((j) => (
            <tr key={String(j.id)} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="px-4 py-3 font-mono text-xs">{String(j.id ?? '-')}</td>
              <td className="px-4 py-3 text-sm">{j.name}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{j.failedReason ?? '-'}</td>
            </tr>
          ))}
        </DataTableShell>
      </div>
    </>
  );
}

function cnSpin(loading: boolean): string {
  return loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4';
}

function ProgressCard({
  title,
  hint,
  progress,
  icon: Icon,
}: {
  title: string;
  hint: string;
  progress: SyncProgressDto | null;
  icon: React.ElementType;
}) {
  return (
    <Card className="border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
        </div>
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={progressStatus(progress)} label={progressLabel(progress)} />
        {progress?.failedReason ? (
          <Badge variant="outline" className="border-destructive/20 bg-destructive/5 font-normal text-destructive">
            failed
          </Badge>
        ) : null}
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <div>started: {formatDateTime(progress?.processedOn)}</div>
        <div>finished: {formatDateTime(progress?.finishedOn)}</div>
        {progress?.message ? <div className="truncate">message: {progress.message}</div> : null}
        {progress?.failedReason ? <div className="text-destructive">reason: {progress.failedReason}</div> : null}
        {progress?.returnvalue ? <div className="truncate">result: {stringifyReturnValue(progress.returnvalue)}</div> : null}
      </div>
    </Card>
  );
}

function QueueBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <Badge variant="outline" className="border-border font-normal text-muted-foreground">
      {label}: {value}
    </Badge>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-muted px-2.5 py-2">
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}
