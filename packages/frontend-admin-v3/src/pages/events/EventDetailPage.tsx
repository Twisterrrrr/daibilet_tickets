import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { DetailTabs } from '@/components/shared/detail/DetailTabs';
import { SummaryStrip } from '@/components/shared/detail/SummaryStrip';
import { KeyValueList } from '@/components/shared/detail/KeyValueList';
import { StickySaveBar } from '@/components/shared/detail/StickySaveBar';
import { StatusPill } from '@/components/shared/status-pill/StatusPill';
import { OverrideBadge } from '@/components/shared/badges/OverrideBadge';
import { ContentIssueBadge } from '@/components/shared/badges/ContentIssueBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { fetchAdminEventDetail } from '@/modules/events/api/detail';
import { fetchAdminEventSummary } from '@/modules/events/api/summary';
import {
  EVENT_PRIMARY_KIND_LABELS,
  initialPrimaryKindSelect,
  isPrimaryKindAmbiguous,
  type EventPrimaryKind,
} from '@/modules/events/lib/event-primary-kind';
import { sortEventSubcategoryOptions } from '@/modules/events/lib/event-subcategory-options-sort';
import { EventCategoryPricesTab } from '@/modules/events/components/detail/EventCategoryPricesTab';
import { EventMediaTab } from '@/modules/events/components/detail/EventMediaTab';
import { EventReadinessPanel } from '@/modules/events/components/detail/EventReadinessPanel';
import { EventScheduleTab } from '@/modules/events/components/detail/EventScheduleTab';
import { EventRouteTab } from '@/modules/events/components/detail/EventRouteTab';
import { EventLandingTableFacetsPanel } from '@/modules/events/components/detail/EventLandingTableFacetsPanel';
import { EventCateringPanel } from '@/modules/events/components/detail/EventCateringPanel';
import { eventShowsRiverLandingTableFacets } from '@/modules/events/lib/event-river-landing-facets';
import { adminApi } from '@/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

type PublishGateCheck = { code: string; status: 'OK' | 'WARNING' | 'BLOCKING'; message: string };
type PublishGateResult = { result: 'OK' | 'WARNING' | 'BLOCKING'; checks: PublishGateCheck[] };

type PublishEventResult =
  | { ok: true; gate: PublishGateResult; issues: unknown[] }
  | { ok: false; gate: PublishGateResult; issues: Array<{ code: string; message: string }> };

