import { BarChart3, Download } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { api } from '@/shared/lib/api';
import {
  EmptyState,
  ErrorPanel,
  FilterRow,
  LoadingBlock,
  PageHeader,
  SectionCard,
  StatTile,
} from '@/shared/ui/page-primitives';
import { PageGlyph } from '@/shared/ui/page-glyph';

function toIsoDate(d: Date | null): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

interface SalesReportRow {
  id: string;
  date?: string;
  shortCode?: string;
  customerName?: string;
  grossAmount?: number;
  platformFee?: number;
  supplierAmount?: number;
}

interface SalesReport {
  summary?: {
    totalOrders: number;
    grossRevenue: number;
    platformFee: number;
    netRevenue: number;
  };
  items?: SalesReportRow[];
}

export function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    api
      .get<SalesReport>(`/supplier/reports/sales?${params}`)
      .then(setData)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки отчёта');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const setPreset = (preset: 'today' | 'week' | 'month') => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    if (preset === 'today') {
      /* same day */
    } else if (preset === 'week') {
      const day = now.getDay() || 7;
      start.setDate(now.getDate() - (day - 1));
      end.setDate(start.getDate() + 6);
    } else if (preset === 'month') {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1, 0);
    }
    setFrom(toIsoDate(start));
    setTo(toIsoDate(end));
  };

  const exportHref = `/api/v1/supplier/reports/sales/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Отчёт о продажах"
        glyph={<PageGlyph icon={BarChart3} tone="amber" />}
        actions={
          <a
            href={exportHref}
            className="inline-flex items-center gap-2 rounded-control border border-border-soft bg-surface px-3 py-2 text-label font-medium hover:bg-surface-alt"
          >
            <Download className="h-4 w-4" />
            Скачать CSV
          </a>
        }
      />

      <FilterRow
        onReset={() => {
          setFrom('');
          setTo('');
        }}
      >
        <span className="text-small text-text-muted">Период:</span>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 rounded-control border border-border-soft px-2 text-small"
        />
        <span className="text-text-muted">—</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 rounded-control border border-border-soft px-2 text-small"
        />
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setPreset('today')}
            className="rounded-control border border-border-soft px-2 py-1 text-[11px] hover:bg-surface-alt"
          >
            Сегодня
          </button>
          <button
            type="button"
            onClick={() => setPreset('week')}
            className="rounded-control border border-border-soft px-2 py-1 text-[11px] hover:bg-surface-alt"
          >
            Неделя
          </button>
          <button
            type="button"
            onClick={() => setPreset('month')}
            className="rounded-control border border-border-soft px-2 py-1 text-[11px] hover:bg-surface-alt"
          >
            Месяц
          </button>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-control bg-accent px-3 py-1.5 text-label font-medium text-accent-foreground disabled:opacity-50"
        >
          {loading ? 'Загрузка…' : 'Обновить'}
        </button>
      </FilterRow>

      {error ? <ErrorPanel title="Ошибка загрузки отчёта" description={error} onRetry={load} /> : null}

      {loading && !data ? <LoadingBlock label="Загружаем отчёт…" /> : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Заказов" value={summary.totalOrders} />
          <StatTile
            label="Оборот"
            value={`${(summary.grossRevenue / 100).toLocaleString('ru-RU')} ₽`}
          />
          <StatTile
            label="Комиссия"
            value={`${(summary.platformFee / 100).toLocaleString('ru-RU')} ₽`}
          />
          <StatTile
            label="Ваш доход"
            value={`${(summary.netRevenue / 100).toLocaleString('ru-RU')} ₽`}
          />
        </div>
      ) : null}

      <SectionCard title="Строки отчёта">
        {!loading && (!data?.items || data.items.length === 0) ? (
          <EmptyState title="Нет данных" description="За выбранный период продаж не найдено." />
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="min-w-full text-small">
              <thead>
                <tr className="border-b border-border-soft text-left text-label text-text-muted">
                  <th className="px-2 py-2">Дата</th>
                  <th className="px-2 py-2">Заказ</th>
                  <th className="px-2 py-2">Клиент</th>
                  <th className="px-2 py-2 text-right">Сумма</th>
                  <th className="px-2 py-2 text-right">Комиссия</th>
                  <th className="px-2 py-2 text-right">Доход</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((item) => (
                  <tr key={item.id} className="border-b border-border-soft last:border-0">
                    <td className="px-2 py-2 text-text-secondary">
                      {item.date ? new Date(item.date).toLocaleDateString('ru-RU') : '—'}
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px] text-text-secondary">
                      {item.shortCode ?? '—'}
                    </td>
                    <td className="px-2 py-2 text-text-primary">{item.customerName || '—'}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {((item.grossAmount || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-danger">
                      -{((item.platformFee || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-success">
                      {((item.supplierAmount || 0) / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
