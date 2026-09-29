import * as React from 'react';

import { DataTableShell, EmptyState, PageHeader } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { listAudit } from '@/modules/audit/api/audit';
import type { AuditLogRowDto } from '@/modules/audit/types';
import { History, Search as SearchIcon } from 'lucide-react';

export function AuditLogPage() {
  return (
    <AuditLogInner />
  );
}

function AuditLogInner() {
  const [q, setQ] = React.useState('');
  const [entity, setEntity] = React.useState('');
  const [action, setAction] = React.useState('');
  const [rows, setRows] = React.useState<AuditLogRowDto[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listAudit({
          page: 1,
          limit: 50,
          q: q.trim() ? q.trim() : undefined,
          entity: entity.trim() ? entity.trim() : undefined,
          action: action.trim() ? action.trim() : undefined,
        });
        if (!cancelled) setRows(res.items);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, entity, action]);

  const showEmpty = !loading && !error && rows !== null && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Журнал изменений"
        description="Read-only аудит изменений в админке."
        actions={
          <Button size="sm" variant="outline" disabled>
            Экспорт (later)
          </Button>
        }
      />

      <Card className="mb-3 border-border p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-96">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: entity/entityId/action" className="h-9 border-border bg-background pl-8 text-sm" />
          </div>
          <Input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="entity (optional)" className="h-9 w-full border-border bg-background text-sm lg:w-56" />
          <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="action (optional)" className="h-9 w-full border-border bg-background text-sm lg:w-40" />
        </div>
      </Card>

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      <DataTableShell
        columns={['Когда', 'Action', 'Entity', 'EntityId', 'UserId']}
        loading={loading}
        empty={showEmpty ? <EmptyState icon={History} title="Записей нет" description="Попробуйте изменить фильтры." /> : null}
      >
        {(rows ?? []).map((r) => (
          <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
            <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString('ru-RU')}</td>
            <td className="px-4 py-3">
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                {r.action}
              </Badge>
            </td>
            <td className="px-4 py-3 text-sm">{r.entity}</td>
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.entityId}</td>
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.userId}</td>
          </tr>
        ))}
      </DataTableShell>
    </>
  );
}

