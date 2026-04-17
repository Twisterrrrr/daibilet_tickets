import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import {
  approveAdminModerationEvent,
  fetchAdminModerationCount,
  fetchAdminModerationQueue,
  rejectAdminModerationEvent,
  type ModerationQueueItem,
} from '@/modules/moderation/api/moderation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';

function readInt(v: string | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function ModerationPage() {
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();

  const [status, setStatus] = React.useState<string>('');
  const [sortBy, setSortBy] = React.useState<'created_desc' | 'trust_asc'>('trust_asc');
  const [page, setPage] = React.useState<number>(1);
  const limit = 25;

  const didInitFromUrl = React.useRef(false);
  React.useEffect(() => {
    if (didInitFromUrl.current) return;
    didInitFromUrl.current = true;
    setStatus(sp.get('status') ?? '');
    setSortBy((sp.get('sortBy') === 'created_desc' ? 'created_desc' : 'trust_asc') as 'created_desc' | 'trust_asc');
    setPage(readInt(sp.get('page'), 1));
  }, [sp]);

  React.useEffect(() => {
    if (!didInitFromUrl.current) return;
    const out = new URLSearchParams(sp);
    if (status) out.set('status', status);
    else out.delete('status');
    if (sortBy !== 'trust_asc') out.set('sortBy', sortBy);
    else out.delete('sortBy');
    if (page !== 1) out.set('page', String(page));
    else out.delete('page');
    if (out.toString() !== sp.toString()) setSp(out, { replace: true });
  }, [status, sortBy, page, sp, setSp]);

  const countQ = useQuery({
    queryKey: ['admin-moderation-count'],
    queryFn: () => fetchAdminModerationCount(),
    staleTime: 15_000,
  });

  const q = useQuery({
    queryKey: ['admin-moderation-queue', { status, sortBy, page, limit }],
    queryFn: () =>
      fetchAdminModerationQueue({
        status: status || undefined,
        sortBy: sortBy === 'trust_asc' ? 'trust_asc' : undefined,
        page,
        limit,
      }),
    staleTime: 10_000,
    placeholderData: (p) => p,
  });

  const approveM = useMutation({
    mutationFn: async (id: string) => approveAdminModerationEvent(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-moderation-queue'] });
      await qc.invalidateQueries({ queryKey: ['admin-moderation-count'] });
    },
  });

  const rejectM = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => rejectAdminModerationEvent(id, reason),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-moderation-queue'] });
      await qc.invalidateQueries({ queryKey: ['admin-moderation-count'] });
    },
  });

  if (q.isLoading && !q.data) return <LoadingState label="Загрузка очереди модерации…" />;
  if (q.isError) {
    const meta = q.error ? getAdminErrorDisplay(q.error) : null;
    return (
      <ErrorState
        title={meta?.title ?? 'Не удалось загрузить очередь'}
        description={meta?.description ?? meta?.rawMessage}
        onRetry={() => q.refetch()}
      />
    );
  }

  const items = q.data?.items ?? [];
  const totalPages = q.data?.pages ?? 1;
  const pending = countQ.data?.pending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Модерация"
        subtitle="Единая точка входа: очередь модерации событий (PENDING_REVIEW / AUTO_APPROVED)"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {pending != null ? (
              <Badge variant="outline" className="text-xs">
                pending: {pending}
              </Badge>
            ) : null}
            <Button type="button" variant="outline" onClick={() => { void q.refetch(); void countQ.refetch(); }}>
              Обновить
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">status</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">PENDING_REVIEW + AUTO_APPROVED</option>
              <option value="PENDING_REVIEW">PENDING_REVIEW</option>
              <option value="AUTO_APPROVED">AUTO_APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">sort</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
            >
              <option value="trust_asc">trust asc (приоритет)</option>
              <option value="created_desc">created desc</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">limit</span>
            <Input value={String(limit)} readOnly />
          </label>
        </div>
      </div>

      {(approveM.isError || rejectM.isError) ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {approveM.error instanceof Error ? approveM.error.message : rejectM.error instanceof Error ? rejectM.error.message : 'Ошибка'}
        </div>
      ) : null}

      <DataTableShell
        footer={
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Страница <span className="tabular-nums text-foreground">{page} / {Math.max(1, totalPages)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Назад
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Вперёд
              </Button>
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Тип</th>
                <th className="px-4 py-3 text-left">Событие</th>
                <th className="px-4 py-3 text-left">Поставщик</th>
                <th className="px-4 py-3 text-center">Статус</th>
                <th className="px-4 py-3 text-center">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Очередь пуста
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <ModerationRow
                    key={it.id}
                    it={it}
                    busy={approveM.isPending || rejectM.isPending}
                    onApprove={() => approveM.mutate(it.id)}
                    onReject={() => {
                      const reason = prompt('Причина отклонения', '') ?? '';
                      if (!reason.trim()) return;
                      rejectM.mutate({ id: it.id, reason: reason.trim() });
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}

function ModerationRow({
  it,
  busy,
  onApprove,
  onReject,
}: {
  it: ModerationQueueItem;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <tr className="border-b">
      <td className="px-4 py-3 align-top text-xs text-muted-foreground">
        <Badge variant="outline">EVENT</Badge>
      </td>
      <td className="px-4 py-3 align-top">
        <Link className="font-medium text-primary hover:underline" to={`/admin-v3/events/${it.id}`}>
          {it.title}
        </Link>
        <div className="mt-1 text-xs text-muted-foreground">
          {it.city?.name ?? '—'} · offers: {it._count?.offers ?? 0}
        </div>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">{it.slug}</div>
      </td>
      <td className="px-4 py-3 align-top text-xs">
        <div className="font-medium">
          {it.operator?.id ? (
            <Link className="hover:underline" to={`/admin-v3/suppliers/${encodeURIComponent(it.operator.id)}`}>
              {it.operator?.name ?? it.operator.id}
            </Link>
          ) : (
            (it.operator?.name ?? '—')
          )}
        </div>
        <div className="mt-1 text-muted-foreground">
          trust: {it.operator?.trustLevel ?? '—'}
        </div>
      </td>
      <td className="px-4 py-3 text-center align-top">
        <Badge variant="outline">{it.moderationStatus}</Badge>
      </td>
      <td className="px-4 py-3 text-center align-top">
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={busy} asChild>
            <Link to={`/admin-v3/events/${encodeURIComponent(it.id)}`}>Открыть</Link>
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onApprove}>
            Approve
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onReject}>
            Reject
          </Button>
        </div>
      </td>
    </tr>
  );
}

