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
import { EventCategoryPricesTab } from '@/modules/events/components/detail/EventCategoryPricesTab';
import { EventMediaTab } from '@/modules/events/components/detail/EventMediaTab';
import { EventReadinessPanel } from '@/modules/events/components/detail/EventReadinessPanel';
import { EventScheduleTab } from '@/modules/events/components/detail/EventScheduleTab';
import { adminApi } from '@/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

type PublishGateCheck = { code: string; status: 'OK' | 'WARNING' | 'BLOCKING'; message: string };
type PublishGateResult = { result: 'OK' | 'WARNING' | 'BLOCKING'; checks: PublishGateCheck[] };

type PublishEventResult =
  | { ok: true; gate: PublishGateResult; issues: unknown[] }
  | { ok: false; gate: PublishGateResult; issues: Array<{ code: string; message: string }> };

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

  const [publishPanelOpen, setPublishPanelOpen] = React.useState<boolean>(false);

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

  const isPublishedInCatalog = (e.override?.editorStatus ?? null) === 'PUBLISHED' || e.publishStatus === 'PUBLISHED';

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
              <div className="rounded-lg border bg-card p-5">
                <div className="text-sm font-medium">Тексты</div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Краткое описание</div>
                    <textarea
                      className="mt-1 h-20 w-full rounded-md border bg-background p-2 text-sm"
                      value={e.shortDescription ?? e.summary ?? ''}
                      readOnly
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Полное описание</div>
                    <textarea className="mt-1 h-40 w-full rounded-md border bg-background p-2 text-sm" value={e.description ?? ''} readOnly />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Точка сбора / встреча</div>
                    <textarea className="mt-1 h-20 w-full rounded-md border bg-background p-2 text-sm" value={e.meetingPoint ?? ''} readOnly />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Возврат / отмена</div>
                    <textarea className="mt-1 h-20 w-full rounded-md border bg-background p-2 text-sm" value={e.refundPolicyText ?? ''} readOnly />
                  </div>
                </div>
              </div>
            ),
          },
          {
            value: 'media',
            label: 'Медиа',
            content: <EventMediaTab detail={e} />,
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
            value: 'pricing',
            label: 'Категории и цены',
            content: <EventCategoryPricesTab detail={e} />,
          },
          {
            value: 'seo',
            label: 'SEO',
            content: (
              <div className="rounded-lg border bg-card p-5">
                <div className="text-sm font-medium">SEO и URL</div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Публичный URL (через slug)</div>
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
                    <div className="text-xs font-medium text-muted-foreground">SEO title</div>
                    <input className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={e.seoTitle ?? ''} readOnly />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">SEO description</div>
                    <textarea className="mt-1 h-24 w-full rounded-md border bg-background p-2 text-sm" value={e.seoDescription ?? ''} readOnly />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Индексация на витрине зависит от наличия будущих сеансов и политики каталога; slug остаётся уникальным.
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