/** Строка справочника: основной слой — по категории; дополнительный — общие и теги события. */
type SubcatPickerRow = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  layer: 'PRIMARY' | 'SECONDARY';
  catalogKind?: 'UNIVERSAL' | 'EVENT_ONLY';
};

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = id ?? '';
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ['admin-event', eventId],
    enabled: Boolean(eventId),
    queryFn: () => fetchAdminEventDetail(eventId),
  });

  const summary = useQuery({
    queryKey: ['admin-event-summary', eventId],
    enabled: Boolean(eventId),
    queryFn: () => fetchAdminEventSummary(eventId),
  });

  const [tab, setTab] = React.useState('info');
  const [publishPanelOpen, setPublishPanelOpen] = React.useState<boolean>(false);
  const [isArchivedDraft, setIsArchivedDraft] = React.useState(false);
  const [primarySubcategoryIdDraft, setPrimarySubcategoryIdDraft] = React.useState('');
  const [secondarySubcategoryIdsDraft, setSecondarySubcategoryIdsDraft] = React.useState<string[]>([]);
  const [primaryKindDraft, setPrimaryKindDraft] = React.useState<'' | EventPrimaryKind>('');

  const row = detail.data;

  const initialSubcategoryIds = React.useMemo(
    () => (row?.subcategoriesCanonical ?? []).map((s) => s.id),
    [row?.subcategoriesCanonical],
  );

  const initialPrimaryKind = React.useMemo(() => (row ? initialPrimaryKindSelect(row) : ''), [row]);

  React.useEffect(() => {
    if (row) setIsArchivedDraft(Boolean(row.isArchived));
  }, [row?.isArchived, row]);

  React.useEffect(() => {
    setPrimaryKindDraft(initialPrimaryKind);
  }, [initialPrimaryKind]);

  const publishM = useMutation({
    mutationFn: async () => {
      return adminApi.post<PublishEventResult>(`/admin/events/${eventId}/publish`, {});
    },
    onSuccess: async () => {
      setPublishPanelOpen(true);
      await qc.invalidateQueries({ queryKey: ['admin-event', eventId] });
      await qc.invalidateQueries({ queryKey: ['admin-event-summary', eventId] });
      await qc.invalidateQueries({ queryKey: ['admin-events'] });
    },
  });

  const unpublishM = useMutation({
    mutationFn: async () => {
      return adminApi.post<{ ok: true }>(`/admin/events/${eventId}/unpublish`, {});
    },
    onSuccess: async () => {
      setPublishPanelOpen(false);
      await qc.invalidateQueries({ queryKey: ['admin-event', eventId] });
      await qc.invalidateQueries({ queryKey: ['admin-event-summary', eventId] });
      await qc.invalidateQueries({ queryKey: ['admin-events'] });
    },
  });

  const subcategoriesPrimaryQuery = useQuery({
    queryKey: ['admin-event-subcategories-primary', primaryKindDraft],
    enabled: Boolean(eventId) && primaryKindDraft !== '',
    queryFn: async () => {
      const rows = await adminApi.get<
        Array<{ id: string; slug: string; nameRu: string; isActive: boolean; type?: string }>
      >(`/admin/subcategories?forEntity=event&layer=PRIMARY&type=${encodeURIComponent(primaryKindDraft)}`);
      const raw = Array.isArray(rows) ? rows : [];
      return raw
        .filter((s) => s && typeof s.id === 'string' && typeof s.slug === 'string' && typeof s.nameRu === 'string')
        .map(
          (s): SubcatPickerRow => ({
            id: s.id,
            slug: s.slug,
            name: s.nameRu,
            isActive: Boolean(s.isActive),
            layer: 'PRIMARY',
            catalogKind: s.type === 'UNIVERSAL' ? 'UNIVERSAL' : 'EVENT_ONLY',
          }),
        );
    },
    staleTime: 60_000,
  });

  const subcategoriesSecondaryQuery = useQuery({
    queryKey: ['admin-event-subcategories-secondary'],
    enabled: Boolean(eventId) && primaryKindDraft !== '',
    queryFn: async () => {
      const rows = await adminApi.get<
        Array<{ id: string; slug: string; nameRu: string; isActive: boolean; type?: string }>
      >(`/admin/subcategories?forEntity=event&layer=SECONDARY`);
      const raw = Array.isArray(rows) ? rows : [];
      return raw
        .filter((s) => s && typeof s.id === 'string' && typeof s.slug === 'string' && typeof s.nameRu === 'string')
        .map(
          (s): SubcatPickerRow => ({
            id: s.id,
            slug: s.slug,
            name: s.nameRu,
            isActive: Boolean(s.isActive),
            layer: 'SECONDARY',
            catalogKind: s.type === 'UNIVERSAL' ? 'UNIVERSAL' : 'EVENT_ONLY',
          }),
        );
    },
    staleTime: 60_000,
  });

  /** Разбор сохранённых связей: поле `layer` с бэкенда; иначе эвристика по справочникам основной/дополнительный. */
  const initialSubcategorySplit = React.useMemo(() => {
    const canon = row?.subcategoriesCanonical ?? [];
    if (!primaryKindDraft) return { primary: '', secondary: [] as string[] };
    const pl = subcategoriesPrimaryQuery.data;
    const sl = subcategoriesSecondaryQuery.data;
    if (!pl || !sl) return { primary: '', secondary: [] as string[] };
    const pa = new Set(pl.map((p) => p.id));
    const sa = new Set(sl.map((s) => s.id));
    const seen = new Set<string>();
    let primary = '';
    const secondary: string[] = [];
    for (const c of canon) {
      if (c.layer === 'PRIMARY') {
        if (!primary) primary = c.id;
        continue;
      }
      if (c.layer === 'SECONDARY') {
        if (!seen.has(c.id)) {
          secondary.push(c.id);
          seen.add(c.id);
        }
        continue;
      }
      if (pa.has(c.id)) {
        if (!primary) primary = c.id;
        continue;
      }
      if (sa.has(c.id) || !c.layer) {
        if (!seen.has(c.id)) {
          secondary.push(c.id);
          seen.add(c.id);
        }
      }
    }
    return { primary, secondary };
  }, [row?.subcategoriesCanonical, primaryKindDraft, subcategoriesPrimaryQuery.data, subcategoriesSecondaryQuery.data]);

  React.useEffect(() => {
    setPrimarySubcategoryIdDraft(initialSubcategorySplit.primary);
    setSecondarySubcategoryIdsDraft(initialSubcategorySplit.secondary);
  }, [initialSubcategorySplit.primary, initialSubcategorySplit.secondary.join('|')]);

  const selectedSubcats = React.useMemo(() => {
    const rows = (row?.subcategoriesCanonical ?? []).map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      isActive: s.isActive !== false,
      layer: s.layer,
      subcategoryType: s.subcategoryType,
    }));
    const byId = new Map(rows.map((x) => [x.id, x]));
    return { rows, byId };
  }, [row?.subcategoriesCanonical]);

  const optionsWithLegacy = React.useMemo(() => {
    const primary = subcategoriesPrimaryQuery.data ?? [];
    const secondary = subcategoriesSecondaryQuery.data ?? [];
    const merged: SubcatPickerRow[] = [...primary, ...secondary];
    const byId = new Map(merged.map((o) => [o.id, o]));

    for (const s of selectedSubcats.rows) {
      if (!byId.has(s.id)) {
        const inPrimary = (subcategoriesPrimaryQuery.data ?? []).some((p) => p.id === s.id);
        const layer = s.layer ?? (inPrimary ? 'PRIMARY' : 'SECONDARY');
        const st = s.subcategoryType;
        const catalogKind =
          st === 'UNIVERSAL' ? ('UNIVERSAL' as const) : st === 'EVENT_ONLY' || st === 'VENUE_ONLY' ? ('EVENT_ONLY' as const) : undefined;
        merged.push({
          id: s.id,
          slug: s.slug,
          name: s.name,
          isActive: false,
          layer,
          catalogKind,
        });
      }
    }
    return merged;
  }, [subcategoriesPrimaryQuery.data, subcategoriesSecondaryQuery.data, selectedSubcats.rows]);

  const selectedInactiveIds = React.useMemo(() => {
    return selectedSubcats.rows.filter((s) => s.isActive === false).map((s) => s.id);
  }, [selectedSubcats.rows]);

  /** После смены категории основной формат сбрасывается, если недоступен; дополнительные теги фильтруем по справочнику. */
  React.useEffect(() => {
    if (!primaryKindDraft) return;
    if (subcategoriesPrimaryQuery.isLoading || subcategoriesSecondaryQuery.isLoading) return;
    const pa = subcategoriesPrimaryQuery.data ?? [];
    const sa = subcategoriesSecondaryQuery.data ?? [];
    const primaryAllowed = new Set(pa.map((o) => o.id));
    const secondaryAllowed = new Set(sa.map((o) => o.id));
    setPrimarySubcategoryIdDraft((prev) => (prev && primaryAllowed.has(prev) ? prev : ''));
    setSecondarySubcategoryIdsDraft((prev) =>
      prev.filter((id) => secondaryAllowed.has(id) || selectedInactiveIds.includes(id)),
    );
  }, [
    primaryKindDraft,
    subcategoriesPrimaryQuery.data,
    subcategoriesPrimaryQuery.isLoading,
    subcategoriesSecondaryQuery.data,
    subcategoriesSecondaryQuery.isLoading,
    selectedInactiveIds,
  ]);

  /** Один и тот же id не должен быть и основным, и дополнительным. */
  React.useEffect(() => {
    if (!primarySubcategoryIdDraft) return;
    setSecondarySubcategoryIdsDraft((prev) => prev.filter((id) => id !== primarySubcategoryIdDraft));
  }, [primarySubcategoryIdDraft]);

  const sortCtx = React.useMemo(
    () => ({
      primaryKind: primaryKindDraft,
      sectionsDerived: row?.sectionsDerived,
    }),
    [primaryKindDraft, row?.sectionsDerived],
  );

  const primaryActiveOptions = React.useMemo(() => {
    const active = optionsWithLegacy.filter((s) => s.isActive && s.layer === 'PRIMARY');
    return sortEventSubcategoryOptions(active, sortCtx);
  }, [optionsWithLegacy, sortCtx]);

  const secondaryActiveOptions = React.useMemo(() => {
    const active = optionsWithLegacy.filter((s) => s.isActive && s.layer === 'SECONDARY');
    return sortEventSubcategoryOptions(active, sortCtx);
  }, [optionsWithLegacy, sortCtx]);

  const secondaryActiveOptionsForPicker = React.useMemo(
    () => secondaryActiveOptions.filter((s) => s.id !== primarySubcategoryIdDraft),
    [secondaryActiveOptions, primarySubcategoryIdDraft],
  );

  const primarySelectRows = React.useMemo(() => {
    const active = primaryActiveOptions;
    const cur = primarySubcategoryIdDraft;
    if (cur && !active.some((o) => o.id === cur)) {
      const legacy = optionsWithLegacy.find((o) => o.id === cur && o.layer === 'PRIMARY');
      if (legacy) {
        return sortEventSubcategoryOptions(
          [legacy, ...active.filter((a) => a.id !== cur)],
          sortCtx,
        );
      }
    }
    return active;
  }, [primaryActiveOptions, primarySubcategoryIdDraft, optionsWithLegacy, sortCtx]);

  const subcatListsLoading = subcategoriesPrimaryQuery.isLoading || subcategoriesSecondaryQuery.isLoading;
  const subcatListsError = subcategoriesPrimaryQuery.isError || subcategoriesSecondaryQuery.isError;

  const mergedSubcategoryDraftIds = React.useMemo(() => {
    const out: string[] = [];
    if (primarySubcategoryIdDraft) out.push(primarySubcategoryIdDraft);
    out.push(...secondarySubcategoryIdsDraft);
    return out;
  }, [primarySubcategoryIdDraft, secondarySubcategoryIdsDraft]);

  const toggleSecondarySubcategoryId = React.useCallback(
    (subId: string) => {
      if (selectedInactiveIds.includes(subId)) return;
      if (subId === primarySubcategoryIdDraft) return;
      setSecondarySubcategoryIdsDraft((prev) => {
        if (prev.includes(subId)) return prev.filter((x) => x !== subId);
        return [...prev, subId];
      });
    },
    [selectedInactiveIds, primarySubcategoryIdDraft],
  );

  const dirtyArchived = row ? isArchivedDraft !== Boolean(row.isArchived) : false;
  const dirtySubcategories = React.useMemo(() => {
    const a = [...initialSubcategoryIds].sort();
    const b = [...mergedSubcategoryDraftIds].sort();
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return true;
    }
    return false;
  }, [initialSubcategoryIds, mergedSubcategoryDraftIds]);
  const dirtyPrimaryKind = initialPrimaryKind !== primaryKindDraft;
  const dirty = dirtyArchived || dirtySubcategories || dirtyPrimaryKind;

  if (!eventId) {
    return <ErrorState title="Некорректный ID" description="Не указан идентификатор события." />;
  }

  if (detail.isLoading) return <LoadingState label="Загрузка события…" />;
  if (detail.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить событие"
        description={detail.error instanceof Error ? detail.error.message : 'Ошибка'}
        onRetry={() => detail.refetch()}
      />
    );
  }

  const e = row;
  if (!e) return <LoadingState label="Загрузка события…" />;
  const readiness = summary.data?.readiness;
  const lastSyncAt = summary.data?.integration.lastSyncAt;

  const isPublishedInCatalog = (e.override?.editorStatus ?? null) === 'PUBLISHED' || e.publishStatus === 'PUBLISHED';

  const previewBase = (import.meta as any).env?.VITE_PUBLIC_SITE_URL as string | undefined;
  const previewUrl = `${previewBase ?? ''}/events/${e.slug}`;

  const classificationSourceLabel = (src: NonNullable<typeof readiness>['classificationSource']): string => {
    if (src === 'LINKS') return 'по связям подкатегорий';
    if (src === 'LEGACY_ENUM') return 'по старому полю';
    if (src === 'NONE') return 'не задана';
    return src;
  };

  const summaryItems = [
    { label: 'Источник', value: e.source },
    { label: 'Оператор', value: e.supplier?.name ?? '—' },
    { label: 'External ID', value: e.tcEventId ?? '—' },
    { label: 'Последняя синхронизация', value: lastSyncAt ? new Date(lastSyncAt).toLocaleString('ru-RU') : '—' },
    {
      label: 'Ближайший сеанс',
      value: e.scheduleSummary?.nextSessionAt
        ? new Date(e.scheduleSummary.nextSessionAt).toLocaleString('ru-RU')
        : '—',
    },
    {
      label: 'Будущих сеансов',
      value: <span className="tabular-nums">{e.scheduleSummary?.futureSessionsCount ?? '—'}</span>,
    },
    {
      label: 'Готовность',
      value: readiness ? (
        <StatusPill
          label={readiness.status === 'READY' ? 'Готово' : readiness.status === 'NEEDS_WORK' ? 'Нужна проверка' : 'Блок'}
          tone={readiness.status === 'READY' ? 'success' : readiness.status === 'NEEDS_WORK' ? 'warning' : 'danger'}
        />
      ) : (
        '—'
      ),
    },
    {
      label: 'Классификация',
      value: readiness ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{classificationSourceLabel(readiness.classificationSource)}</Badge>
          {readiness.classificationNeedsReview ? <Badge variant="warning">нужна проверка</Badge> : null}
        </div>
      ) : (
        '—'
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={e.title}
        subtitle={e.city?.name ? `Город: ${e.city.name}` : 'Карточка события (V3)'}
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link to="/admin-v3/events">К списку</Link>
            </Button>
            {isPublishedInCatalog ? (
              <Button
                type="button"
                variant="outline"
                disabled={publishM.isPending || unpublishM.isPending}
                onClick={() => {
                  if (!confirm('Снять событие с публикации в каталоге?')) return;
                  unpublishM.mutate();
                }}
                title="Снять публикацию: событие перестанет попадать в витринный каталог"
              >
                {unpublishM.isPending ? 'Снимаю…' : 'Снять публикацию'}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={publishM.isPending || unpublishM.isPending}
                onClick={() => publishM.mutate()}
                title="Опубликовать в каталог (пройдёт quality gate)"
              >
                {publishM.isPending ? 'Публикую…' : 'Опубликовать'}
              </Button>
            )}
            <Button type="button" variant="outline" asChild>
              <a href={previewUrl} target="_blank" rel="noreferrer">
                Публичная страница
              </a>
            </Button>
          </>
        }
      />

      <SummaryStrip items={summaryItems} />

      {publishM.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {publishM.error instanceof Error ? publishM.error.message : 'Ошибка публикации'}
        </div>
      ) : null}
      {unpublishM.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {unpublishM.error instanceof Error ? unpublishM.error.message : 'Ошибка снятия публикации'}
        </div>
      ) : null}

      {publishPanelOpen && publishM.data ? (
        <div className="rounded-lg border bg-card p-5 text-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium">Публикация</div>
            {'ok' in publishM.data && publishM.data.ok ? (
              <Badge variant="info">OK</Badge>
            ) : (
              <Badge variant="warning">Нельзя опубликовать</Badge>
            )}
            <Badge variant="outline">{publishM.data.gate.result}</Badge>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground">Gate checks</div>
            <ul className="mt-2 list-inside list-disc text-xs">
              {publishM.data.gate.checks.map((c) => (
                <li key={c.code}>
                  <span className="font-mono">{c.code}</span> — {c.status}: {c.message}
                </li>
              ))}
            </ul>
          </div>

          {'ok' in publishM.data && !publishM.data.ok && publishM.data.issues?.length ? (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Quality issues</div>
              <ul className="mt-2 list-inside list-disc text-xs">
                {publishM.data.issues.map((i) => (
                  <li key={`${i.code}:${i.message}`}>
                    <span className="font-mono">{i.code}</span> — {i.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setPublishPanelOpen(false)}>
              Скрыть
            </Button>
          </div>
        </div>
      ) : null}

      <DetailTabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          {
            value: 'info',
            label: 'Основное',
            content: (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-lg border bg-card p-5">
                  <div className="text-sm font-medium">Основное</div>
                  <div className="mt-4">
                    <KeyValueList
                      rows={[
                        { key: 'Название', value: e.title },
                        { key: 'Слаг (URL)', value: <span className="font-mono text-sm">{e.slug}</span> },
                        { key: 'Источник', value: e.source },
                        {
                          key: 'Статус',
                          value: (
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusPill
                                label={e.isArchived ? 'В архиве' : e.isActive ? 'Активно' : 'Неактивно'}
                                tone={e.isArchived ? 'warning' : e.isActive ? 'success' : 'outline'}
                              />
                              {e.override ? <OverrideBadge hidden={Boolean(e.override.isHidden)} /> : null}
                            </div>
                          ),
                        },
                        { key: 'Город', value: e.city?.name ?? '—' },
                        { key: 'Площадка', value: e.venue?.title ?? '—' },
                        { key: 'Оператор', value: e.supplier?.name ?? '—' },
                        { key: 'Режим дат', value: e.dateMode ?? '—' },
                        { key: 'Длительность (мин)', value: e.durationMinutes ?? '—' },
                        { key: 'Статус публикации', value: e.publishStatus ?? '—' },
                        { key: 'Возраст', value: e.minAge ?? e.ageMin ?? '—' },
                        { key: 'Обновлено', value: new Date(e.updatedAt).toLocaleString('ru-RU') },
                        { key: 'Последний сеанс', value: e.lastSessionAt ? new Date(e.lastSessionAt).toLocaleString('ru-RU') : '—' },
                        { key: 'Прошедшее', value: e.isPast ? 'Да' : 'Нет' },
                        { key: 'Архив', value: e.isArchived ? 'Да' : 'Нет' },
                        { key: 'Индексируется', value: e.isIndexable ? 'Да' : 'Нет' },
                      ]}
                    />
                  </div>
                  <div className="mt-5 border-t pt-4">
                    <div className="text-xs font-medium text-muted-foreground">Управление</div>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isArchivedDraft}
                        onChange={(ev) => setIsArchivedDraft(ev.target.checked)}
                      />
                      В архив
                    </label>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-5">
                  <div className="text-sm font-medium">Связи: классификация</div>
                  <div className="mt-4 space-y-5">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Тип события (каталог)</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        От него зависит набор основных подкатегорий в справочнике. При неоднозначных производных секциях выберите тип
                        вручную.
                      </p>
                      <select
                        className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm"
                        value={primaryKindDraft}
                        onChange={(ev) => {
                          const v = ev.target.value;
                          setPrimaryKindDraft(v === '' ? '' : (v as EventPrimaryKind));
                        }}
                      >
                        <option value="">Не задано — выберите вручную</option>
                        {(Object.keys(EVENT_PRIMARY_KIND_LABELS) as EventPrimaryKind[]).map((k) => (
                          <option key={k} value={k}>
                            {EVENT_PRIMARY_KIND_LABELS[k]}
                          </option>
                        ))}
                      </select>
                      {isPrimaryKindAmbiguous(e.sectionsDerived) ? (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                          Производные секции относятся к разным типам — укажите тип явно.
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Производные секции (только просмотр)</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(e.sectionsDerived ?? []).length ? (
                          (e.sectionsDerived ?? []).map((s) => (
                            <Badge key={s.slug} variant="info">
                              {s.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Подкатегории (канонические)</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Один основной формат — только из списка для выбранной категории каталога. Дополнительно можно отметить
                        несколько тегов: общие для всех направлений и специальные для событий.
                      </p>
                      <div className="mt-3 space-y-4">
                        {!primaryKindDraft ? (
                          <div className="text-sm text-muted-foreground">
                            Сначала выберите тип события выше — тогда здесь появятся допустимые подкатегории.
                          </div>
                        ) : subcatListsLoading ? (
                          <div className="text-sm text-muted-foreground">Загрузка справочника…</div>
                        ) : subcatListsError ? (
                          <div className="text-sm text-destructive">Не удалось загрузить подкатегории</div>
                        ) : (
                          <>
                            <div>
                              <div className="text-xs font-semibold text-foreground">Основной формат</div>
                              <p className="mt-1 text-[11px] text-muted-foreground">Ровно один вариант под категорию каталога.</p>
                              {primarySelectRows.length === 0 ? (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  В справочнике нет активных основных подкатегорий для этой категории.
                                </p>
                              ) : (
                                <select
                                  className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm"
                                  value={primarySubcategoryIdDraft}
                                  onChange={(ev) => setPrimarySubcategoryIdDraft(ev.target.value)}
                                >
                                  <option value="">— не выбрано —</option>
                                  {primarySelectRows.map((s) => (
                                    <option key={s.id} value={s.id} disabled={!s.isActive}>
                                      {s.name} ({s.slug})
                                      {!s.isActive ? ' · неактивна' : ''}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-foreground">Дополнительные теги</div>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Можно выбрать несколько. Пометка «общий» — тег подходит ко всем направлениям каталога; остальные
                                относятся только к событиям.
                              </p>
                              <div className="mt-2 max-h-[min(65vh,36rem)] min-h-[10rem] space-y-2 overflow-y-auto rounded-md border bg-background p-3">
                                {secondaryActiveOptionsForPicker.length === 0 ? (
                                  <div className="text-sm text-muted-foreground">В справочнике нет активных дополнительных тегов.</div>
                                ) : (
                                  secondaryActiveOptionsForPicker.map((s) => {
                                    const checked = secondarySubcategoryIdsDraft.includes(s.id);
                                    return (
                                      <label key={s.id} className="flex cursor-pointer items-start gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          className="mt-0.5"
                                          checked={checked}
                                          onChange={() => toggleSecondarySubcategoryId(s.id)}
                                        />
                                        <span>
                                          <span className="font-medium">{s.name}</span>
                                          <span className="ml-1 font-mono text-xs text-muted-foreground">({s.slug})</span>
                                          {s.catalogKind === 'UNIVERSAL' ? (
                                            <span className="ml-1 text-xs text-muted-foreground">· общий</span>
                                          ) : null}
                                        </span>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </>
                        )}
                        {optionsWithLegacy.some((s) => !s.isActive) ? (
                          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                            <div className="text-xs font-medium text-amber-800 dark:text-amber-200">
                              Устаревшие / неактивные (только просмотр)
                            </div>
                            <ul className="mt-2 space-y-1">
                              {optionsWithLegacy
                                .filter((s) => !s.isActive)
                                .map((s) => (
                                  <li key={s.id} className="text-xs text-muted-foreground">
                                    <input
                                      type="checkbox"
                                      checked={mergedSubcategoryDraftIds.includes(s.id)}
                                      readOnly
                                      disabled
                                      className="mr-2"
                                    />
                                    {s.layer === 'PRIMARY' ? 'Основная' : 'Дополнительная'} · {s.name} ({s.slug})
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>
                            Основной формат:{' '}
                            <span className="text-foreground">{primarySubcategoryIdDraft ? 'выбран' : 'не выбран'}</span>
                            {' · Дополнительных тегов: '}
                            <span className="tabular-nums text-foreground">{secondarySubcategoryIdsDraft.length}</span>
                            {selectedInactiveIds.length ? (
                              <span className="text-muted-foreground">
                                {' '}
                                (устаревших в карточке: {selectedInactiveIds.length})
                              </span>
                            ) : null}
                          </span>
                          {primaryKindDraft && !primarySubcategoryIdDraft ? (
                            <span className="text-destructive">Выберите основной формат</span>
                          ) : null}
                          {selectedInactiveIds.length ? (
                            <span className="text-amber-700 dark:text-amber-300">
                              Есть устаревшие или неактивные подкатегории: они недоступны для новых выборов и не редактируются.
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(e.subcategoriesCanonical ?? []).map((s) => {
                            const inactive = s.isActive === false;
                            return (
                              <Badge
                                key={s.id}
                                variant={inactive ? 'warning' : 'outline'}
                                className={inactive ? 'gap-1' : undefined}
                                title={inactive ? 'Устаревшая / неактивная (только просмотр)' : undefined}
                              >
                                {s.name}
                                {inactive ? <span className="ml-1 rounded bg-background/60 px-1 text-[10px]">устар.</span> : null}
                              </Badge>
                            );
                          })}
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            value: 'readiness',
            label: 'Готовность',
            content:
              summary.isLoading ? (
                <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Загрузка готовности…</div>
              ) : summary.isError || !readiness ? (
                <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Сводка готовности недоступна</div>
              ) : (
                <div className="space-y-4">
                  <EventReadinessPanel readiness={readiness} />
                  <div className="rounded-lg border bg-card p-5">
                    <div className="text-sm font-medium">Чеклист</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!readiness.checklist.hasDescription ? <ContentIssueBadge count={1} tone="warning" /> : null}
                      {!readiness.checklist.hasImage ? <ContentIssueBadge count={1} tone="warning" /> : null}
                      {!readiness.checklist.hasCategory ? <ContentIssueBadge count={1} tone="warning" /> : null}
                      {!readiness.checklist.hasPrice ? <ContentIssueBadge count={1} tone="warning" /> : null}
                      {!readiness.checklist.hasFutureSlots ? <ContentIssueBadge count={1} tone="warning" /> : null}
                    </div>
                  </div>
                </div>
              ),
          },
          {
            value: 'content',
            label: 'Контент',
            content: (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Тексты пока только для просмотра (источник синхронизации). Разделы можно раскрывать по очереди.
                </p>
                {eventShowsRiverLandingTableFacets(e) ? (
                  <div className="space-y-2">
                    <EventLandingTableFacetsPanel eventId={e.id} detail={e} />
                    <EventCateringPanel eventId={e.id} detail={e} />
                  </div>
                ) : null}
                {(
                  [
                    {
                      key: 'short',
                      title: 'Краткое описание',
                      value: e.shortDescription ?? e.summary ?? '',
                      rows: 5,
                    },
                    { key: 'full', title: 'Полное описание', value: e.description ?? '', rows: 10 },
                    { key: 'meet', title: 'Точка сбора / встреча', value: e.meetingPoint ?? '', rows: 5 },
                    { key: 'refund', title: 'Возврат / отмена', value: e.refundPolicyText ?? '', rows: 5 },
                  ] as const
                ).map((block) => (
                  <details
                    key={block.key}
                    className="group rounded-lg border border-border/80 bg-card open:shadow-sm"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                      {block.title}
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="border-t px-4 py-3">
                      <textarea
                        rows={block.rows}
                        className="w-full rounded-md border bg-background p-2 text-sm"
                        value={block.value}
                        readOnly
                      />
                    </div>
                  </details>
                ))}
              </div>
            ),
          },
          {
            value: 'media',
            label: 'Медиа',
            content: <EventMediaTab eventId={e.id} detail={e} />,
          },
          {
            value: 'schedule',
            label: 'Расписание',
            content: (
              <EventScheduleTab
                eventId={e.id}
                importedLocked={Boolean(e.scheduleSummary?.importedSessionsReadOnly)}
                scheduleSummary={e.scheduleSummary}
              />
            ),
          },
          {
            value: 'route',
            label: 'Маршрут',
            content: <EventRouteTab eventId={e.id} />,
          },
          {
            value: 'pricing',
            label: 'Категории и цены',
            content: <EventCategoryPricesTab detail={e} />,
          },
          {
            value: 'seo',
            label: 'Поиск и URL',
            content: (
              <div className="rounded-lg border bg-card p-5">
                <div className="text-sm font-medium">SEO и URL</div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Публичный URL (по слагу)</div>
                    <input
                      className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm font-mono"
                      value={previewUrl}
                      readOnly
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">H1 (если задано в слое SEO)</div>
                    <input className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={e.h1 ?? e.title} readOnly />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Заголовок страницы (SEO)</div>
                    <input className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={e.seoTitle ?? ''} readOnly />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Описание страницы (SEO)</div>
                    <textarea className="mt-1 h-24 w-full rounded-md border bg-background p-2 text-sm" value={e.seoDescription ?? ''} readOnly />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Индексация на витрине зависит от наличия будущих сеансов и политики каталога; слаг остаётся уникальным.
                  </div>
                </div>
              </div>
            ),
          },
          {
            value: 'tech',
            label: 'Техническое',
            content: (
              <div className="rounded-lg border bg-card p-5">
                <div className="text-sm font-medium">Служебные поля</div>
                <div className="mt-4 font-mono text-xs text-muted-foreground">
                  <div>id: {e.id}</div>
                  <div className="mt-1">source: {e.source}</div>
                  <div className="mt-1">tcEventId: {e.tcEventId ?? '—'}</div>
                </div>
              </div>
            ),
          },
        ]}
      />

      <StickySaveBar
        visible={dirty}
        onReset={() => {
          setIsArchivedDraft(Boolean(e.isArchived));
          setPrimarySubcategoryIdDraft(initialSubcategorySplit.primary);
          setSecondarySubcategoryIdsDraft(initialSubcategorySplit.secondary);
          setPrimaryKindDraft(initialPrimaryKind);
        }}
        onSave={async () => {
          if (dirtyPrimaryKind && !primaryKindDraft) {
            throw new Error('Укажите тип события или сбросьте изменения');
          }
          if (dirtyPrimaryKind && primaryKindDraft) {
            await adminApi.patch(`/admin/events/bulk-update`, {
              ids: [e.id],
              category: primaryKindDraft,
            });
          }
          if (dirtyArchived) {
            await adminApi.patch(`/admin/events/${e.id}/archive`, { isArchived: isArchivedDraft });
          }
          if (dirtySubcategories) {
            if (!primaryKindDraft) {
              throw new Error('Сначала выберите тип события');
            }
            if (!primarySubcategoryIdDraft) {
              throw new Error('Выберите основной формат подкатегории');
            }
            await adminApi.put(`/admin/events/${e.id}/subcategories`, { subcategoryIds: mergedSubcategoryDraftIds });
          }
          await qc.invalidateQueries({ queryKey: ['admin-event', e.id] });
          await qc.invalidateQueries({ queryKey: ['admin-event-summary', e.id] });
          await qc.invalidateQueries({ queryKey: ['admin-events'] });
        }}
      />
    </div>
  );
}

