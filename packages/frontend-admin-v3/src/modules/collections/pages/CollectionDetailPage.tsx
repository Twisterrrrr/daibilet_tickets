import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/shared/filters/SearchInput';
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

  const saveM = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('No draft');
      return patchAdminCollection(draft.id, {
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
      });
    },
    onSuccess: async (next) => {
      setDraft(next);
      await qc.invalidateQueries({ queryKey: ['admin-collections'] });
      await qc.invalidateQueries({ queryKey: ['admin-collection-detail', id] });
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

