import { ColumnDef } from '@tanstack/react-table';
import { Pause, Play, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { FilterBar, PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface OverviewRow {
  sessionId: string;
  eventId: string;
  eventTitle: string;
  eventSlug?: string | null;
  citySlug: string;
  cityName?: string | null;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
  soldCount: number;
  locked: boolean;
  lockReason?: 'SOLD' | 'PAST' | 'IMPORTED' | 'OTHER';
  isCancelled: boolean;
  canceledAt?: string | null;
  cancelReason?: string | null;
  offerId?: string | null;
  eventSource: string;
  sessionIsActive: boolean;
  issues: string[];
}

interface OverviewResponse {
  from: string;
  to: string;
  truncated: boolean;
  rows: OverviewRow[];
}

const ISSUE_LABELS: Record<string, string> = {
  CANCELLED: 'Отменён',
  PAUSED: 'Пауза',
  CAPACITY_ZERO: 'Вместимость 0',
  SOLD_OUT: 'Распродано',
  NO_OFFER_LINK: 'Нет оффера',
  NO_PRICE: 'Нет цены',
};

function dayToIsoStart(day: string): string {
  return new Date(`${day}T00:00:00`).toISOString();
}

function dayToIsoEnd(day: string): string {
  return new Date(`${day}T23:59:59.999`).toISOString();
}

function formatSessionStart(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rowBulkBase(row: OverviewRow): boolean {
  if (row.eventSource !== 'MANUAL' || row.isCancelled) return false;
  return new Date(row.startsAt).getTime() > Date.now();
}

/** Распродано: известна вместимость > 0 и продано ≥ неё (паузу не предлагаем — нет новых продаж). */
function rowIsSoldOut(row: OverviewRow): boolean {
  const c = row.capacity;
  if (c == null || c <= 0) return false;
  return row.soldCount >= c;
}

/** Пауза: активный слот с остатком мест (или без известной вместимости). */
function rowEligibleForBulkPause(row: OverviewRow): boolean {
  return rowBulkBase(row) && row.sessionIsActive && !rowIsSoldOut(row);
}

/** Возобновление: только то, что уже на паузе (isActive=false, не отмена). */
function rowEligibleForBulkResume(row: OverviewRow): boolean {
  return rowBulkBase(row) && !row.sessionIsActive;
}

type BulkMode = 'pause' | 'resume';

function rowEligibleForBulkSelection(row: OverviewRow, mode: BulkMode): boolean {
  return mode === 'pause' ? rowEligibleForBulkPause(row) : rowEligibleForBulkResume(row);
}

const BULK_ERR: Record<string, string> = {
  IMPORTED: 'не MANUAL',
  CANCELLED: 'отменён',
  PAST: 'в прошлом',
  NOT_FOUND: 'не найден',
  SOLD_OUT: 'распродано',
};

export function EventSessionsBoardPage() {
  const [fromDay, setFromDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [toDay, setToDay] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [city, setCity] = useState('');
  const [take, setTake] = useState('200');
  const [cities, setCities] = useState<Array<{ slug: string; name: string }>>([]);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkMode>('pause');

  useEffect(() => {
    adminApi
      .get<{ items: Array<{ slug: string; name: string }> }>('/admin/cities?limit=1000')
      .then((res) => setCities(res.items ?? []))
      .catch(() => setCities([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('from', dayToIsoStart(fromDay));
      params.set('to', dayToIsoEnd(toDay));
      if (city) params.set('city', city);
      params.set('take', take);
      if (issuesOnly) params.set('issuesOnly', 'true');
      const res = await adminApi.get<OverviewResponse>(`/admin/events/sessions/overview?${params.toString()}`);
      setData(res);
      setSelected({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fromDay, toDay, city, take, issuesOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelected({});
  }, [bulkMode]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const tableRows = useMemo(() => data?.rows ?? [], [data]);
  const rowBySessionId = useMemo(() => {
    const m = new Map<string, OverviewRow>();
    for (const r of tableRows) m.set(r.sessionId, r);
    return m;
  }, [tableRows]);

  const eligibleRows = useMemo(
    () => tableRows.filter((r) => rowEligibleForBulkSelection(r, bulkMode)),
    [tableRows, bulkMode],
  );

  const runBulk = useCallback(
    async (action: 'pause' | 'resume') => {
      if (selectedIds.length === 0) {
        toast.message('Выберите сеансы');
        return;
      }
      const filterIds = (pred: (row: OverviewRow) => boolean) =>
        selectedIds.filter((id) => {
          const row = rowBySessionId.get(id);
          return row != null && pred(row);
        });

      const ids =
        action === 'pause' ? filterIds(rowEligibleForBulkPause) : filterIds(rowEligibleForBulkResume);

      if (ids.length === 0) {
        toast.message(
          action === 'pause'
            ? 'Нет сеансов для паузы: выберите активные с остатком мест (распроданные не участвуют)'
            : 'Нет сеансов для возобновления: выберите приостановленные (на паузе)',
        );
        return;
      }

      setBulkBusy(true);
      try {
        const res = await adminApi.post<{ results: { id: string; ok: boolean; error?: string }[] }>(
          '/admin/events/sessions/bulk',
          { sessionIds: ids, action },
        );
        const ok = res.results.filter((r) => r.ok).length;
        const fail = res.results.filter((r) => !r.ok);
        const skipped = selectedIds.length - ids.length;
        if (fail.length === 0) {
          const suffix = skipped > 0 ? ` (пропущено по правилам: ${skipped})` : '';
          toast.success(
            (action === 'pause' ? `Пауза: ${ok} сеансов` : `Возобновлено: ${ok} сеансов`) + suffix,
          );
        } else {
          toast.warning(`Готово: ${ok} ок, ${fail.length} с ошибкой`, {
            description: fail
              .slice(0, 5)
              .map((f) => `${f.id.slice(0, 8)}… ${BULK_ERR[f.error ?? ''] ?? f.error}`)
              .join('; '),
          });
        }
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        setBulkBusy(false);
      }
    },
    [selectedIds, rowBySessionId, load],
  );

  const columns = useMemo<ColumnDef<OverviewRow>[]>(
    () => [
      {
        id: 'select',
        header: () => {
          const allOn =
            eligibleRows.length > 0 && eligibleRows.every((r) => selected[r.sessionId]);
          return (
            <div className="flex w-9 justify-center">
              <input
                type="checkbox"
                aria-label={
                  bulkMode === 'pause'
                    ? 'Выбрать все, доступные для паузы'
                    : 'Выбрать все приостановленные для возобновления'
                }
                checked={allOn}
                onChange={(e) => {
                  const on = e.target.checked;
                  setSelected((prev) => {
                    const next = { ...prev };
                    for (const r of eligibleRows) {
                      next[r.sessionId] = on;
                    }
                    return next;
                  });
                }}
              />
            </div>
          );
        },
        cell: ({ row }) => {
          const r = row.original;
          const el = rowEligibleForBulkSelection(r, bulkMode);
          if (!el) {
            const title =
              bulkMode === 'pause'
                ? 'В режиме «Пауза» только активные слоты с остатком мест. На паузе, распродано, импорт — без чекбокса.'
                : 'В режиме «Возобновить» только приостановленные слоты.';
            return (
              <span className="text-xs text-muted-foreground" title={title}>
                —
              </span>
            );
          }
          return (
            <div className="flex w-9 justify-center">
              <input
                type="checkbox"
                aria-label="Выбрать сеанс"
                checked={!!selected[r.sessionId]}
                onChange={(e) =>
                  setSelected((prev) => ({ ...prev, [r.sessionId]: e.target.checked }))
                }
              />
            </div>
          );
        },
        size: 40,
      },
      {
        accessorKey: 'startsAt',
        header: 'Начало',
        cell: ({ row }) => formatSessionStart(row.original.startsAt),
      },
      {
        accessorKey: 'cityName',
        header: 'Город',
        cell: ({ row }) => row.original.cityName || row.original.citySlug,
      },
      {
        accessorKey: 'eventTitle',
        header: 'Событие',
        cell: ({ row }) => (
          <Link to={`/events/${row.original.eventId}`} className="font-medium text-primary-700 hover:underline">
            {row.original.eventTitle}
          </Link>
        ),
      },
      {
        id: 'occupancy',
        header: 'Места',
        cell: ({ row }) => {
          const c = row.original.capacity;
          if (c == null) return `${row.original.soldCount} / —`;
          return `${row.original.soldCount} / ${c}`;
        },
      },
      {
        id: 'issues',
        header: 'Замечания',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.issues.length === 0 ? (
              <span className="text-xs text-slate-400">—</span>
            ) : (
              row.original.issues.map((code) => (
                <Badge key={code} variant={code === 'CANCELLED' ? 'secondary' : 'outline'} className="text-[10px]">
                  {ISSUE_LABELS[code] ?? code}
                </Badge>
              ))
            )}
          </div>
        ),
      },
    ],
    [eligibleRows, selected, bulkMode],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Сеансы"
        subtitle="Обзор сеансов по датам и городу (MVP)"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        }
      />

      <FilterBar>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">С даты</label>
            <Input type="date" value={fromDay} onChange={(e) => setFromDay(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">По дату</label>
            <Input type="date" value={toDay} onChange={(e) => setToDay(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Город</label>
            <Select value={city || '__all'} onValueChange={(v) => setCity(v === '__all' ? '' : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Все" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Все города</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Лимит</label>
            <Select value={take} onValueChange={setTake}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
                <SelectItem value="500">500</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <Switch id="sessions-issues-only" checked={issuesOnly} onCheckedChange={setIssuesOnly} />
            <Label htmlFor="sessions-issues-only" className="cursor-pointer text-sm font-normal">
              Только с замечаниями
            </Label>
          </div>
        </div>
      </FilterBar>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex rounded-md border border-input bg-background p-0.5"
          role="group"
          aria-label="Режим массового действия"
        >
          <Button
            type="button"
            variant={bulkMode === 'pause' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setBulkMode('pause')}
          >
            <Pause className="mr-1.5 h-3.5 w-3.5" />
            Пауза
          </Button>
          <Button
            type="button"
            variant={bulkMode === 'resume' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setBulkMode('resume')}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Возобновить
          </Button>
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={bulkBusy || selectedIds.length === 0}
          onClick={() => void runBulk(bulkMode)}
        >
          {bulkMode === 'pause' ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Поставить на паузу ({selectedIds.length})
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Возобновить продажу ({selectedIds.length})
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          MANUAL, будущие, не отменённые. В режиме паузы в выборе только активные слоты с остатком мест; приостановленные
          скрыты из чекбоксов (переключитесь на «Возобновить»).
        </span>
      </div>

      {data?.truncated && (
        <p className="text-sm text-amber-700">
          {issuesOnly
            ? `Показано до ${data.rows.length} сеансов с замечаниями; при необходимости сузьте период, выберите город или отключите фильтр — выборка по времени ограничена.`
            : `Показаны первые ${data.rows.length} сеансов; сузьте период или город — данных больше лимита.`}
        </p>
      )}

      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        loading={loading}
        emptyText={
          issuesOnly
            ? 'В этой выборке нет сеансов с замечаниями (или все такие сеансы за пределами загруженного окна по времени).'
            : 'Нет сеансов в выбранном диапазоне'
        }
      />
    </div>
  );
}
