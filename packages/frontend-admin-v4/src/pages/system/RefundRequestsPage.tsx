import * as React from 'react';

import { DataTableShell, EmptyState, FilterBar, PageHeader } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { listRefundRequests } from '@/modules/refunds/api/refunds';
import type { RefundRequestAdminRowDto } from '@/modules/refunds/types';
import { RefreshCcw } from 'lucide-react';

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
      amount / 100,
    );
  } catch {
    return `${amount} ${currency}`;
  }
}

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const variant =
    s === 'COMPLETED' ? 'success' : s === 'REJECTED' || s === 'FAILED' ? 'destructive' : 'outline';
  return (
    <Badge variant={variant as any} className="font-normal">
      {status}
    </Badge>
  );
}

export function RefundRequestsPage() {
  const [status, setStatus] = React.useState('');
  const [rows, setRows] = React.useState<RefundRequestAdminRowDto[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listRefundRequests({
        page: 1,
        limit: 50,
        status: status.trim() ? status.trim() : undefined,
      });
      setRows(res.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [status]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listRefundRequests({
          page: 1,
          limit: 50,
          status: status.trim() ? status.trim() : undefined,
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
  }, [status]);

  const showEmpty = !loading && !error && rows !== null && rows.length === 0;

  return (
    <>
      <PageHeader
        title="Refund requests"
        description="Read-only список заявок на возврат (созданные пользователями и админами)."
      />

      <Card className="mb-3 border-border p-3">
        <FilterBar>
          <div className="w-full sm:w-64">
            <Input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="status (optional): CREATED/APPROVED/PROCESSING/COMPLETED/REJECTED/FAILED"
              className="h-9 border-border bg-background text-sm"
            />
          </div>
          <button
            type="button"
            onClick={reload}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-foreground hover:bg-secondary"
          >
            <RefreshCcw className="h-4 w-4" />
            Обновить
          </button>
        </FilterBar>
      </Card>

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      <DataTableShell
        columns={['Когда', 'Статус', 'Сумма', 'Причина', 'Источник', 'FulfillmentItem', 'CheckoutSession']}
        loading={loading}
        empty={
          showEmpty ? (
            <EmptyState
              title="Заявок нет"
              description="Если пользователь запросил возврат, он появится здесь."
            />
          ) : null
        }
      >
        {(rows ?? []).map((r) => (
          <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
            <td className="px-4 py-3 text-xs text-muted-foreground">
              {new Date(r.createdAt).toLocaleString('ru-RU')}
            </td>
            <td className="px-4 py-3">
              <StatusPill status={r.status} />
            </td>
            <td className="px-4 py-3 text-sm">{formatMoney(r.amount, r.currency)}</td>
            <td className="px-4 py-3 text-sm text-muted-foreground">{r.reason}</td>
            <td className="px-4 py-3">
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                {r.createdByType}
              </Badge>
            </td>
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.fulfillmentItemId}</td>
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.checkoutSessionId}</td>
          </tr>
        ))}
      </DataTableShell>
    </>
  );
}

