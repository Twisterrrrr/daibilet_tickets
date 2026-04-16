import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/shared/filters/SearchInput';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/api/client';
import { slugifyFromTitle } from '@/modules/articles/utils/slugify';
import {
  addAdminCollectionItem,
  fetchAdminCollectionDetail,
  fetchAdminCollectionResolvedItems,
  patchAdminCollection,
  publishAdminCollection,
  removeAdminCollectionItem,
  reorderAdminCollectionItems,
  type AdminCollectionDetail,
  type AdminCollectionTagFilterUpsert,
} from '@/modules/collections/api/collections';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detailQ = useQuery({
    queryKey: ['admin-collection-detail', id],
    queryFn: () => fetchAdminCollectionDetail(id!),
    enabled: Boolean(id) && id !== 'new',
  });

  const [draft, setDraft] = React.useState<AdminCollectionDetail | null>(null);
  React.useEffect(() => {
    if (detailQ.data) setDraft(detailQ.data);
  }, [detailQ.data]);

  type TagFilterDraft = {
    tagId: string;
    position: number;
    tag: { id: string; name: string; slug: string; isActive: boolean; isDeleted: boolean };
  };
  const [tagFiltersDraft, setTagFiltersDraft] = React.useState<TagFilterDraft[]>([]);
  const [tagFiltersTouched, setTagFiltersTouched] = React.useState(false);
  const [showLegacyTagSlugs, setShowLegacyTagSlugs] = React.useState(false);
  const [banner, setBanner] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!detailQ.data) return;
    const d = detailQ.data;
    const normalized = (d.tagFilters ?? [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((tf, idx) => ({
        tagId: tf.tagId,
        position: idx,
        tag: {
          id: tf.tag.id,
          name: tf.tag.name,
          slug: tf.tag.slug,
          isActive: Boolean(tf.tag.isActive ?? true),
          isDeleted: Boolean(tf.tag.isDeleted ?? false),
        },
      }));
    if (normalized.length) {
      setTagFiltersDraft(normalized);
    } else {
      // transitional fallback: if API returns only legacy filterTags slugs, we show them as read-only in advanced
      setTagFiltersDraft([]);
    }
    setTagFiltersTouched(false);
  }, [detailQ.data]);

  const saveM = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('No draft');
      const basePayload: Parameters<typeof patchAdminCollection>[1] = {
        version: draft.version,
        title: draft.title,
        slug: draft.slug,
        subtitle: draft.subtitle ?? null,
        description: draft.description ?? null,
        heroImage: draft.heroImage ?? null,
        cityId: draft.cityId ?? null,
        metaTitle: draft.metaTitle ?? null,
        metaDescription: draft.metaDescription ?? null,
        sourceType: draft.sourceType,
        selectionBasis: draft.selectionBasis,
        status: draft.status,
        isActive: Boolean(draft.isActive),
        queryConfig: draft.queryConfig ?? null,
      };

      // Safety: do not send tagFilters: [] unless user explicitly interacted with the canonical editor.
      // Otherwise a legacy-only record could be wiped by a "save other fields" action.
      if (!tagFiltersTouched) {
        return patchAdminCollection(draft.id, basePayload);
      }

      const normalizedTagFilters: AdminCollectionTagFilterUpsert[] = tagFiltersDraft.map((t, idx) => ({
        tagId: t.tagId,
        position: idx,
      }));
      return patchAdminCollection(draft.id, {
        ...basePayload,
        // Canonical for admin: normalized tagFilters. Mirror legacy slugs server-side (and also send here for compatibility).
        tagFilters: normalizedTagFilters,
        filterTags: tagFiltersDraft.map((t) => t.tag.slug),
      });
    },
    onSuccess: async (next) => {
      setDraft(next);
      setBanner('Сохранено');
      window.setTimeout(() => setBanner(null), 3000);
      await qc.invalidateQueries({ queryKey: ['admin-collections'] });
      await qc.invalidateQueries({ queryKey: ['admin-collection-detail', id] });
    },
    onError: (e: unknown) => {
      const d = getAdminErrorDisplay(e);
      setBanner(`${d.title}${d.description ? `\n${d.description}` : ''}`);
    },
  });

  const publishM = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('No draft');
      return publishAdminCollection(draft.id, draft.version);
    },
    onSuccess: (next) => {
      setDraft(next);
      qc.invalidateQueries({ queryKey: ['admin-collections'] });
      qc.invalidateQueries({ queryKey: ['admin-collection-detail', id] });
    },
  });

  const unpublishM = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('No draft');
      return patchAdminCollection(draft.id, { status: 'DRAFT', isActive: false, version: draft.version });
    },
    onSuccess: (next) => {
      setDraft(next);
      qc.invalidateQueries({ queryKey: ['admin-collections'] });
      qc.invalidateQueries({ queryKey: ['admin-collection-detail', id] });
    },
  });

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerSearch, setPickerSearch] = React.useState('');
  const [pickerDebounced, setPickerDebounced] = React.useState('');
  React.useEffect(() => {
    const t = window.setTimeout(() => setPickerDebounced(pickerSearch.trim()), 250);
    return () => window.clearTimeout(t);
  }, [pickerSearch]);

  const eventsQ = useQuery({
    queryKey: ['admin-events-picker', pickerDebounced],
    queryFn: async () => {
      if (!pickerDebounced) return [];
      const res = await adminApi.get<{ items: Array<{ id: string; title: string; slug?: string | null; isActive: boolean; source?: string; priceFrom?: number | null; city?: { name: string; slug: string } | null }> }>(
        `/admin/events?search=${encodeURIComponent(pickerDebounced)}&limit=20`,
      );
      return res.items ?? [];
    },
    enabled: pickerOpen && pickerDebounced.length >= 2,
  });

  const addItemM = useMutation({
    mutationFn: (eventId: string) => addAdminCollectionItem(draft!.id, eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-collection-detail', id] });
    },
  });

  const removeItemM = useMutation({
    mutationFn: (itemId: string) => removeAdminCollectionItem(draft!.id, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-collection-detail', id] });
    },
  });

  const reorderM = useMutation({
    mutationFn: (itemIdsInOrder: string[]) => reorderAdminCollectionItems(draft!.id, itemIdsInOrder),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-collection-detail', id] });
    },
  });

  const resolvedQ = useQuery({
    queryKey: ['admin-collection-resolved', id],
    queryFn: () => fetchAdminCollectionResolvedItems(draft!.id, 30),
    enabled: Boolean(draft) && draft?.sourceType !== 'MANUAL',
  });

  if (!id) return <ErrorState title="Некорректный ID" description="Не указан идентификатор подборки." />;

  if (id === 'new') {
    return (
      <ErrorState
        title="Создание пока не подключено"
        description="MVP: создавайте подборку через API или временный админ-эндпоинт, затем открывайте её по ID."
        onRetry={() => navigate('/admin-v3/collections')}
      />
    );
  }

  if (detailQ.isLoading) return <LoadingState label="Загрузка подборки…" />;
  if (detailQ.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить подборку"
        description={detailQ.error instanceof Error ? detailQ.error.message : 'Ошибка'}
        onRetry={() => detailQ.refetch()}
      />
    );
  }

  if (!draft) return <LoadingState label="Загрузка…" />;

  const statusLabel = (s: string) => (s === 'ACTIVE' ? 'Опубликовано' : s === 'ARCHIVED' ? 'Архив' : 'Черновик');
  const statusVariant = (s: string): 'default' | 'outline' | 'warning' =>
    s === 'ACTIVE' ? 'default' : s === 'ARCHIVED' ? 'outline' : 'warning';

  const publicHref = `/collections/${encodeURIComponent(draft.slug)}`;

  const items = Array.isArray(draft.items) ? draft.items : [];
  const moveItem = (itemId: string, dir: -1 | 1) => {
    const idx = items.findIndex((x) => x.id === itemId);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= items.length) return;
    const next = [...items];
    const tmp = next[idx];
    next[idx] = next[nextIdx];
    next[nextIdx] = tmp;
    setDraft({ ...draft, items: next });
  };

  const commitReorder = () => {
    const nextIds = (draft.items ?? []).map((x) => x.id);
    reorderM.mutate(nextIds);
  };

  const errText = (e: unknown) => getAdminErrorDisplay(e).title;

  return (
    <div className="space-y-6">
      <PageHeader
        title={draft.title || 'Подборка'}
        subtitle={`${draft.sourceType} · v${draft.version} · ${draft.city?.name ?? '—'}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin-v3/collections">К списку</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <a href={publicHref} target="_blank" rel="noreferrer">
                На сайте
              </a>
            </Button>
            {draft.status === 'ACTIVE' ? (
              <Button type="button" variant="outline" disabled={unpublishM.isPending} onClick={() => unpublishM.mutate()}>
                Снять с публикации
              </Button>
            ) : (
              <Button type="button" disabled={publishM.isPending} onClick={() => publishM.mutate()}>
                Опубликовать
              </Button>
            )}
            <Button type="button" variant="secondary" disabled={saveM.isPending} onClick={() => saveM.mutate()}>
              Сохранить
            </Button>
          </div>
        }
      />
      {banner ? (
        <div className="whitespace-pre-wrap rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30">
          {banner}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Статус</div>
            <Badge variant={statusVariant(draft.status)}>{statusLabel(draft.status)}</Badge>
          </div>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Title
            <input
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={draft.title ?? ''}
              onChange={(e) => {
                const title = e.target.value;
                setDraft((d) => (d ? { ...d, title, slug: d.slug || slugifyFromTitle(title) } : d));
              }}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Slug
            <input
              className="h-9 rounded-md border bg-background px-2 font-mono text-sm text-foreground"
              value={draft.slug ?? ''}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Subtitle
            <input
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={draft.subtitle ?? ''}
              onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Hero image URL
            <input
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={draft.heroImage ?? ''}
              onChange={(e) => setDraft({ ...draft, heroImage: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Description (markdown)
            <textarea
              className="min-h-28 rounded-md border bg-background px-2 py-2 text-sm text-foreground"
              value={draft.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-4">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            SEO title
            <input
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={draft.metaTitle ?? ''}
              onChange={(e) => setDraft({ ...draft, metaTitle: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            SEO description
            <textarea
              className="min-h-24 rounded-md border bg-background px-2 py-2 text-sm text-foreground"
              value={draft.metaDescription ?? ''}
              onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Source type
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                value={draft.sourceType}
                onChange={(e) => setDraft({ ...draft, sourceType: e.target.value })}
              >
                <option value="MANUAL">MANUAL</option>
                <option value="AUTO">AUTO</option>
                <option value="HYBRID">HYBRID</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Status
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
          </div>

          {draft.sourceType !== 'MANUAL' ? (
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Resolved preview (top 30)</div>
              {resolvedQ.isLoading ? (
                <div className="mt-2 text-sm text-muted-foreground">Загрузка…</div>
              ) : resolvedQ.isError ? (
                <div className="mt-2 text-sm text-destructive">{errText(resolvedQ.error)}</div>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {(resolvedQ.data?.items ?? []).slice(0, 10).map((it) => (
                    <li key={it.eventId} className="flex justify-between gap-2">
                      <span className="truncate">{it.title}</span>
                      <span className="text-muted-foreground">{it.isActive ? 'active' : 'inactive'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
            Public URL: <span className="font-mono">{publicHref}</span>
          </div>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-base font-semibold">Tag filters (normalized)</div>
          <Badge variant="outline">{tagFiltersDraft.length}</Badge>
        </div>

        {tagFiltersDraft.length === 0 && !tagFiltersTouched && (draft.filterTags ?? []).length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30">
            Эта подборка содержит legacy <span className="font-mono">filterTags</span> (slug[]). Пока вы не выберете теги в canonical-редакторе ниже,
            сохранение не будет менять фильтры, чтобы избежать потери данных.
          </div>
        ) : null}

        <TagMultiPicker
          onPick={(t) => {
            if (tagFiltersDraft.some((x) => x.tagId === t.id)) return;
            setTagFiltersTouched(true);
            setTagFiltersDraft((prev) => [
              ...prev,
              { tagId: t.id, position: prev.length, tag: { id: t.id, name: t.name, slug: t.slug, isActive: t.isActive, isDeleted: t.isDeleted } },
            ]);
          }}
        />

        {tagFiltersDraft.length === 0 ? (
          <div className="text-sm text-muted-foreground">Теги фильтра не выбраны</div>
        ) : (
          <div className="space-y-2">
            {tagFiltersDraft.map((tf, idx) => (
              <div key={tf.tagId} className="flex items-center justify-between gap-2 rounded-md border px-2 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {tf.tag.name} · {tf.tag.slug}
                    {!tf.tag.isActive ? <span className="ml-2 text-xs text-amber-700">inactive</span> : null}
                    {tf.tag.isDeleted ? <span className="ml-2 text-xs text-red-600">deleted</span> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={idx === 0}
                    onClick={() => {
                      setTagFiltersTouched(true);
                      setTagFiltersDraft((prev) => {
                        const next = [...prev];
                        const tmp = next[idx - 1];
                        next[idx - 1] = next[idx];
                        next[idx] = tmp;
                        return next.map((x, i) => ({ ...x, position: i }));
                      });
                    }}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={idx === tagFiltersDraft.length - 1}
                    onClick={() => {
                      setTagFiltersTouched(true);
                      setTagFiltersDraft((prev) => {
                        const next = [...prev];
                        const tmp = next[idx + 1];
                        next[idx + 1] = next[idx];
                        next[idx] = tmp;
                        return next.map((x, i) => ({ ...x, position: i }));
                      });
                    }}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTagFiltersTouched(true);
                      setTagFiltersDraft((prev) => prev.filter((x) => x.tagId !== tf.tagId).map((x, i) => ({ ...x, position: i })));
                    }}
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2">
          <Button type="button" variant="outline" onClick={() => setShowLegacyTagSlugs((v) => !v)}>
            {showLegacyTagSlugs ? 'Скрыть legacy slugs' : 'Показать legacy slugs'}
          </Button>
        </div>
        {showLegacyTagSlugs ? (
          <div className="rounded-md border bg-muted/20 p-3 text-xs">
            <div className="text-muted-foreground">filterTags (legacy mirror)</div>
            <div className="mt-1 font-mono">{(draft.filterTags ?? []).join(', ') || '—'}</div>
          </div>
        ) : null}
      </section>

      {/* MANUAL items */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Selected events</div>
            <div className="text-sm text-muted-foreground">MANUAL/HYBRID: явные элементы подборки</div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => { setPickerOpen(true); setPickerSearch(''); }}>
              Добавить событие
            </Button>
            <Button type="button" variant="secondary" disabled={reorderM.isPending} onClick={commitReorder}>
              Применить порядок
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            Пока нет событий
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Событие</th>
                  <th className="px-3 py-2 text-left font-medium">Мета</th>
                  <th className="px-3 py-2 text-right font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium">{it.event.title}</div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">{it.event.slug ?? it.eventId}</div>
                    </td>
                    <td className="px-3 py-3 align-top text-muted-foreground">
                      <div>{it.event.city?.name ?? '—'}</div>
                      <div className="text-xs">
                        {it.event.isActive ? 'active' : 'inactive'} {it.event.source ? `· ${it.event.source}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={idx === 0} onClick={() => moveItem(it.id, -1)}>
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={idx === items.length - 1}
                          onClick={() => moveItem(it.id, 1)}
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={removeItemM.isPending}
                          onClick={() => removeItemM.mutate(it.id)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Simple picker */}
      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-lg border bg-background p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold">Добавить событие</div>
              <Button type="button" variant="outline" onClick={() => setPickerOpen(false)}>
                Закрыть
              </Button>
            </div>

            <SearchInput
              placeholder="Поиск по title/slug/tcEventId… (мин. 2 символа)"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
            />

            {eventsQ.isLoading ? (
              <div className="text-sm text-muted-foreground">Загрузка…</div>
            ) : eventsQ.isError ? (
              <div className="text-sm text-destructive">{errText(eventsQ.error)}</div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Событие</th>
                      <th className="px-3 py-2 text-left font-medium">Мета</th>
                      <th className="px-3 py-2 text-right font-medium">Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(eventsQ.data ?? []).map((ev) => (
                      <tr key={ev.id} className="border-b last:border-0">
                        <td className="px-3 py-3 align-top">
                          <div className="font-medium">{ev.title}</div>
                          <div className="mt-1 font-mono text-xs text-muted-foreground">{ev.slug ?? ev.id}</div>
                        </td>
                        <td className="px-3 py-3 align-top text-muted-foreground">
                          <div>{ev.city?.name ?? '—'}</div>
                          <div className="text-xs">
                            {ev.isActive ? 'active' : 'inactive'} {ev.source ? `· ${ev.source}` : ''}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top text-right">
                          <Button
                            type="button"
                            size="sm"
                            disabled={addItemM.isPending}
                            onClick={() => addItemM.mutate(ev.id)}
                          >
                            Добавить
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(eventsQ.data ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-10 text-center text-muted-foreground">
                          Нет результатов
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type TagPickItem = { id: string; name: string; slug: string; isActive: boolean; isDeleted: boolean };

function TagMultiPicker(props: { onPick: (tag: TagPickItem) => void }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const tagsQ = useQuery({
    queryKey: ['admin-tags-lookup', debounced],
    queryFn: async (): Promise<TagPickItem[]> => {
      if (!debounced) return [];
      const res = await adminApi.get<{
        items: Array<{ id: string; name: string; slug: string; isActive: boolean; isDeleted: boolean }>;
      }>(`/admin/tags?search=${encodeURIComponent(debounced)}&limit=20`);
      return (res.items ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        isActive: Boolean(t.isActive),
        isDeleted: Boolean(t.isDeleted),
      }));
    },
    enabled: open && debounced.length >= 2,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input placeholder="Поиск тегов…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="button" variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? 'Закрыть' : 'Найти'}
        </Button>
      </div>
      {open ? (
        <div className="rounded-md border p-2">
          {debounced.length < 2 ? (
            <div className="text-sm text-muted-foreground">Введите минимум 2 символа</div>
          ) : tagsQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Поиск…</div>
          ) : tagsQ.isError ? (
            <div className="text-sm text-red-600">Ошибка поиска</div>
          ) : (tagsQ.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Ничего не найдено</div>
          ) : (
            <div className="space-y-1">
              {(tagsQ.data ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="w-full rounded-md border px-2 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    props.onPick(t);
                    setOpen(false);
                    setQ('');
                    setDebounced('');
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{t.slug}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!t.isActive ? <Badge variant="warning">inactive</Badge> : null}
                      {t.isDeleted ? <Badge variant="danger">deleted</Badge> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

