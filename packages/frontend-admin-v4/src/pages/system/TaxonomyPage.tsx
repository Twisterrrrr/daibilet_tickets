import * as React from 'react';

import { DataTableShell, EmptyState, PageHeader } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createTag, listEventPrimarySubcategories, listEventSecondarySubcategories, listTags } from '@/modules/taxonomy/api/taxonomy';
import { TagGroupsGrid } from '@/modules/taxonomy/components';
import type { SubcategoryDto, TagDto } from '@/modules/taxonomy/types';
import { Tags } from 'lucide-react';

type TagGroup = 'FORMAT' | 'AUDIENCE' | 'LANGUAGE' | 'SPECIAL' | 'SEASON' | 'OTHER';
const TAG_GROUPS: { id: TagGroup; label: string }[] = [
  { id: 'FORMAT', label: 'Формат' },
  { id: 'AUDIENCE', label: 'Аудитория' },
  { id: 'LANGUAGE', label: 'Язык' },
  { id: 'SPECIAL', label: 'Особое' },
  { id: 'SEASON', label: 'Сезон' },
  { id: 'OTHER', label: 'Другое' },
];

function normalizeGroup(t: TagDto): TagGroup {
  const g = String(t.structuralGroup ?? '').trim().toUpperCase();
  if (g === 'FORMAT' || g === 'AUDIENCE' || g === 'LANGUAGE' || g === 'SPECIAL' || g === 'SEASON') return g;
  return 'OTHER';
}

