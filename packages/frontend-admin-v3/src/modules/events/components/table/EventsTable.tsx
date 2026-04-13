import { EmptyState } from '@/components/shared/states/EmptyState';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import type { AdminEventListItem } from '@/modules/events/api/queries';
import type { AdminEventSummary } from '@/modules/events/api/summary';
import type { EventRowItem } from './types';
import { EventsTableRow } from './EventsTableRow';

function mapRow(e: AdminEventListItem, s: AdminEventSummary | undefined): EventRowItem {
  const issues = s?.readiness?.issues ?? [];
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.length - errors;

  return {
    id: e.id,
    slug: (e as any).slug ?? '',
    title: e.title,
    imageThumb: null,

    supplierSource: e.source ?? null,
    cityName: e.city?.name ?? null,
    venueName: null,

    nextDate: s?.operations?.nextSessionAt ?? null,
    hasFutureSlots: s?.readiness?.checklist?.hasFutureSlots ?? null,

    priceFrom: null,

    publishStatus: (e as any).publishStatus ?? null,
    isPast: e.isPast,
    isArchived: e.isArchived,
    isActive: e.isActive,

    hasOverride: Boolean(e.override),

    issueCount: errors,
    warningCount: warnings,
    readinessStatus: s?.readiness?.status ?? null,
    readinessScore: typeof s?.readiness?.score === 'number' ? s.readiness.score : null,
    issues: issues.map((i) => ({ code: i.code, label: i.message, severity: i.severity })),

    sessionsCount: e._count?.sessions ?? null,

    sectionsDerived: (e.sectionsDerived ?? []).map((x) => ({ slug: x.slug, name: x.name })),
    subcategoriesCanonical: (e.subcategoriesCanonical ?? []).map((x) => ({
      id: x.id,
      slug: x.slug,
      name: x.name,
      isActive: (x as any).isActive,
    })),
  };
}

export function EventsTable({
  items,
  summaryById,
  loading,
  error,
  onRetry,
  onToggleArchive,
  selectedIds,
  onToggleSelect,
  onToggleSelectAllOnPage,
  sortBy,
  sortDir,
  onSort,
  visibleCols,
}: {
  items: AdminEventListItem[];
  summaryById: Record<string, AdminEventSummary | undefined>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onToggleArchive: (id: string, nextArchived: boolean) => Promise<void>;
  selectedIds: string[];
  onToggleSelect: (id: string, nextSelected: boolean) => void;
  onToggleSelectAllOnPage: (nextSelected: boolean, idsOnPage: string[]) => void;
  sortBy: 'updatedAt' | 'title' | 'city' | 'source';
  sortDir: 'asc' | 'desc';
  onSort: (by: 'updatedAt' | 'title' | 'city' | 'source') => void;
  visibleCols: string[];
}) {
  if (loading) {
    return (
      <div className="p-4">
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorState description={error} onRetry={onRetry} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title="Ничего не найдено" description="Попробуйте изменить фильтры или поисковый запрос." />
      </div>
    );
  }

  const idsOnPage = items.map((x) => x.id);
  const selectedOnPageCount = idsOnPage.filter((id) => selectedIds.includes(id)).length;
  const allOnPageSelected = idsOnPage.length > 0 && selectedOnPageCount === idsOnPage.length;
  const someOnPageSelected = selectedOnPageCount > 0 && !allOnPageSelected;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-sm">
        <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="w-[44px] px-3 py-3 text-center">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someOnPageSelected;
                }}
                onChange={(e) => onToggleSelectAllOnPage(e.target.checked, idsOnPage)}
                aria-label="Выбрать все события на странице"
              />
            </th>
            {visibleCols.includes('main') ? (
              <th className="px-4 py-3 text-left">
                <button type="button" className="hover:underline" onClick={() => onSort('title')}>
                  Название{sortBy === 'title' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ) : null}
            {visibleCols.includes('source') ? (
              <th className="px-4 py-3 text-center">
                <button type="button" className="hover:underline" onClick={() => onSort('source')}>
                  Поставщик{sortBy === 'source' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ) : null}
            {visibleCols.includes('location') ? (
              <th className="px-4 py-3 text-center">
                <button type="button" className="hover:underline" onClick={() => onSort('city')}>
                  Город / Площадка{sortBy === 'city' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ) : null}
            {visibleCols.includes('next') ? <th className="px-4 py-3 text-center">Ближайшая дата</th> : null}
            {visibleCols.includes('sessions') ? <th className="px-4 py-3 text-center">Сеансы</th> : null}
            {visibleCols.includes('price') ? <th className="px-4 py-3 text-center">Цена от</th> : null}
            {visibleCols.includes('status') ? (
              <th className="px-4 py-3 text-center">
                <button type="button" className="hover:underline" onClick={() => onSort('updatedAt')}>
                  Статус{sortBy === 'updatedAt' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ) : null}
            {visibleCols.includes('quality') ? <th className="px-4 py-3 text-center">Качество</th> : null}
            {visibleCols.includes('issues') ? <th className="px-4 py-3 text-center">Проблемы</th> : null}
            {visibleCols.includes('override') ? <th className="px-4 py-3 text-center">Override</th> : null}
            <th className="px-4 py-3 text-center">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => {
            const row = mapRow(e, summaryById[e.id]);
            return (
              <EventsTableRow
                key={row.id}
                item={row}
                onToggleArchive={onToggleArchive}
                selected={selectedIds.includes(row.id)}
                onToggleSelect={onToggleSelect}
                visibleCols={visibleCols}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

