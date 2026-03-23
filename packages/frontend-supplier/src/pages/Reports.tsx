import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  DateRangePicker,
  type DateRange,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
} from '@daibilet/shared-ui';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { api } from '../lib/api';

function toIsoDate(d: Date | null): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (range.from) params.set('from', toIsoDate(range.from));
    if (range.to) params.set('to', toIsoDate(range.to));
    api
      .get<any>(`/supplier/reports/sales?${params}`)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((e: any) => {
        setError(e.message ?? 'Ошибка загрузки отчёта');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatRangeLabel = () => {
    if (!range.from && !range.to) return '';
    const format = (d: Date | null) => (d ? d.toLocaleDateString('ru') : '…');
    if (range.from && !range.to) return `С ${format(range.from)}`;
    if (!range.from && range.to) return `До ${format(range.to)}`;
    return `${format(range.from)} — ${format(range.to)}`;
  };

  const setPresetRange = (preset: 'today' | 'week' | 'month') => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (preset === 'today') {
      // from = today, to = today
    } else if (preset === 'week') {
      const day = now.getDay() || 7; // Monday=1..Sunday=7
      start.setDate(now.getDate() - (day - 1));
      end.setDate(start.getDate() + 6);
    } else if (preset === 'month') {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1, 0);
    }

    const newRange: DateRange = { from: start, to: end };
    setRange(newRange);
    setTimeout(load, 0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Отчёт о продажах"
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`/api/v1/supplier/reports/sales/export?from=${toIsoDate(range.from)}&to=${toIsoDate(range.to)}`}>
              <Download className="h-4 w-4" /> Скачать CSV
            </a>
          </Button>
        }
      />

      <SectionCard>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <p className="mb-1 text-xs text-gray-500">Период</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-lg border bg-background p-0.5">
                <Button type="button" variant="ghost" size="sm" onClick={() => setPresetRange('today')} className="h-8 px-3 text-xs">
                  Сегодня
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPresetRange('week')} className="h-8 px-3 text-xs">
                  Неделя
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPresetRange('month')} className="h-8 px-3 text-xs">
                  Месяц
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowPicker(true)} className="h-8 px-3 text-xs">
                  Выбрать период
                </Button>
              </div>
              {formatRangeLabel() && (
                <span className="text-xs text-muted-foreground">
                  Выбрано: <span className="font-medium text-foreground">{formatRangeLabel()}</span>
                </span>
              )}
            </div>
          </div>
          <Button onClick={load} size="sm" className="mt-2 md:mt-0" disabled={loading}>
            {loading ? 'Загрузка...' : 'Применить'}
          </Button>
        </div>
      </SectionCard>

      {error && <ErrorState title="Ошибка загрузки отчёта" description={error} />}

      {loading && !data && <LoadingState label="Загружаем отчёт о продажах..." />}

      {data?.summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Заказов', value: data.summary.totalOrders },
            { label: 'Оборот', value: `${(data.summary.grossRevenue / 100).toLocaleString('ru')} руб` },
            { label: 'Комиссия', value: `${(data.summary.platformFee / 100).toLocaleString('ru')} руб` },
            { label: 'Ваш доход', value: `${(data.summary.netRevenue / 100).toLocaleString('ru')} руб` },
          ].map((c) => (
            <SectionCard key={c.label}>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold mt-1">{c.value}</p>
            </SectionCard>
          ))}
        </div>
      )}

      <SectionCard>
        {!loading && (!data?.items || data.items.length === 0) ? (
          <EmptyState title="Нет данных" description="За выбранный период продаж не найдено." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Заказ</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="text-right">Комиссия</TableHead>
                <TableHead className="text-right">Доход</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.date ? new Date(item.date).toLocaleDateString('ru') : '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{item.shortCode}</TableCell>
                  <TableCell>{item.customerName || '-'}</TableCell>
                  <TableCell className="text-right">{((item.grossAmount || 0) / 100).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-red-500">-{((item.platformFee || 0) / 100).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-green-600">{((item.supplierAmount || 0) / 100).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {showPicker && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="inline-block rounded-xl bg-white px-6 py-5 shadow-xl">
            <p className="mb-3 text-sm font-medium text-gray-700">Выберите произвольный период</p>
            <div className="inline-block">
              <DateRangePicker value={range} onChange={setRange} />
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPicker(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowPicker(false);
                    load();
                  }}
                  disabled={loading}
                >
                  Применить
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
