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
import { adminApi } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

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

  const e = detail.data;
  if (!e) return <LoadingState label="Загрузка события…" />;
  const readiness = summary.data?.readiness;
  const lastSyncAt = summary.data?.integration.lastSyncAt;

  const [isArchivedDraft, setIsArchivedDraft] = React.useState<boolean>(Boolean(e.isArchived));
  React.useEffect(() => {
    setIsArchivedDraft(Boolean(e.isArchived));
  }, [e.isArchived]);

  const initialSubcategoryIds = React.useMemo(
    () => (e.subcategoriesCanonical ?? []).map((s) => s.id),
    [e.subcategoriesCanonical],
  );
  const [subcategoryIdsDraft, setSubcategoryIdsDraft] = React.useState<string[]>(initialSubcategoryIds);
  React.useEffect(() => {
    setSubcategoryIdsDraft(initialSubcategoryIds);
  }, [initialSubcategoryIds]);

  const dirtyArchived = isArchivedDraft !== Boolean(e.isArchived);
  const dirtySubcategories = React.useMemo(() => {
    const a = [...initialSubcategoryIds].sort();
    const b = [...subcategoryIdsDraft].sort();
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return true;
    }
    return false;
  }, [initialSubcategoryIds, subcategoryIdsDraft]);
  const dirty = dirtyArchived || dirtySubcategories;

  const previewBase = (import.meta as any).env?.VITE_PUBLIC_SITE_URL as string | undefined;
  const previewUrl = `${previewBase ?? ''}/events/${e.slug}`;

  const summaryItems = [
    { label: 'Источник', value: e.source },
    { label: 'External ID', value: e.tcEventId ?? '—' },
    { label: 'Последняя синхронизация', value: lastSyncAt ? new Date(lastSyncAt).toLocaleString('ru-RU') : '—' },
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
          <Badge variant="outline">{readiness.classificationSource}</Badge>
          {readiness.classificationNeedsReview ? <Badge variant="warning">нужна проверка</Badge> : null}
        </div>
      ) : (
        '—'
      ),
    },
  ];

  const subcategoriesQuery = useQuery({
    queryKey: ['admin-event-subcategories-options'],
    queryFn: async () => {
      const rows = await adminApi.get<Array<{ id: string; slug: string; nameRu: string; isActive: boolean }>>(
        '/admin/subcategories?forEntity=event&layer=PRIMARY',
      );
      const raw = Array.isArray(rows) ? rows : [];
      return raw
        .filter((s) => s && typeof s.id === 'string' && typeof s.slug === 'string' && typeof s.nameRu === 'string')
        .map((s) => ({ id: s.id, slug: s.slug, name: s.nameRu, isActive: Boolean(s.isActive) }));
    },
    staleTime: 60_000,
  });

  const selectedSubcats = React.useMemo(() => {
    const rows = (e.subcategoriesCanonical ?? []).map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      isActive: s.isActive !== false,
    }));
    const byId = new Map(rows.map((x) => [x.id, x]));
    return { rows, byId };
  }, [e.subcategoriesCanonical]);

  const optionsWithLegacy = React.useMemo(() => {
    const options = subcategoriesQuery.data ?? [];
    const byId = new Map(options.map((o) => [o.id, o]));
    const merged = [...options];

    // Ensure selected legacy/inactive values exist in the options list
    for (const s of selectedSubcats.rows) {
      if (!byId.has(s.id)) {
        merged.push({ id: s.id, slug: s.slug, name: s.name, isActive: false });
      }
    }
    return merged;
  }, [subcategoriesQuery.data, selectedSubcats.rows]);

  const selectedInactiveIds = React.useMemo(() => {
    return selectedSubcats.rows.filter((s) => s.isActive === false).map((s) => s.id);
  }, [selectedSubcats.rows]);

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
            <Button type="button" variant="outline" asChild>
              <a href={previewUrl} target="_blank" rel="noreferrer">
                Публичная страница
              </a>
            </Button>
          </>
        }
      />

      <SummaryStrip items={summaryItems} />

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
                        { key: 'Slug', value: <span className="font-mono text-sm">{e.slug}</span> },
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
                        { key: 'Статус публикации', value: e.publishStatus ?? '—' },
                        { key: 'Возраст', value: e.ageMin ?? '—' },
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
                  <div className="text-sm font-medium">Категория и подкатегории</div>
                  <div className="mt-4 space-y-5">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Категория (derived, read-only)</div>
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
                      <div className="mt-2">
                        <select
                          className="h-32 w-full rounded-md border bg-background p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          multiple
                          value={subcategoryIdsDraft}
                          onChange={(ev) => {
                            const nextRaw = Array.from(ev.target.selectedOptions).map((o) => o.value);
                            const pinnedLegacy = selectedInactiveIds;
                            const pickedActive = nextRaw.filter((id) => !pinnedLegacy.includes(id));
                            const maxActive = Math.max(0, 3 - pinnedLegacy.length);
                            const next = [...pinnedLegacy, ...pickedActive.slice(0, maxActive)];
                            setSubcategoryIdsDraft(next);
                          }}
                        >
                          {optionsWithLegacy
                            .filter((s) => s.isActive)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.slug})
                              </option>
                            ))}
                          {optionsWithLegacy.some((s) => !s.isActive) ? (
                            <optgroup label="legacy / неактивные (read-only)">
                              {optionsWithLegacy
                                .filter((s) => !s.isActive)
                                .map((s) => (
                                  <option key={s.id} value={s.id} disabled>
                                    {s.name} ({s.slug}) — legacy / неактивна
                                  </option>
                                ))}
                            </optgroup>
                          ) : null}
                        </select>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>
                            Выбрано: <span className="tabular-nums text-foreground">{subcategoryIdsDraft.length}</span>
                          </span>
                          {subcategoryIdsDraft.length === 0 ? <span className="text-destructive">Нужно выбрать хотя бы одну</span> : null}
                          {subcategoryIdsDraft.length > 3 ? <span className="text-destructive">Максимум 3</span> : null}
                          {selectedInactiveIds.length ? (
                            <span className="text-amber-700 dark:text-amber-300">
                              Есть legacy/неактивные подкатегории: они недоступны для новых выборов и не редактируются.
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
                                title={inactive ? 'legacy / неактивна (read-only)' : undefined}
                              >
                                {s.name}
                                {inactive ? <span className="ml-1 rounded bg-background/60 px-1 text-[10px]">legacy</span> : null}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            value: 'quality',
            label: 'Качество',
            content: (
              <div className="rounded-lg border bg-card p-5">
                <div className="text-sm font-medium">Качество/проблемы</div>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {summary.isLoading ? (
                      <div>Загрузка summary…</div>
                    ) : summary.isError ? (
                      <div>Summary временно недоступен</div>
                    ) : readiness?.issues?.length ? (
                      readiness.issues.slice(0, 6).map((i) => (
                        <div key={i.code} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{i.code}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{i.message}</div>
                          </div>
                          <StatusPill label={i.severity} tone={i.severity === 'error' ? 'danger' : 'warning'} />
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">Проблем не найдено</div>
                    )}

                    {readiness?.issues?.length ? null : readiness ? (
                      <div className="pt-3">
                        <div className="flex flex-wrap gap-2">
                          {!readiness.checklist.hasDescription ? <ContentIssueBadge count={1} tone="warning" /> : null}
                          {!readiness.checklist.hasImage ? <ContentIssueBadge count={1} tone="warning" /> : null}
                          {!readiness.checklist.hasCategory ? <ContentIssueBadge count={1} tone="warning" /> : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
            ),
          },
          {
            value: 'content',
            label: 'Контент и SEO',
            content: (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-lg border bg-card p-5">
                  <div className="text-sm font-medium">Контент</div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Summary</div>
                      <textarea className="mt-1 h-24 w-full rounded-md border bg-background p-2 text-sm" value={e.summary ?? ''} readOnly />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Description</div>
                      <textarea className="mt-1 h-32 w-full rounded-md border bg-background p-2 text-sm" value={e.description ?? ''} readOnly />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-5">
                  <div className="text-sm font-medium">SEO</div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">H1</div>
                      <input className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={e.h1 ?? ''} readOnly />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">SEO title</div>
                      <input className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={e.seoTitle ?? ''} readOnly />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">SEO description</div>
                      <textarea className="mt-1 h-24 w-full rounded-md border bg-background p-2 text-sm" value={e.seoDescription ?? ''} readOnly />
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          { value: 'pricing', label: 'Цены', content: <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Заглушка</div> },
          { value: 'schedule', label: 'Расписание', content: <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Заглушка</div> },
          { value: 'tech', label: 'Техническое', content: <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Заглушка</div> },
        ]}
      />

      <StickySaveBar
        visible={dirty}
        onReset={() => {
          setIsArchivedDraft(Boolean(e.isArchived));
          setSubcategoryIdsDraft(initialSubcategoryIds);
        }}
        onSave={async () => {
          if (dirtyArchived) {
            await adminApi.patch(`/admin/events/${e.id}/archive`, { isArchived: isArchivedDraft });
          }
          if (dirtySubcategories) {
            if (subcategoryIdsDraft.length === 0) {
              throw new Error('Нельзя сохранить пустой список подкатегорий');
            }
            if (subcategoryIdsDraft.length > 3) {
              throw new Error('Нельзя выбрать больше 3 подкатегорий');
            }
            await adminApi.put(`/admin/events/${e.id}/subcategories`, { subcategoryIds: subcategoryIdsDraft });
          }
          await qc.invalidateQueries({ queryKey: ['admin-event', e.id] });
          await qc.invalidateQueries({ queryKey: ['admin-event-summary', e.id] });
          await qc.invalidateQueries({ queryKey: ['admin-events'] });
        }}
      />
    </div>
  );
}

