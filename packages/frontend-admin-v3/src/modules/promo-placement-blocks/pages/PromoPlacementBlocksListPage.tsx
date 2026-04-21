import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import {
  createAdminPromoPlacementBlock,
  fetchAdminPromoPlacementBlock,
  fetchAdminPromoPlacementBlocks,
  fetchAdminPromoPlacementResolvedPreview,
  patchAdminPromoPlacementBlock,
  type PromoPlacementBlockListItem,
  type PromoPlacementBlockStatus,
  type PromoPlacementZone,
  type PromoPageScopeType,
  type PromoPlacementReadinessStatus,
  type PromoTargetType,
} from '@/modules/promo-placement-blocks/api/promoPlacementBlocks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { readEnum, readInt, readString } from '@/shared/url-state/parse';
import { setOrDelete } from '@/shared/url-state/serialize';
import { useUrlState } from '@/shared/url-state/useUrlState';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';

type UrlState = {
  q: string;
  status: '' | PromoPlacementBlockStatus;
  placementZone: '' | PromoPlacementZone;
  pageScopeType: '' | PromoPageScopeType;
  targetType: '' | PromoTargetType;
  readiness: '' | PromoPlacementReadinessStatus;
  seoOnly: 0 | 1;
  page: number;
  pageSize: number;
  sort: 'updatedAt' | 'publishedAt' | 'priority' | 'sortOrder' | 'title';
  order: 'asc' | 'desc';
};

const STATUS: Array<{ id: '' | PromoPlacementBlockStatus; label: string }> = [
  { id: '', label: 'Все' },
  { id: 'DRAFT', label: 'Черновик' },
  { id: 'PUBLISHED', label: 'Опубликовано' },
  { id: 'ARCHIVED', label: 'Архив' },
];

const ZONES: Array<{ id: '' | PromoPlacementZone; label: string }> = [
  { id: '', label: 'Все зоны' },
  { id: 'HOME_HERO', label: 'Главная — первый экран' },
  { id: 'HOME_FEATURED', label: 'Главная — рекомендации' },
  { id: 'CITY_HERO', label: 'Город — первый экран' },
  { id: 'CITY_BELOW_HERO', label: 'Город — под первым экраном' },
  { id: 'LANDING_HERO', label: 'Лендинг — первый экран' },
  { id: 'LANDING_INLINE', label: 'Лендинг — в тексте' },
  { id: 'ARTICLE_INLINE', label: 'Статья — в тексте' },
  { id: 'COLLECTION_INLINE', label: 'Подборка — в тексте' },
  { id: 'CATALOG_INLINE', label: 'Каталог — в тексте' },
];

const SCOPES: Array<{ id: '' | PromoPageScopeType; label: string }> = [
  { id: '', label: 'Все области' },
  { id: 'GLOBAL', label: 'Весь сайт' },
  { id: 'CITY', label: 'Город' },
  { id: 'LANDING', label: 'Лендинг' },
  { id: 'COLLECTION', label: 'Подборка' },
  { id: 'ARTICLE', label: 'Статья' },
];

const TARGETS: Array<{ id: '' | PromoTargetType; label: string }> = [
  { id: '', label: 'Все типы цели' },
  { id: 'EVENT', label: 'Событие' },
  { id: 'COLLECTION', label: 'Подборка' },
  { id: 'LANDING', label: 'Лендинг' },
  { id: 'ARTICLE', label: 'Статья' },
];

const READINESS: Array<{ id: '' | PromoPlacementReadinessStatus; label: string }> = [
  { id: '', label: 'Любая готовность' },
  { id: 'READY', label: 'Готово' },
  { id: 'EMPTY', label: 'Пусто' },
  { id: 'SCHEDULED', label: 'Запланировано' },
  { id: 'EXPIRED', label: 'Истекло' },
  { id: 'INACTIVE', label: 'Неактивно' },
  { id: 'MISCONFIGURED', label: 'Ошибка настроек' },
];

function fmtDt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU');
}

function losesByFromComparisonReasons(
  reasons: string[] | undefined,
): Array<'PRIORITY' | 'SORT_ORDER' | 'UPDATED_AT'> {
  const r = new Set(reasons ?? []);
  const out: Array<'PRIORITY' | 'SORT_ORDER' | 'UPDATED_AT'> = [];
  if (r.has('LOWER_PRIORITY')) out.push('PRIORITY');
  if (r.has('HIGHER_SORT_ORDER')) out.push('SORT_ORDER');
  if (r.has('OLDER_UPDATED_AT_TIEBREAKER')) out.push('UPDATED_AT');
  return out;
}

