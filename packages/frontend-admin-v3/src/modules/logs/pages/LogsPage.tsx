import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { adminApi } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

type AuditLogItem = {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  before: unknown | null;
  after: unknown | null;
  createdAt: string;
};

type AuditLogResponse = {
  items: AuditLogItem[];
  total: number;
  page: number;
  pages: number;
};

function toIsoDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function safeJson(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function LogsPage() {
  const [entity, setEntity] = useState('');
  const [entityId, setEntityId] = useState('');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(() => toIsoDateInput(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(() => toIsoDateInput(new Date()));
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const url = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('page', String(page));
    sp.set('limit', '50');
    if (entity.trim()) sp.set('entity', entity.trim());
    if (entityId.trim()) sp.set('entityId', entityId.trim());
    if (userId.trim()) sp.set('userId', userId.trim());
    if (action.trim()) sp.set('action', action.trim());
    if (q.trim()) sp.set('q', q.trim());
    if (from) sp.set('from', new Date(`${from}T00:00:00.000Z`).toISOString());
    if (to) sp.set('to', new Date(`${to}T23:59:59.999Z`).toISOString());
    return `/admin/audit?${sp.toString()}`;
  }, [action, entity, entityId, from, page, q, to, userId]);

  const qAudit = useQuery({
    queryKey: ['admin-logs-audit', url],
    queryFn: () => adminApi.get<AuditLogResponse>(url),
  });

  const items = qAudit.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Логи" subtitle="Аудит изменений в админке (MVP)" />

      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="space-y-1 text-xs">
          <div className="text-muted-foreground">Entity</div>
          <input
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            placeholder="например City"
          />
        </label>
        <label className="space-y-1 text-xs">
          <div className="text-muted-foreground">Entity ID</div>
          <input
            value={entityId}
            onChange={(e) => {
              setEntityId(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            placeholder="uuid / short"
          />
        </label>
        <label className="space-y-1 text-xs">
          <div className="text-muted-foreground">User ID</div>
          <input
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            placeholder="uuid"
          />
        </label>
        <label className="space-y-1 text-xs">
          <div className="text-muted-foreground">Action</div>
          <input
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            placeholder="CREATE/UPDATE/DELETE"
          />
        </label>
        <label className="space-y-1 text-xs">
          <div className="text-muted-foreground">Период</div>
          <div className="flex gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            />
          </div>
        </label>
        <label className="space-y-1 text-xs lg:col-span-1">
          <div className="text-muted-foreground">Поиск</div>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            placeholder="entity/id/action/userId"
          />
        </label>
      </div>

      {qAudit.isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : qAudit.isError ? (
        <p className="text-sm text-destructive">Ошибка загрузки</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Время</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Entity ID</th>
                <th className="px-3 py-2">User ID</th>
                <th className="px-3 py-2">Детали</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const expanded = expandedId === it.id;
                return (
                  <tr key={it.id} className="border-b align-top last:border-0">
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(it.createdAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{it.action}</td>
                    <td className="px-3 py-2">{it.entity}</td>
                    <td className="px-3 py-2 font-mono text-xs">{it.entityId}</td>
                    <td className="px-3 py-2 font-mono text-xs">{it.userId}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setExpandedId(expanded ? null : it.id)}
                      >
                        {expanded ? 'Скрыть' : 'Показать'} before/after
                      </button>
                      {expanded ? (
                        <div className="mt-2 grid gap-2 lg:grid-cols-2">
                          <div className="rounded-md border bg-background p-2">
                            <div className="mb-1 text-[11px] text-muted-foreground">before</div>
                            <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words text-[11px]">
                              {safeJson(it.before)}
                            </pre>
                          </div>
                          <div className="rounded-md border bg-background p-2">
                            <div className="mb-1 text-[11px] text-muted-foreground">after</div>
                            <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words text-[11px]">
                              {safeJson(it.after)}
                            </pre>
                          </div>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
            <div>
              Всего: {qAudit.data?.total ?? 0} · Стр. {qAudit.data?.page ?? 1}/{qAudit.data?.pages ?? 1}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border bg-background px-2 py-1 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </button>
              <button
                type="button"
                className="rounded-md border bg-background px-2 py-1 disabled:opacity-50"
                disabled={page >= (qAudit.data?.pages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogsPage;

