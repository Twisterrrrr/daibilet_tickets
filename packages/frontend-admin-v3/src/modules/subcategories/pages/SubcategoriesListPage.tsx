import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchAdminSubcategories, type AdminSubcategoryRow } from '../api/subcategories.api';
import {
  SUBCATEGORY_LAYER_LABEL,
  landingEnabledBadgeLabel,
  subcategoryActiveLabel,
  subcategoryLandingModeLabel,
  subcategoryTypeLabel,
} from '../lib/subcategory-ui-labels';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

export function SubcategoriesListPage() {
  const [q, setQ] = React.useState('');
  const [forEntity, setForEntity] = React.useState<'event' | 'venue'>('event');
  const [layer, setLayer] = React.useState<'PRIMARY' | 'SECONDARY'>('PRIMARY');
  const [includeInactive, setIncludeInactive] = React.useState(false);

  const query = useQuery({
    queryKey: ['admin-subcategories', { forEntity, layer, includeInactive }],
    queryFn: () => fetchAdminSubcategories({ forEntity, layer, includeInactive, withUsage: true }),
    staleTime: 30_000,
  });

  const rows = (query.data ?? []).filter((r) => {
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return (
      r.slug?.toLowerCase().includes(s) ||
      r.code?.toLowerCase().includes(s) ||
      r.nameRu?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Подкатегории"
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin-v3/subcategories/new">Создать</Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => query.refetch()}>
              Обновить
            </Button>
          </div>
        }
      />

      <DataTableShell
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по коду, слагу или названию…"
              className="h-9 w-[320px]"
            />
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={forEntity}
              onChange={(e) => setForEntity(e.target.value as any)}
            >
              <option value="event">События</option>
              <option value="venue">Площадки</option>
            </select>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={layer}
              onChange={(e) => setLayer(e.target.value as any)}
            >
              <option value="PRIMARY">{SUBCATEGORY_LAYER_LABEL.PRIMARY}</option>
              <option value="SECONDARY">{SUBCATEGORY_LAYER_LABEL.SECONDARY}</option>
            </select>
            <label className="ml-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
              <span>Показать неактивные</span>
            </label>
          </div>
        }
      >
        {query.isLoading ? <LoadingState /> : null}
        {query.isError ? (
          <ErrorState title="Не удалось загрузить подкатегории" description={query.error instanceof Error ? query.error.message : 'Ошибка'} onRetry={() => query.refetch()} />
        ) : null}

        {query.data ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Название</th>
                  <th className="px-4 py-3 text-left">Слаг / код</th>
                  <th className="px-4 py-3 text-center">Тип</th>
                  <th className="px-4 py-3 text-center">Иерархия</th>
                  <th className="px-4 py-3 text-center">Лендинг</th>
                  <th className="px-4 py-3 text-center">Использование</th>
                  <th className="px-4 py-3 text-center">Статус</th>
                  <th className="px-4 py-3 text-center">Действия</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: AdminSubcategoryRow) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.nameRu}</div>
                      {r.parent ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          родитель: <span className="font-mono">{r.parent.slug}</span>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{r.slug}</div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">{r.code}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline">{subcategoryTypeLabel(r.type)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                      {r.parent ? 'дочерняя' : 'корень'} · дочерних: {Array.isArray(r.children) ? r.children.length : 0}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      <div>
                        {r.isLandingEnabled ? (
                          <Badge variant="info">{landingEnabledBadgeLabel(true)}</Badge>
                        ) : (
                          <Badge variant="outline">{landingEnabledBadgeLabel(false)}</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{subcategoryLandingModeLabel(r.landingMode)}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      <div className="text-muted-foreground">
                        событий: {r.usage?.eventsCount ?? '—'} · площадок: {r.usage?.venuesCount ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={r.isActive ? 'success' : 'outline'}>{subcategoryActiveLabel(r.isActive)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link to={`/admin-v3/subcategories/${r.id}`}>Открыть</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </DataTableShell>
    </div>
  );
}