export function TaxonomyPage() {
  const [tagSearch, setTagSearch] = React.useState('');
  const [tagGroup, setTagGroup] = React.useState<TagGroup | 'ALL'>('ALL');
  const [tags, setTags] = React.useState<TagDto[] | null>(null);
  const [primary, setPrimary] = React.useState<SubcategoryDto[] | null>(null);
  const [secondary, setSecondary] = React.useState<SubcategoryDto[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState('');
  const [createSlug, setCreateSlug] = React.useState('');
  const [createName, setCreateName] = React.useState('');
  const [createKind, setCreateKind] = React.useState<'POPULAR' | 'STRUCTURAL'>('POPULAR');
  const [createCategory, setCreateCategory] = React.useState<'SPECIAL' | 'SEASON' | 'THEME' | 'AUDIENCE'>('SPECIAL');
  const [createStructuralGroup, setCreateStructuralGroup] = React.useState<'THEME' | 'AUDIENCE'>('THEME');
  const [createDescription, setCreateDescription] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [p, s, t] = await Promise.all([
          listEventPrimarySubcategories({ withUsage: true }),
          listEventSecondarySubcategories({ withUsage: true }),
          listTags({ search: tagSearch.trim() ? tagSearch.trim() : undefined, page: 1, limit: 100 }),
        ]);
        if (cancelled) return;
        setPrimary(p);
        setSecondary(s);
        setTags(t.items);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tagSearch]);

  const showEmptyTags = !loading && !error && tags !== null && tags.length === 0;
  const showEmptyPrimary = !loading && !error && primary !== null && primary.length === 0;
  const showEmptySecondary = !loading && !error && secondary !== null && secondary.length === 0;

  const tagsByGroup = React.useMemo(() => {
    const base = tags ?? [];
    const grouped: Record<TagGroup, TagDto[]> = { FORMAT: [], AUDIENCE: [], LANGUAGE: [], SPECIAL: [], SEASON: [], OTHER: [] };
    for (const t of base) grouped[normalizeGroup(t)].push(t);
    return grouped;
  }, [tags]);

  return (
    <>
      <PageHeader
        title="Категории и теги"
        description="Справочники для классификации событий. Теги сгруппированы как в Lovable (FORMAT/AUDIENCE/LANGUAGE/SPECIAL/SEASON)."
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={creating || !createSlug.trim() || !createName.trim()}
            onClick={() => {
              void (async () => {
                setCreateError('');
                const slug = createSlug.trim();
                const name = createName.trim();
                if (!slug || !name) return;
                setCreating(true);
                try {
                  await createTag({
                    slug,
                    name,
                    tagKind: createKind,
                    category: createCategory,
                    structuralGroup: createKind === 'STRUCTURAL' ? createStructuralGroup : undefined,
                    description: createDescription.trim() ? createDescription.trim() : undefined,
                    // code intentionally optional: for operator-created tags we allow empty code
                  });
                  setCreateSlug('');
                  setCreateName('');
                  setCreateDescription('');
                  // Reload tags list (keep current search)
                  const t = await listTags({ search: tagSearch.trim() ? tagSearch.trim() : undefined, page: 1, limit: 100 });
                  setTags(t.items);
                } catch (e: unknown) {
                  setCreateError(e instanceof Error ? e.message : 'Не удалось создать тег');
                } finally {
                  setCreating(false);
                }
              })();
            }}
          >
            {creating ? 'Создание…' : 'Создать тег'}
          </Button>
        }
      />

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}
      {createError ? <div className="mb-3 text-sm text-destructive">{createError}</div> : null}

      <Card className="mb-3 border-border p-3">
        <div className="mb-2 text-sm font-medium">Новый тег (операторский)</div>
        <div className="grid gap-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">slug</div>
            <Input value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} placeholder="например: student-discount" className="h-9" />
          </div>
          <div className="lg:col-span-2">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">name</div>
            <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="например: Скидка для студентов" className="h-9" />
          </div>
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">kind</div>
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              value={createKind}
              onChange={(e) => setCreateKind(e.target.value as 'POPULAR' | 'STRUCTURAL')}
            >
              <option value="POPULAR">POPULAR (multi)</option>
              <option value="STRUCTURAL">STRUCTURAL (single)</option>
            </select>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">category</div>
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              value={createCategory}
              onChange={(e) => setCreateCategory(e.target.value as any)}
            >
              <option value="SPECIAL">SPECIAL</option>
              <option value="SEASON">SEASON</option>
              <option value="THEME">THEME</option>
              <option value="AUDIENCE">AUDIENCE</option>
            </select>
          </div>
          {createKind === 'STRUCTURAL' ? (
            <div className="lg:col-span-2">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">structuralGroup</div>
              <select
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                value={createStructuralGroup}
                onChange={(e) => setCreateStructuralGroup(e.target.value as any)}
              >
                <option value="THEME">THEME</option>
                <option value="AUDIENCE">AUDIENCE</option>
              </select>
              <div className="mt-1 text-[11px] text-muted-foreground">
                FORMAT запрещён на бэке — используйте SECONDARY подкатегории.
              </div>
            </div>
          ) : null}
          <div className="lg:col-span-6">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">description (optional)</div>
            <Input value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} placeholder="кратко: для фильтров/SEO" className="h-9" />
          </div>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-border p-3">
          <div className="mb-2 text-sm font-medium">Подкатегории событий</div>
          <div className="grid gap-3">
            <Card className="border-border">
              <DataTableShell
                columns={['PRIMARY', 'slug', 'name', 'usage']}
                loading={loading}
                empty={showEmptyPrimary ? <EmptyState icon={Tags} title="PRIMARY подкатегорий нет" description="Проверьте справочник подкатегорий." /> : null}
              >
                {(primary ?? []).map((x) => (
                  <tr key={x.id} className="border-b border-border/60 hover:bg-secondary/40">
                    <td className="px-4 py-3 text-xs">
                      <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                        PRIMARY
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{x.slug}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{x.nameRu ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{x.usage?.eventsCount ?? 0}</td>
                  </tr>
                ))}
              </DataTableShell>
            </Card>

            <Card className="border-border">
              <DataTableShell
                columns={['SECONDARY', 'slug', 'name', 'usage']}
                loading={loading}
                empty={showEmptySecondary ? <EmptyState icon={Tags} title="SECONDARY подкатегорий нет" description="Проверьте справочник подкатегорий." /> : null}
              >
                {(secondary ?? []).map((x) => (
                  <tr key={x.id} className="border-b border-border/60 hover:bg-secondary/40">
                    <td className="px-4 py-3 text-xs">
                      <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                        SECONDARY
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{x.slug}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{x.nameRu ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{x.usage?.eventsCount ?? 0}</td>
                  </tr>
                ))}
              </DataTableShell>
            </Card>
          </div>
        </Card>

        <Card className="border-border p-3">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium">Теги</div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Поиск по slug/name"
                className="h-9 w-72 border-border bg-background text-sm"
              />
              <select
                value={tagGroup}
                onChange={(e) => setTagGroup(e.target.value as any)}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="ALL">Все группы</option>
                {TAG_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showEmptyTags ? <EmptyState icon={Tags} title="Теги не найдены" description="Измените поиск." /> : null}

          <div className="grid gap-3">
            {(['FORMAT', 'AUDIENCE', 'LANGUAGE', 'SPECIAL', 'SEASON', 'OTHER'] as const)
              .filter((g) => tagGroup === 'ALL' || tagGroup === g)
              .map((g) => {
                const rows = tagsByGroup[g] ?? [];
                if (!rows.length) return null;
                const title = TAG_GROUPS.find((x) => x.id === g)?.label ?? g;
                return (
                  <Card key={g} className="border-border">
                    <div className="flex items-center justify-between border-b border-border px-4 py-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
                      <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                        {rows.length}
                      </Badge>
                    </div>
                    <DataTableShell columns={['slug', 'name', 'kind', 'events']} loading={loading} empty={null}>
                      {rows.map((t) => (
                        <tr key={t.id} className="border-b border-border/60 hover:bg-secondary/40">
                          <td className="px-4 py-3 font-mono text-xs">{t.slug}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{t.name ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{t.tagKind ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{t._count?.events ?? 0}</td>
                        </tr>
                      ))}
                    </DataTableShell>
                  </Card>
                );
              })}

            {/* Lovable-like компактный вид: те же группы, но в chip-grid (удобно для “быстрого сканирования”). */}
            <div className="pt-2">
              <TagGroupsGrid
                groups={{
                  FORMAT: (tagsByGroup.FORMAT ?? []).map((t) => ({ id: t.id, slug: t.slug })),
                  AUDIENCE: (tagsByGroup.AUDIENCE ?? []).map((t) => ({ id: t.id, slug: t.slug })),
                  LANGUAGE: (tagsByGroup.LANGUAGE ?? []).map((t) => ({ id: t.id, slug: t.slug })),
                  SPECIAL: (tagsByGroup.SPECIAL ?? []).map((t) => ({ id: t.id, slug: t.slug })),
                  SEASON: (tagsByGroup.SEASON ?? []).map((t) => ({ id: t.id, slug: t.slug })),
                  OTHER: (tagsByGroup.OTHER ?? []).map((t) => ({ id: t.id, slug: t.slug })),
                }}
                showUnknown={false}
              />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

