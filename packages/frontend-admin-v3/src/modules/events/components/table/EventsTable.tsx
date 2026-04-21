import { TableHorizontalScroll } from '@/components/shared/table/TableHorizontalScroll';
import { EmptyState } from '@/components/shared/states/EmptyState';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import type { AdminEventListItem } from '@/modules/events/api/queries';
import type { EventRowItem } from './types';
import { EventsTableRow } from './EventsTableRow';

type EventHealthRow = { flags: Record<string, boolean>; issueCodes: string[] };

function issueLabel(code: string): string {
  if (code === 'NO_PHOTO') return 'Нет обложки';
  if (code === 'NO_PRICE') return 'Нет категории с ценой';
  if (code === 'NO_FUTURE_SESSIONS') return 'Нет будущих сеансов';
  if (code === 'NO_SUBCATEGORY') return 'Нет подкатегории';
  if (code === 'TOO_MANY_SUBCATEGORIES') return 'Слишком много подкатегорий';
  return code;
}

function mapRow(e: AdminEventListItem, health: EventHealthRow | undefined): EventRowItem {
  const codes = e.readinessSummary?.issueCodes?.length
    ? e.readinessSummary.issueCodes
    : health?.issueCodes ?? [];
  const errorCodes = new Set(['NO_PRICE', 'NO_FUTURE_SESSIONS']);
  const errors = codes.filter((c) => errorCodes.has(c)).length;
  const warnings = codes.length - errors;

  const readinessStatus =
    e.readinessSummary?.status ??
    (codes.length === 0 ? 'READY' : errors > 0 ? 'BLOCKED' : 'NEEDS_WORK');

  const priceKop = e.priceFromMin;
  const priceRub = priceKop != null && priceKop > 0 ? Math.round(priceKop / 100) : null;

  return {
    id: e.id,
    slug: e.slug ?? '',
    title: e.title,
    imageThumb: null,

    supplierSource: e.source ?? null,
    supplierName: e.supplier?.name ?? null,
    cityName: e.city?.name ?? null,
    venueName: e.venueShort?.name ?? null,

    nextDate: e.nextSessionAt ?? null,
    hasFutureSlots:
      typeof e.futureSessionsCount === 'number'
        ? e.futureSessionsCount > 0
        : typeof health?.flags?.hasFutureSessions === 'boolean'
          ? health.flags.hasFutureSessions
          : null,

    priceFrom: priceRub,

    publishStatus: (e as { publishStatus?: string }).publishStatus ?? null,
    isPast: e.isPast,
    isArchived: e.isArchived,
    isActive: e.isActive,

    hasOverride: Boolean(e.override),

    issueCount: errors,
    warningCount: warnings,
    readinessStatus,
    readinessScore: e.readinessSummary?.score ?? null,
    issues: codes.slice(0, 8).map((c) => ({
      code: c,
      label: issueLabel(c),
      severity: errorCodes.has(c) ? ('error' as const) : ('warning' as const),
    })),

    sessionsCount: e.futureSessionsCount ?? e._count?.sessions ?? null,

    sectionsDerived: (e.sectionsDerived ?? []).map((x) => ({ slug: x.slug, name: x.name })),
    subcategoriesCanonical: (e.subcategoriesCanonical ?? []).map((x) => ({
      id: x.id,
      slug: x.slug,
      name: x.name,
      isActive: (x as { isActive?: boolean }).isActive,
      layer: (x as { layer?: 'PRIMARY' | 'SECONDARY' }).layer,
      subcategoryType: (x as { subcategoryType?: 'UNIVERSAL' | 'EVENT_ONLY' | 'VENUE_ONLY' }).subcategoryType,
    })),
  };
}

export function EventsTable({
  items,
  healthById,
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
  healthById: Record<string, EventHealthRow | undefined>;
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
        <LoadingState variant="table" label="Загрузка событий…" />
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
    <TableHorizontalScroll>
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
            {visibleCols.includes('sessions') ? (
              <th className="px-4 py-3 text-center">Сеансы (будущие)</th>
            ) : null}
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
            {visibleCols.includes('override') ? <th className="px-4 py-3 text-center">Перекрытие</th> : null}
            <th className="px-4 py-3 text-center">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => {
            const row = mapRow(e, healthById[e.id]);
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
    </TableHorizontalScroll>
  );
}