export function PromoPlacementBlocksListPage() {
  const qc = useQueryClient();
  const { state, setState, reset } = useUrlState<UrlState>({
    defaults: {
      q: '',
      status: '',
      placementZone: '',
      pageScopeType: '',
      targetType: '',
      readiness: '',
      seoOnly: 0,
      page: 1,
      pageSize: 25,
      sort: 'updatedAt',
      order: 'desc',
    },
    parse: (sp) => ({
      q: readString(sp, 'q', ''),
      status: readEnum(sp, 'status', ['' as const, 'DRAFT', 'PUBLISHED', 'ARCHIVED'], ''),
      placementZone: readEnum(
        sp,
        'placementZone',
        ['' as const, 'HOME_HERO', 'HOME_FEATURED', 'CITY_HERO', 'CITY_BELOW_HERO', 'LANDING_HERO', 'LANDING_INLINE', 'ARTICLE_INLINE', 'COLLECTION_INLINE', 'CATALOG_INLINE'],
        '',
      ),
      pageScopeType: readEnum(sp, 'pageScopeType', ['' as const, 'GLOBAL', 'CITY', 'LANDING', 'COLLECTION', 'ARTICLE'], ''),
      targetType: readEnum(sp, 'targetType', ['' as const, 'EVENT', 'COLLECTION', 'LANDING', 'ARTICLE'], ''),
      readiness: readEnum(sp, 'readiness', ['' as const, 'READY', 'EMPTY', 'SCHEDULED', 'EXPIRED', 'INACTIVE', 'MISCONFIGURED'], ''),
      seoOnly: readEnum(sp, 'seoOnly', ['0' as const, '1' as const], '0') === '1' ? 1 : 0,
      page: readInt(sp, 'page', 1),
      pageSize: readInt(sp, 'pageSize', 25),
      sort: readEnum(sp, 'sort', ['updatedAt' as const, 'publishedAt', 'priority', 'sortOrder', 'title'], 'updatedAt'),
      order: readEnum(sp, 'order', ['asc' as const, 'desc'], 'desc'),
    }),
    serialize: (s, sp) => {
      setOrDelete(sp, 'q', s.q);
      setOrDelete(sp, 'status', s.status);
      setOrDelete(sp, 'placementZone', s.placementZone);
      setOrDelete(sp, 'pageScopeType', s.pageScopeType);
      setOrDelete(sp, 'targetType', s.targetType);
      setOrDelete(sp, 'readiness', s.readiness);
      if (s.seoOnly === 1) sp.set('seoOnly', '1');
      else sp.delete('seoOnly');
      if (s.page !== 1) sp.set('page', String(s.page));
      else sp.delete('page');
      if (s.pageSize !== 25) sp.set('pageSize', String(s.pageSize));
      else sp.delete('pageSize');
      if (s.sort !== 'updatedAt') sp.set('sort', s.sort);
      else sp.delete('sort');
      if (s.order !== 'desc') sp.set('order', s.order);
      else sp.delete('order');
      return sp;
    },
  });

  const [qInput, setQInput] = React.useState(state.q);
  const debouncedQ = useDebouncedValue(qInput, 250);
  React.useEffect(() => setQInput(state.q), [state.q]);
  React.useEffect(() => {
    if (debouncedQ === state.q) return;
    setState({ q: debouncedQ, page: 1 }, { history: 'replace' });
  }, [debouncedQ, setState, state.q]);

  const q = useQuery({
    queryKey: ['admin-promo-placement-blocks', { ...state, q: debouncedQ }],
    queryFn: () =>
      fetchAdminPromoPlacementBlocks({
        search: debouncedQ.trim() || undefined,
        status: state.status || undefined,
        placementZone: state.placementZone || undefined,
        pageScopeType: state.pageScopeType || undefined,
        targetType: state.targetType || undefined,
        readiness: state.readiness || undefined,
        seoOnly: state.seoOnly === 1,
        page: state.page,
        limit: state.pageSize,
        sort: state.sort,
        order: state.order,
      }),
    placeholderData: (p) => p,
    staleTime: 15_000,
  });

  const publishM = useMutation({
    mutationFn: async (id: string) => patchAdminPromoPlacementBlock(id, { status: 'PUBLISHED' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-promo-placement-blocks'] });
    },
  });
  const archiveM = useMutation({
    mutationFn: async (id: string) => patchAdminPromoPlacementBlock(id, { status: 'ARCHIVED' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-promo-placement-blocks'] });
    },
  });

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [previewCtx, setPreviewCtx] = React.useState({
    pageScopeType: 'GLOBAL' as PromoPageScopeType,
    cityId: '',
    landingId: '',
    collectionId: '',
    articleId: '',
    limit: '10',
  });
  const [previewLoadedOnce, setPreviewLoadedOnce] = React.useState(false);
  const [draft, setDraft] = React.useState({
    title: '',
    status: 'DRAFT' as PromoPlacementBlockStatus,
    placementZone: 'HOME_FEATURED' as PromoPlacementZone,
    pageScopeType: 'GLOBAL' as PromoPageScopeType,
    cityId: '',
    landingId: '',
    collectionId: '',
    articleId: '',
    targetType: 'EVENT' as PromoTargetType,
    targetEventId: '',
    targetCollectionId: '',
    targetLandingId: '',
    targetArticleId: '',
    customTitle: '',
    customSubtitle: '',
    customImageUrl: '',
    ctaLabel: '',
    priority: '0',
    sortOrder: '0',
    startsAt: '',
    endsAt: '',
  });

  const detailQ = useQuery({
    queryKey: ['admin-promo-placement-block', editingId],
    queryFn: () => fetchAdminPromoPlacementBlock(editingId!),
    enabled: Boolean(editingId) && drawerOpen,
  });

  const previewQ = useQuery({
    queryKey: ['admin-promo-placement-block-preview', editingId, previewCtx],
    queryFn: () =>
      fetchAdminPromoPlacementResolvedPreview({
        id: editingId!,
        pageScopeType: previewCtx.pageScopeType,
        cityId: previewCtx.cityId.trim() || undefined,
        landingId: previewCtx.landingId.trim() || undefined,
        collectionId: previewCtx.collectionId.trim() || undefined,
        articleId: previewCtx.articleId.trim() || undefined,
        limit: Number.isFinite(Number(previewCtx.limit)) ? Number(previewCtx.limit) : undefined,
      }),
    enabled: Boolean(editingId) && drawerOpen && previewLoadedOnce,
  });

  React.useEffect(() => {
    if (!drawerOpen) return;
    if (!editingId) return;
    const d = detailQ.data;
    if (!d) return;
    setDraft({
      title: d.title ?? '',
      status: d.status,
      placementZone: d.placementZone,
      pageScopeType: d.pageScopeType,
      cityId: d.city?.id ?? '',
      landingId: d.landing?.id ?? '',
      collectionId: d.collection?.id ?? '',
      articleId: d.article?.id ?? '',
      targetType: d.targetType,
      targetEventId: d.targetType === 'EVENT' ? (d.target?.id ?? '') : '',
      targetCollectionId: d.targetType === 'COLLECTION' ? (d.target?.id ?? '') : '',
      targetLandingId: d.targetType === 'LANDING' ? (d.target?.id ?? '') : '',
      targetArticleId: d.targetType === 'ARTICLE' ? (d.target?.id ?? '') : '',
      customTitle: d.customTitle ?? '',
      customSubtitle: d.customSubtitle ?? '',
      customImageUrl: d.customImageUrl ?? '',
      ctaLabel: d.ctaLabel ?? '',
      priority: String(d.priority ?? 0),
      sortOrder: String(d.sortOrder ?? 0),
      startsAt: d.startsAt ?? '',
      endsAt: d.endsAt ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQ.data, drawerOpen, editingId]);

  function openCreate() {
    setEditingId(null);
    setDraft((p) => ({
      ...p,
      title: '',
      status: 'DRAFT',
      placementZone: 'HOME_FEATURED',
      pageScopeType: 'GLOBAL',
      cityId: '',
      landingId: '',
      collectionId: '',
      articleId: '',
      targetType: 'EVENT',
      targetEventId: '',
      targetCollectionId: '',
      targetLandingId: '',
      targetArticleId: '',
      customTitle: '',
      customSubtitle: '',
      customImageUrl: '',
      ctaLabel: '',
      priority: '0',
      sortOrder: '0',
      startsAt: '',
      endsAt: '',
    }));
    setDrawerOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setPreviewLoadedOnce(false);
    setDrawerOpen(true);
  }

  const saveM = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: draft.title.trim(),
        placementZone: draft.placementZone,
        pageScopeType: draft.pageScopeType,
        cityId: draft.cityId.trim() || null,
        landingId: draft.landingId.trim() || null,
        collectionId: draft.collectionId.trim() || null,
        articleId: draft.articleId.trim() || null,
        targetType: draft.targetType,
        targetEventId: draft.targetType === 'EVENT' ? (draft.targetEventId.trim() || null) : null,
        targetCollectionId: draft.targetType === 'COLLECTION' ? (draft.targetCollectionId.trim() || null) : null,
        targetLandingId: draft.targetType === 'LANDING' ? (draft.targetLandingId.trim() || null) : null,
        targetArticleId: draft.targetType === 'ARTICLE' ? (draft.targetArticleId.trim() || null) : null,
        customTitle: draft.customTitle.trim() || undefined,
        customSubtitle: draft.customSubtitle.trim() || undefined,
        customImageUrl: draft.customImageUrl.trim() || undefined,
        ctaLabel: draft.ctaLabel.trim() || undefined,
        priority: Number.isFinite(Number(draft.priority)) ? Number(draft.priority) : undefined,
        sortOrder: Number.isFinite(Number(draft.sortOrder)) ? Number(draft.sortOrder) : undefined,
        startsAt: draft.startsAt.trim() || null,
        endsAt: draft.endsAt.trim() || null,
      };
      if (editingId) {
        payload.status = draft.status;
        return patchAdminPromoPlacementBlock(editingId, payload);
      }
      return createAdminPromoPlacementBlock(payload);
    },
    onSuccess: async () => {
      setDrawerOpen(false);
      setEditingId(null);
      await qc.invalidateQueries({ queryKey: ['admin-promo-placement-blocks'] });
    },
  });

  if (q.isLoading && !q.data) return <LoadingState label="Загрузка промо-размещений…" />;
  if (q.isError) {
    const meta = q.error ? getAdminErrorDisplay(q.error) : null;
    return (
      <ErrorState
        title={meta?.title ?? 'Не удалось загрузить промо-размещения'}
        description={meta?.description ?? meta?.rawMessage}
        onRetry={() => q.refetch()}
      />
    );
  }

  const items = q.data?.items ?? [];
  const total = q.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / state.pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Промо-размещения (витрина)"
        subtitle="Storefront control layer: surface/zone + scope + target + window + приоритет"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => reset({ history: 'replace' })}>
              Сброс
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => q.refetch()}>
              Обновить
            </Button>
            <Button type="button" size="sm" onClick={() => openCreate()}>
              Создать
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-7">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">q</span>
            <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Поиск по title/customTitle…" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">status</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={state.status}
              onChange={(e) => setState({ status: e.target.value as any, page: 1 }, { history: 'replace' })}
            >
              {STATUS.map((x) => (
                <option key={x.id || 'all'} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">placementZone</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={state.placementZone}
              onChange={(e) => setState({ placementZone: e.target.value as any, page: 1 }, { history: 'replace' })}
            >
              {ZONES.map((x) => (
                <option key={x.id || 'all'} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">scope</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={state.pageScopeType}
              onChange={(e) => setState({ pageScopeType: e.target.value as any, page: 1 }, { history: 'replace' })}
            >
              {SCOPES.map((x) => (
                <option key={x.id || 'all'} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">target</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={state.targetType}
              onChange={(e) => setState({ targetType: e.target.value as any, page: 1 }, { history: 'replace' })}
            >
              {TARGETS.map((x) => (
                <option key={x.id || 'all'} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">readiness</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={state.readiness}
              onChange={(e) => setState({ readiness: e.target.value as any, page: 1 }, { history: 'replace' })}
            >
              {READINESS.map((x) => (
                <option key={x.id || 'any'} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={state.seoOnly === 1 ? 'default' : 'outline'}
            onClick={() => setState({ seoOnly: state.seoOnly === 1 ? 0 : 1, page: 1 }, { history: 'replace' })}
          >
            SEO issues only
          </Button>
          <div className="text-xs text-muted-foreground">
            Без блокировок: фильтр основан на диагностике (EVENT: фото/цена/сеансы).
          </div>
        </div>
      </div>

      <DataTableShell
        footer={
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Всего: <span className="tabular-nums text-foreground">{total}</span> · стр.{' '}
              <span className="tabular-nums text-foreground">{state.page}</span> / {pages}
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={state.pageSize}
                onChange={(e) => setState({ pageSize: Number(e.target.value), page: 1 }, { history: 'push' })}
              >
                {[25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / стр
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={state.page <= 1}
                onClick={() => setState({ page: Math.max(1, state.page - 1) }, { history: 'push' })}
              >
                Назад
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={state.page >= pages}
                onClick={() => setState({ page: state.page + 1 }, { history: 'push' })}
              >
                Вперёд
              </Button>
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto p-2">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Placement</th>
                <th className="px-3 py-3">Scope</th>
                <th className="px-3 py-3">Target</th>
                <th className="px-3 py-3">Window</th>
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Readiness</th>
                <th className="w-48 px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Нет размещений по фильтру
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <PlacementRow
                    key={row.id}
                    row={row}
                    busy={publishM.isPending || archiveM.isPending}
                    onEdit={() => openEdit(row.id)}
                    onPublish={() => publishM.mutate(row.id)}
                    onArchive={() => archiveM.mutate(row.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>

      {drawerOpen ? (
        <div
          className="fixed inset-0 z-40"
          role="dialog"
          aria-modal="true"
          aria-label="Редактор promo placement"
          onClick={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.dataset?.overlay === '1') setDrawerOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/30" data-overlay="1" />
          <div className="absolute right-0 top-0 h-full w-full max-w-[720px] overflow-y-auto border-l bg-background p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{editingId ? 'Редактировать размещение' : 'Создать размещение'}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Control layer: placement + scope + target + window. Пока честно: target может быть не задан — но publish тогда не имеет смысла.
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setDrawerOpen(false)} disabled={saveM.isPending}>
                Закрыть
              </Button>
            </div>

            {detailQ.isLoading && editingId ? <div className="mt-4 text-sm text-muted-foreground">Загрузка…</div> : null}
            {saveM.isError ? (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveM.error instanceof Error ? saveM.error.message : 'Ошибка сохранения'}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">title</span>
                <Input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
              </label>
              {editingId ? (
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">status</span>
                  <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as PromoPlacementBlockStatus }))}>
                    {STATUS.filter((x) => x.id !== '').map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">placementZone</span>
                  <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={draft.placementZone} onChange={(e) => setDraft((p) => ({ ...p, placementZone: e.target.value as PromoPlacementZone }))}>
                    {ZONES.filter((x) => x.id !== '').map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">pageScopeType</span>
                  <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={draft.pageScopeType} onChange={(e) => setDraft((p) => ({ ...p, pageScopeType: e.target.value as PromoPageScopeType }))}>
                    {SCOPES.filter((x) => x.id !== '').map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-md border bg-card p-3">
                <div className="text-xs font-medium text-muted-foreground">Scope context (ids)</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">cityId</span>
                    <Input value={draft.cityId} onChange={(e) => setDraft((p) => ({ ...p, cityId: e.target.value }))} placeholder="UUID" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">landingId</span>
                    <Input value={draft.landingId} onChange={(e) => setDraft((p) => ({ ...p, landingId: e.target.value }))} placeholder="UUID" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">collectionId</span>
                    <Input value={draft.collectionId} onChange={(e) => setDraft((p) => ({ ...p, collectionId: e.target.value }))} placeholder="UUID" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">articleId</span>
                    <Input value={draft.articleId} onChange={(e) => setDraft((p) => ({ ...p, articleId: e.target.value }))} placeholder="UUID" />
                  </label>
                </div>
              </div>

              <div className="rounded-md border bg-card p-3">
                <div className="text-xs font-medium text-muted-foreground">Target</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">targetType</span>
                    <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={draft.targetType} onChange={(e) => setDraft((p) => ({ ...p, targetType: e.target.value as PromoTargetType }))}>
                      {TARGETS.filter((x) => x.id !== '').map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">targetId</span>
                    <Input
                      value={
                        draft.targetType === 'EVENT'
                          ? draft.targetEventId
                          : draft.targetType === 'COLLECTION'
                            ? draft.targetCollectionId
                            : draft.targetType === 'LANDING'
                              ? draft.targetLandingId
                              : draft.targetArticleId
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraft((p) => ({
                          ...p,
                          targetEventId: p.targetType === 'EVENT' ? v : p.targetEventId,
                          targetCollectionId: p.targetType === 'COLLECTION' ? v : p.targetCollectionId,
                          targetLandingId: p.targetType === 'LANDING' ? v : p.targetLandingId,
                          targetArticleId: p.targetType === 'ARTICLE' ? v : p.targetArticleId,
                        }));
                      }}
                      placeholder="UUID"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-md border bg-card p-3">
                <div className="text-xs font-medium text-muted-foreground">Presentation overrides</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">customTitle</span>
                    <Input value={draft.customTitle} onChange={(e) => setDraft((p) => ({ ...p, customTitle: e.target.value }))} />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">customSubtitle</span>
                    <Input value={draft.customSubtitle} onChange={(e) => setDraft((p) => ({ ...p, customSubtitle: e.target.value }))} />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">customImageUrl</span>
                    <Input value={draft.customImageUrl} onChange={(e) => setDraft((p) => ({ ...p, customImageUrl: e.target.value }))} />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">ctaLabel</span>
                    <Input value={draft.ctaLabel} onChange={(e) => setDraft((p) => ({ ...p, ctaLabel: e.target.value }))} />
                  </label>
                </div>
              </div>

              <div className="rounded-md border bg-card p-3">
                <div className="text-xs font-medium text-muted-foreground">Visibility window</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">startsAt (ISO)</span>
                    <Input value={draft.startsAt} onChange={(e) => setDraft((p) => ({ ...p, startsAt: e.target.value }))} placeholder="2026-04-17T12:00:00Z" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">endsAt (ISO)</span>
                    <Input value={draft.endsAt} onChange={(e) => setDraft((p) => ({ ...p, endsAt: e.target.value }))} placeholder="2026-05-01T12:00:00Z" />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">priority</span>
                  <Input value={draft.priority} onChange={(e) => setDraft((p) => ({ ...p, priority: e.target.value }))} />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">sortOrder</span>
                  <Input value={draft.sortOrder} onChange={(e) => setDraft((p) => ({ ...p, sortOrder: e.target.value }))} />
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)} disabled={saveM.isPending}>
                  Отмена
                </Button>
                <Button type="button" onClick={() => saveM.mutate()} disabled={saveM.isPending}>
                  {saveM.isPending ? 'Сохранение…' : 'Сохранить'}
                </Button>
              </div>

              {editingId ? (
                <div className="rounded-md border bg-card p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">Resolved Preview (контекстный)</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Показывает, как блок <span className="font-mono">{editingId}</span> резолвится для выбранного контекста зоны.
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPreviewLoadedOnce(true);
                        previewQ.refetch();
                      }}
                      disabled={previewQ.isFetching}
                    >
                      {previewQ.isFetching ? 'Загрузка…' : 'Показать'}
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">pageScopeType</span>
                      <select
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        value={previewCtx.pageScopeType}
                        onChange={(e) => setPreviewCtx((p) => ({ ...p, pageScopeType: e.target.value as PromoPageScopeType }))}
                      >
                        {SCOPES.filter((x) => x.id !== '').map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">limit</span>
                      <Input value={previewCtx.limit} onChange={(e) => setPreviewCtx((p) => ({ ...p, limit: e.target.value }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">cityId</span>
                      <Input value={previewCtx.cityId} onChange={(e) => setPreviewCtx((p) => ({ ...p, cityId: e.target.value }))} placeholder="UUID" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">landingId</span>
                      <Input value={previewCtx.landingId} onChange={(e) => setPreviewCtx((p) => ({ ...p, landingId: e.target.value }))} placeholder="UUID" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">collectionId</span>
                      <Input value={previewCtx.collectionId} onChange={(e) => setPreviewCtx((p) => ({ ...p, collectionId: e.target.value }))} placeholder="UUID" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">articleId</span>
                      <Input value={previewCtx.articleId} onChange={(e) => setPreviewCtx((p) => ({ ...p, articleId: e.target.value }))} placeholder="UUID" />
                    </label>
                  </div>

                  {previewQ.data ? (
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{previewQ.data.diagnostics.readinessStatus}</Badge>
                        <span className="text-xs text-muted-foreground">
                          scopeMatch={String(previewQ.data.diagnostics.scopeMatch)} · selected={String(previewQ.data.diagnostics.selected)} · rank=
                          {previewQ.data.diagnostics.rank ?? '—'} · activeCount={previewQ.data.diagnostics.activeCount}
                          {previewQ.data.diagnostics.activeTotal !== undefined
                            ? `/${previewQ.data.diagnostics.activeTotal}${previewQ.data.diagnostics.activeTruncated ? '+' : ''}`
                            : ''}
                        </span>
                      </div>

                      {previewQ.data.diagnostics.comparisonToWinner ? (
                        <div className="rounded-md border bg-background px-3 py-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">This vs winner:</span>
                            <Badge variant="outline">{previewQ.data.diagnostics.comparisonToWinner.outcome}</Badge>
                            {previewQ.data.diagnostics.comparisonToWinner.outcome === 'OUTRANKED' ? (
                              (() => {
                                const losesBy = losesByFromComparisonReasons(
                                  previewQ.data?.diagnostics?.comparisonToWinner?.reasons as unknown as string[] | undefined,
                                );
                                return losesBy.length > 0 ? (
                                  <span className="text-muted-foreground">
                                    losesBy: <span className="font-mono">{losesBy.join(',')}</span>
                                  </span>
                                ) : null;
                              })()
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {previewQ.data.diagnostics.comparisonToWinner.reasons.length === 0 ? (
                              <span className="text-muted-foreground">Причины отсутствуют</span>
                            ) : (
                              previewQ.data.diagnostics.comparisonToWinner.reasons.map((c) => (
                                <Badge key={c} variant="default" className="font-mono text-[10px]">
                                  {c}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {(previewQ.data.diagnostics.readinessReasons ?? []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">Причины отсутствуют</span>
                        ) : (
                          previewQ.data.diagnostics.readinessReasons.map((r) => (
                            <Badge key={r} variant="default" className="font-mono text-[11px]">
                              {r}
                            </Badge>
                          ))
                        )}
                      </div>
                      <div className="rounded-md border bg-background">
                        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Resolved top</div>
                        <div className="divide-y">
                          {previewQ.data.resolvedTop.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-muted-foreground">Пусто (нет активных блоков для контекста)</div>
                          ) : (
                            previewQ.data.resolvedTop.map((x, idx) => (
                              <div
                                key={x.id}
                                className={[
                                  'px-3 py-2 text-xs',
                                  x.id === editingId ? 'bg-amber-500/10' : '',
                                ].join(' ')}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="truncate font-medium">
                                      #{idx + 1} · {x.preview.displayTitle}
                                      {x.id === editingId ? ' (this)' : ''}
                                    </div>
                                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                      prio {x.priority} · order {x.sortOrder} · {x.preview.resolvedUrl ?? '—'}
                                    </div>
                                    {x.rankExplanation ? (
                                      <div className="mt-1 text-[10px] text-muted-foreground">
                                        winsBy: <span className="font-mono">{x.rankExplanation.primaryOrderingFactor}</span>
                                      </div>
                                    ) : null}
                                    {x.targetHasSeoIssues && (x.seoIssueCodes?.length ?? 0) > 0 ? (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        <Badge variant="warning">SEO</Badge>
                                        {(x.seoIssueCodes ?? []).slice(0, 3).map((c) => (
                                          <Badge key={c} variant="default" className="font-mono text-[10px]">
                                            {c}
                                          </Badge>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="shrink-0 text-muted-foreground">{x.targetType}</div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {previewQ.data.resolvedAll && previewQ.data.resolvedAll.length > previewQ.data.resolvedTop.length ? (
                        <div className="rounded-md border bg-background">
                          <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                            Active candidates (full list)
                            {previewQ.data.diagnostics.activeTruncated ? ' · truncated' : ''}
                          </div>
                          <div className="divide-y">
                            {previewQ.data.resolvedAll.map((x, idx) => {
                              const isWinner = previewQ.data.diagnostics.winnerId === x.id;
                              const isThis = x.id === editingId;
                              return (
                                <div
                                  key={x.id}
                                  className={[
                                    'px-3 py-2 text-xs',
                                    isWinner ? 'bg-emerald-500/10' : '',
                                    isThis && !isWinner ? 'bg-amber-500/10' : '',
                                  ].join(' ')}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="truncate font-medium">
                                        #{idx + 1} · {x.preview.displayTitle}
                                        {isWinner ? ' (winner)' : ''}
                                        {isThis ? ' (this)' : ''}
                                      </div>
                                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                        prio {x.priority} · order {x.sortOrder} · {x.preview.resolvedUrl ?? '—'}
                                      </div>
                                    {x.rankExplanation ? (
                                      <div className="mt-1 text-[10px] text-muted-foreground">
                                        winsBy: <span className="font-mono">{x.rankExplanation.primaryOrderingFactor}</span>
                                      </div>
                                    ) : null}
                                      {x.targetHasSeoIssues && (x.seoIssueCodes?.length ?? 0) > 0 ? (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          <Badge variant="warning">SEO</Badge>
                                          {(x.seoIssueCodes ?? []).slice(0, 3).map((c) => (
                                            <Badge key={c} variant="default" className="font-mono text-[10px]">
                                              {c}
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="shrink-0 text-muted-foreground">{x.targetType}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : previewLoadedOnce && previewQ.isError ? (
                    <div className="mt-3 text-sm text-destructive">Не удалось загрузить предпросмотр</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlacementRow({
  row,
  busy,
  onEdit,
  onPublish,
  onArchive,
}: {
  row: PromoPlacementBlockListItem;
  busy: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-3 py-3 align-top">
        <div className="font-medium">{row.placementZone}</div>
        <div className="mt-1 text-xs text-muted-foreground">{row.status}</div>
        {row.isCurrentlyActive ? (
          <Badge variant="outline" className="mt-1 border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200">
            active now
          </Badge>
        ) : null}
      </td>
      <td className="px-3 py-3 align-top text-xs">
        <div className="font-medium">{row.pageScopeType}</div>
        <div className="mt-1 text-muted-foreground">
          {row.city ? `city:${row.city.slug}` : row.landing ? `landing:${row.landing.slug}` : row.collection ? `collection:${row.collection.slug}` : row.article ? `article:${row.article.slug}` : 'global'}
        </div>
      </td>
      <td className="px-3 py-3 align-top text-xs">
        <div className="font-medium">{row.targetType}</div>
        {row.targetSummary ? (
          <div className="mt-1 text-muted-foreground">
            <Link className="hover:underline" to={`/admin-v3/${row.targetType === 'EVENT' ? 'events' : row.targetType === 'COLLECTION' ? 'collections' : row.targetType === 'LANDING' ? 'landings' : 'articles'}/${encodeURIComponent(row.targetSummary.id)}`}>
              {row.preview?.displayTitle ?? row.targetSummary.title}
            </Link>
          </div>
        ) : (
          <div className="mt-1 text-destructive">target не задан</div>
        )}
        {row.preview?.resolvedUrl ? <div className="mt-1 font-mono text-[11px] text-muted-foreground">{row.preview.resolvedUrl}</div> : null}
        {row.targetHasSeoIssues && (row.seoIssueCodes?.length ?? 0) > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="warning">SEO</Badge>
            {(row.seoIssueCodes ?? []).slice(0, 3).map((c) => (
              <Badge key={c} variant="default" className="font-mono text-[10px]">
                {c}
              </Badge>
            ))}
            {(row.seoIssueCodes ?? []).length > 3 ? (
              <span className="text-[10px] text-muted-foreground">+{(row.seoIssueCodes ?? []).length - 3}</span>
            ) : null}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3 align-top text-xs text-muted-foreground">
        <div>from: {fmtDt(row.startsAt)}</div>
        <div>to: {fmtDt(row.endsAt)}</div>
      </td>
      <td className="px-3 py-3 align-top text-xs">
        <div className="text-muted-foreground">prio {row.priority}</div>
        <div className="text-muted-foreground">order {row.sortOrder}</div>
        <div className="mt-1 text-muted-foreground">upd: {fmtDt(row.updatedAt)}</div>
      </td>
      <td className="px-3 py-3 align-top text-xs">
        <div className="font-medium">{row.readinessStatus ?? '—'}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {(row.readinessReasons ?? []).slice(0, 3).map((r) => (
            <Badge key={r} variant="default" className="font-mono text-[10px]">
              {r}
            </Badge>
          ))}
          {(row.readinessReasons ?? []).length > 3 ? (
            <span className="text-[10px] text-muted-foreground">+{(row.readinessReasons ?? []).length - 3}</span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3 align-top text-right">
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="default" disabled={busy} onClick={onEdit}>
            Открыть
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy || row.status === 'PUBLISHED'} onClick={onPublish}>
            Publish
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy || row.status === 'ARCHIVED'} onClick={onArchive}>
            Archive
          </Button>
        </div>
      </td>
    </tr>
  );
}

