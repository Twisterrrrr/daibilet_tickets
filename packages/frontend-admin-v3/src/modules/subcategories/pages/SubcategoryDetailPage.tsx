import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchAdminSubcategory, fetchAdminSubcategoryUsage, updateAdminSubcategory } from '../api/subcategories.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

export function SubcategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const subcategoryId = id ?? '';
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-subcategory', subcategoryId],
    enabled: Boolean(subcategoryId),
    queryFn: () => fetchAdminSubcategory(subcategoryId, true),
  });

  const [usageTab, setUsageTab] = React.useState<'EVENT' | 'VENUE'>('EVENT');
  const [usagePage, setUsagePage] = React.useState(1);

  const usage = useQuery({
    queryKey: ['admin-subcategory-usage', subcategoryId, usageTab, usagePage],
    enabled: Boolean(subcategoryId),
    queryFn: () => fetchAdminSubcategoryUsage(subcategoryId, { entityType: usageTab, page: usagePage, limit: 20 }),
    staleTime: 15_000,
  });

  const row = query.data;

  const [draft, setDraft] = React.useState<any>(null);
  React.useEffect(() => {
    if (row) {
      setDraft({
        slug: row.slug ?? '',
        code: row.code ?? '',
        nameRu: row.nameRu ?? '',
        type: row.type ?? 'EVENT_ONLY',
        layer: row.layer ?? 'SECONDARY',
        parentId: row.parentId ?? null,
        isActive: Boolean(row.isActive),
        isLandingEnabled: Boolean(row.isLandingEnabled),
        landingMode: row.landingMode ?? 'DISABLED',
        landingTopicKey: row.landingTopicKey ?? null,
        sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : 0,
      });
    }
  }, [row]);

  const mut = useMutation({
    mutationFn: () => updateAdminSubcategory(subcategoryId, draft),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-subcategory', subcategoryId] });
      await qc.invalidateQueries({ queryKey: ['admin-subcategories'] });
    },
  });

  if (!subcategoryId) return <ErrorState title="Некорректный ID" description="Не указан идентификатор подкатегории." />;
  if (query.isLoading) return <LoadingState label="Загрузка подкатегории…" />;
  if (query.isError) return <ErrorState title="Не удалось загрузить" description={query.error instanceof Error ? query.error.message : 'Ошибка'} onRetry={() => query.refetch()} />;
  if (!row || !draft) return <LoadingState label="Загрузка…" />;

  return (
    <div className="space-y-8">
      <PageHeader
        title={row.nameRu}
        subtitle={row.slug}
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin-v3/subcategories">К списку</Link>
            </Button>
            <Button type="button" disabled={mut.isPending} onClick={() => mut.mutate()}>
              Сохранить
            </Button>
          </div>
        }
      />

      {mut.isError ? (
        <ErrorState title="Не удалось сохранить" description={mut.error instanceof Error ? mut.error.message : 'Ошибка'} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <div className="text-sm font-medium">Основное</div>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Name (RU)</div>
              <Input value={draft.nameRu} onChange={(e) => setDraft((p: any) => ({ ...p, nameRu: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Slug</div>
              <Input value={draft.slug} onChange={(e) => setDraft((p: any) => ({ ...p, slug: e.target.value }))} className="font-mono" />
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Code</div>
              <Input value={draft.code} onChange={(e) => setDraft((p: any) => ({ ...p, code: e.target.value }))} className="font-mono" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Type</div>
                <select className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm" value={draft.type} onChange={(e) => setDraft((p: any) => ({ ...p, type: e.target.value }))}>
                  <option value="EVENT_ONLY">EVENT_ONLY</option>
                  <option value="VENUE_ONLY">VENUE_ONLY</option>
                  <option value="UNIVERSAL">UNIVERSAL</option>
                </select>
              </div>
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Layer</div>
                <select className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm" value={draft.layer} onChange={(e) => setDraft((p: any) => ({ ...p, layer: e.target.value }))}>
                  <option value="PRIMARY">PRIMARY</option>
                  <option value="SECONDARY">SECONDARY</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">sortOrder</div>
              <Input
                value={String(draft.sortOrder ?? 0)}
                onChange={(e) => setDraft((p: any) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
                className="font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft((p: any) => ({ ...p, isActive: e.target.checked }))} />
                <span>Active</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.isLandingEnabled}
                  onChange={(e) => setDraft((p: any) => ({ ...p, isLandingEnabled: e.target.checked }))}
                />
                <span>Landing enabled</span>
              </label>
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">landingMode</div>
              <select className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm" value={draft.landingMode} onChange={(e) => setDraft((p: any) => ({ ...p, landingMode: e.target.value }))}>
                <option value="DISABLED">DISABLED</option>
                <option value="AUTO">AUTO</option>
                <option value="TOPIC_HUB">TOPIC_HUB</option>
              </select>
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">landingTopicKey</div>
              <Input
                value={draft.landingTopicKey ?? ''}
                onChange={(e) => setDraft((p: any) => ({ ...p, landingTopicKey: e.target.value || null }))}
                placeholder="river-cruises"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <div className="text-sm font-medium">Usage</div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>events: {row.usage?.eventsCount ?? '—'}</span>
            <span>·</span>
            <span>venues: {row.usage?.venuesCount ?? '—'}</span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button type="button" variant={usageTab === 'EVENT' ? 'default' : 'outline'} size="sm" onClick={() => { setUsageTab('EVENT'); setUsagePage(1); }}>
              Events
            </Button>
            <Button type="button" variant={usageTab === 'VENUE' ? 'default' : 'outline'} size="sm" onClick={() => { setUsageTab('VENUE'); setUsagePage(1); }}>
              Venues
            </Button>
          </div>

          <div className="mt-4">
            {usage.isLoading ? <LoadingState label="Загрузка usage…" /> : null}
            {usage.isError ? <ErrorState title="Не удалось загрузить usage" description={usage.error instanceof Error ? usage.error.message : 'Ошибка'} onRetry={() => usage.refetch()} /> : null}
            {usage.data ? (
              <div className="space-y-2">
                {usage.data.items.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Не используется.</div>
                ) : (
                  <div className="grid gap-2">
                    {usage.data.items.map((x) => (
                      <div key={x.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="truncate">{x.title}</div>
                          <div className="mt-1 font-mono text-xs text-muted-foreground">{x.slug}</div>
                        </div>
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link to={usageTab === 'EVENT' ? `/admin-v3/events/${x.id}` : `/admin-v3/venues/${x.id}`}>Открыть</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    Страница {usage.data.page} / {usage.data.pages} · всего {usage.data.total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={usagePage <= 1} onClick={() => setUsagePage((p) => Math.max(1, p - 1))}>
                      Назад
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={usage.data.pages > 0 ? usagePage >= usage.data.pages : usage.data.items.length < 20}
                      onClick={() => setUsagePage((p) => p + 1)}
                    >
                      Вперёд
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

