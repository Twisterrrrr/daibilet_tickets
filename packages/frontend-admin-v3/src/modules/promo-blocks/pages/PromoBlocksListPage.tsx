import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import {
  createAdminPromoBlock,
  deleteAdminPromoBlock,
  fetchAdminPromoBlocks,
  patchAdminPromoBlock,
  type PromoBlockRow,
} from '@/modules/promo-blocks/api/promoBlocks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { readString } from '@/shared/url-state/parse';
import { setOrDelete } from '@/shared/url-state/serialize';
import { useUrlState } from '@/shared/url-state/useUrlState';

function parseCsvSlugs(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function formatScope(row: PromoBlockRow): string {
  const parts: string[] = [];
  if (row.citySlug) parts.push(`city:${row.citySlug}`);
  if (row.categorySlug) parts.push(`cat:${row.categorySlug}`);
  const tags = Array.isArray(row.tagSlugs) ? row.tagSlugs.filter(Boolean) : [];
  if (tags.length) parts.push(`tags:${tags.slice(0, 3).join(',')}${tags.length > 3 ? ` +${tags.length - 3}` : ''}`);
  const targetCities = Array.isArray(row.targetCitySlugs) ? row.targetCitySlugs.filter(Boolean) : [];
  if (targetCities.length) parts.push(`only:${targetCities.slice(0, 3).join(',')}${targetCities.length > 3 ? ` +${targetCities.length - 3}` : ''}`);
  if (row.isKids) parts.push('kids');
  if (row.isIndoor) parts.push('indoor');
  return parts.join(' · ') || 'global';
}

export function PromoBlocksListPage() {
  const qc = useQueryClient();
  const { state: uf, setState: setUf } = useUrlState({
    defaults: { q: '' },
    parse: (sp) => ({ q: readString(sp, 'q', '') }),
    serialize: (s, sp) => {
      setOrDelete(sp, 'q', s.q);
      return sp;
    },
  });
  const [qInput, setQInput] = React.useState(uf.q);
  const debouncedQ = useDebouncedValue(qInput, 250);
  React.useEffect(() => setQInput(uf.q), [uf.q]);
  React.useEffect(() => {
    if (debouncedQ === uf.q) return;
    setUf({ q: debouncedQ }, { history: 'replace' });
  }, [debouncedQ, setUf, uf.q]);

  const q = useQuery({
    queryKey: ['admin-promo-blocks'],
    queryFn: () => fetchAdminPromoBlocks(),
    staleTime: 30_000,
  });

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PromoBlockRow | null>(null);
  const [draft, setDraft] = React.useState({
    slug: '',
    title: '',
    description: '',
    href: '',
    contentMode: 'LINK_ONLY',
    collectionId: '',
    selectionMode: 'MANUAL',
    citySlug: '',
    categorySlug: '',
    tagSlugsCsv: '',
    targetCitySlugsCsv: '',
    isKids: false,
    isIndoor: false,
    autoSort: '',
    autoLimit: '',
    startsAt: '',
    endsAt: '',
    priority: '0',
    sortOrder: '0',
    isActive: true,
  });

  function openCreate() {
    setEditing(null);
    setDraft({
      slug: '',
      title: '',
      description: '',
      href: '',
      contentMode: 'LINK_ONLY',
      collectionId: '',
      selectionMode: 'MANUAL',
      citySlug: '',
      categorySlug: '',
      tagSlugsCsv: '',
      targetCitySlugsCsv: '',
      isKids: false,
      isIndoor: false,
      autoSort: '',
      autoLimit: '',
      startsAt: '',
      endsAt: '',
      priority: '0',
      sortOrder: '0',
      isActive: true,
    });
    setDrawerOpen(true);
  }

  function openEdit(row: PromoBlockRow) {
    setEditing(row);
    setDraft({
      slug: row.slug ?? '',
      title: row.title ?? '',
      description: row.description ?? '',
      href: row.href ?? '',
      contentMode: row.contentMode ?? 'LINK_ONLY',
      collectionId: row.collectionId ?? '',
      selectionMode: row.selectionMode ?? 'MANUAL',
      citySlug: row.citySlug ?? '',
      categorySlug: row.categorySlug ?? '',
      tagSlugsCsv: Array.isArray(row.tagSlugs) ? row.tagSlugs.join(', ') : '',
      targetCitySlugsCsv: Array.isArray(row.targetCitySlugs) ? row.targetCitySlugs.join(', ') : '',
      isKids: Boolean(row.isKids),
      isIndoor: Boolean(row.isIndoor),
      autoSort: row.autoSort ?? '',
      autoLimit: row.autoLimit !== null && row.autoLimit !== undefined ? String(row.autoLimit) : '',
      startsAt: row.startsAt ?? '',
      endsAt: row.endsAt ?? '',
      priority: String(row.priority ?? 0),
      sortOrder: String(row.sortOrder ?? 0),
      isActive: Boolean(row.isActive),
    });
    setDrawerOpen(true);
  }

  const saveM = useMutation({
    mutationFn: async () => {
      const payload = {
        slug: draft.slug.trim(),
        title: draft.title.trim(),
        description: draft.description.trim(),
        href: draft.href.trim() || undefined,
        contentMode: draft.contentMode || undefined,
        collectionId: draft.collectionId.trim() || undefined,
        selectionMode: draft.selectionMode || undefined,
        citySlug: draft.citySlug.trim() || undefined,
        categorySlug: draft.categorySlug.trim() || undefined,
        tagSlugs: draft.tagSlugsCsv.trim() ? parseCsvSlugs(draft.tagSlugsCsv) : undefined,
        targetCitySlugs: draft.targetCitySlugsCsv.trim()
          ? parseCsvSlugs(draft.targetCitySlugsCsv)
          : undefined,
        isKids: Boolean(draft.isKids),
        isIndoor: Boolean(draft.isIndoor),
        autoSort: draft.autoSort.trim() || undefined,
        autoLimit: draft.autoLimit.trim()
          ? Number.isFinite(Number(draft.autoLimit))
            ? Number(draft.autoLimit)
            : undefined
          : undefined,
        startsAt: draft.startsAt.trim() || undefined,
        endsAt: draft.endsAt.trim() || undefined,
        priority: Number.isFinite(Number(draft.priority)) ? Number(draft.priority) : undefined,
        sortOrder: Number.isFinite(Number(draft.sortOrder)) ? Number(draft.sortOrder) : undefined,
        isActive: Boolean(draft.isActive),
      };
      if (editing) {
        const { slug: _slug, ...patch } = payload;
        return patchAdminPromoBlock(editing.id, patch);
      }
      return createAdminPromoBlock(payload);
    },
    onSuccess: async () => {
      setDrawerOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ['admin-promo-blocks'] });
    },
  });

  const toggleActiveM = useMutation({
    mutationFn: async (arg: { id: string; isActive: boolean }) => patchAdminPromoBlock(arg.id, { isActive: arg.isActive }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-promo-blocks'] });
    },
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => deleteAdminPromoBlock(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-promo-blocks'] });
    },
  });

  if (q.isLoading) return <LoadingState label="Загрузка промо-блоков…" />;
  if (q.isError) {
    const meta = q.error ? getAdminErrorDisplay(q.error) : null;
    return (
      <ErrorState
        title={meta?.title ?? 'Не удалось загрузить промо-блоки'}
        description={meta?.description ?? meta?.rawMessage}
        onRetry={() => q.refetch()}
      />
    );
  }

  const itemsAll = q.data ?? [];
  const items =
    debouncedQ.trim() === ''
      ? itemsAll
      : itemsAll.filter((row) => {
          const s = debouncedQ.trim().toLowerCase();
          const hay = `${row.slug ?? ''} ${row.title ?? ''} ${row.description ?? ''}`.toLowerCase();
          return hay.includes(s);
        });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Промо-блоки"
        subtitle="Маркетинговые блоки для витрины (link / collection / подборка по правилам)"
        actions={
          <div className="flex flex-wrap gap-2">
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Поиск (title/slug)…"
              className="h-9 w-[260px]"
            />
            <Button type="button" onClick={() => openCreate()}>
              Создать
            </Button>
            <Button type="button" variant="outline" onClick={() => q.refetch()}>
              Обновить
            </Button>
          </div>
        }
      />

      <DataTableShell>
        <div className="overflow-x-auto p-2">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Блок</th>
                <th className="px-3 py-3">Статус / порядок</th>
                <th className="px-3 py-3">Период</th>
                <th className="px-3 py-3">Где показываем</th>
                <th className="px-3 py-3">Режим / связь</th>
                <th className="w-44 px-3 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Нет промо-блоков
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="align-top px-3 py-3">
                      <div className="font-medium leading-snug">{row.title}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{row.slug}</div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{row.description}</div>
                    </td>
                    <td className="align-top px-3 py-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={row.isActive ? 'outline' : 'danger'}>{row.isActive ? 'active' : 'off'}</Badge>
                        <Badge variant="outline">prio {row.priority}</Badge>
                        <Badge variant="outline">order {row.sortOrder}</Badge>
                      </div>
                    </td>
                    <td className="align-top px-3 py-3 text-xs text-muted-foreground">
                      <div>from: {row.startsAt ? new Date(row.startsAt).toLocaleString('ru-RU') : '—'}</div>
                      <div>to: {row.endsAt ? new Date(row.endsAt).toLocaleString('ru-RU') : '—'}</div>
                    </td>
                    <td className="align-top px-3 py-3 text-xs">
                      <div className="text-muted-foreground">{formatScope(row)}</div>
                    </td>
                    <td className="align-top px-3 py-3 text-xs">
                      <div>{row.contentMode}</div>
                      {row.href ? <div className="mt-1 break-all text-muted-foreground">{row.href}</div> : null}
                      {row.collectionId ? (
                        <div className="mt-1 text-muted-foreground">
                          collection:{' '}
                          <Link className="underline" to={`/collections/${encodeURIComponent(row.collectionId)}`}>
                            {row.collectionId}
                          </Link>
                        </div>
                      ) : null}
                    </td>
                    <td className="align-top px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={toggleActiveM.isPending}
                          onClick={() => toggleActiveM.mutate({ id: row.id, isActive: !row.isActive })}
                        >
                          {row.isActive ? 'Выключить' : 'Включить'}
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(row)}>
                          Редактировать
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={deleteM.isPending}
                          onClick={() => {
                            if (!confirm(`Удалить промо-блок "${row.slug}"?`)) return;
                            deleteM.mutate(row.id);
                          }}
                        >
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
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
          aria-label="Редактор промо-блока"
          onClick={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.dataset?.overlay === '1') setDrawerOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/30" data-overlay="1" />
          <div className="absolute right-0 top-0 h-full w-full max-w-[720px] overflow-y-auto border-l bg-background p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{editing ? 'Редактировать промо-блок' : 'Создать промо-блок'}</div>
                <div className="mt-1 text-xs text-muted-foreground">Минимальный набор полей для launch-core.</div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setDrawerOpen(false)} disabled={saveM.isPending}>
                Закрыть
              </Button>
            </div>

            {saveM.isError ? (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveM.error instanceof Error ? saveM.error.message : 'Ошибка сохранения'}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">slug (kebab-case)</span>
                <Input value={draft.slug} onChange={(e) => setDraft((p) => ({ ...p, slug: e.target.value }))} disabled={Boolean(editing)} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">title</span>
                <Input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">description</span>
                <textarea
                  className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={draft.description}
                  onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">contentMode</span>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={draft.contentMode}
                    onChange={(e) => setDraft((p) => ({ ...p, contentMode: e.target.value }))}
                  >
                    <option value="LINK_ONLY">LINK_ONLY</option>
                    <option value="COLLECTION">COLLECTION</option>
                    <option value="AUTO_EVENTS">AUTO_EVENTS</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">selectionMode</span>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={draft.selectionMode}
                    onChange={(e) => setDraft((p) => ({ ...p, selectionMode: e.target.value }))}
                  >
                    <option value="MANUAL">MANUAL</option>
                    <option value="AUTO">AUTO</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) => setDraft((p) => ({ ...p, isActive: e.target.checked }))}
                  />
                  isActive
                </label>
              </div>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">href (для LINK_ONLY)</span>
                <Input value={draft.href} onChange={(e) => setDraft((p) => ({ ...p, href: e.target.value }))} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">collectionId (для COLLECTION)</span>
                <Input value={draft.collectionId} onChange={(e) => setDraft((p) => ({ ...p, collectionId: e.target.value }))} />
              </label>

              <div className="rounded-md border bg-card p-3">
                <div className="text-xs font-medium text-muted-foreground">Где показываем (scope)</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">citySlug (контекст)</span>
                    <Input value={draft.citySlug} onChange={(e) => setDraft((p) => ({ ...p, citySlug: e.target.value }))} placeholder="spb / msk / ..." />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">categorySlug</span>
                    <Input value={draft.categorySlug} onChange={(e) => setDraft((p) => ({ ...p, categorySlug: e.target.value }))} placeholder="events / excursions / ..." />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">tagSlugs (csv)</span>
                    <Input value={draft.tagSlugsCsv} onChange={(e) => setDraft((p) => ({ ...p, tagSlugsCsv: e.target.value }))} placeholder="jazz, for-kids, ..." />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">targetCitySlugs (csv, пусто = все)</span>
                    <Input
                      value={draft.targetCitySlugsCsv}
                      onChange={(e) => setDraft((p) => ({ ...p, targetCitySlugsCsv: e.target.value }))}
                      placeholder="spb, msk"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={draft.isKids} onChange={(e) => setDraft((p) => ({ ...p, isKids: e.target.checked }))} />
                    isKids
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={draft.isIndoor} onChange={(e) => setDraft((p) => ({ ...p, isIndoor: e.target.checked }))} />
                    isIndoor
                  </label>
                </div>
              </div>

              <div className="rounded-md border bg-card p-3">
                <div className="text-xs font-medium text-muted-foreground">AUTO подбор (если selectionMode=AUTO)</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">autoSort</span>
                    <Input value={draft.autoSort} onChange={(e) => setDraft((p) => ({ ...p, autoSort: e.target.value }))} placeholder="POPULAR / RATING / ..." />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">autoLimit</span>
                    <Input value={draft.autoLimit} onChange={(e) => setDraft((p) => ({ ...p, autoLimit: e.target.value }))} placeholder="12" />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">startsAt (ISO)</span>
                  <Input value={draft.startsAt} onChange={(e) => setDraft((p) => ({ ...p, startsAt: e.target.value }))} placeholder="2026-04-17T12:00:00Z" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">endsAt (ISO)</span>
                  <Input value={draft.endsAt} onChange={(e) => setDraft((p) => ({ ...p, endsAt: e.target.value }))} placeholder="2026-05-01T12:00:00Z" />
                </label>
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

