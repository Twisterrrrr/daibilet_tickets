import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/api/client';
import {
  createAdminArticle,
  fetchAdminArticle,
  patchAdminArticle,
  type AdminArticleDetail,
  type ArticleStatus,
} from '@/modules/articles/api/articles';
import { slugifyFromTitle } from '@/modules/articles/utils/slugify';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

type CityOpt = { id: string; name: string; slug: string };

export function ArticleEditPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = rawId === 'new' || !rawId;
  const id = isNew ? '' : rawId!;

  const siteBase = (import.meta as unknown as { env?: { VITE_PUBLIC_SITE_URL?: string } }).env?.VITE_PUBLIC_SITE_URL ?? '';

  const [title, setTitle] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [excerpt, setExcerpt] = React.useState('');
  const [content, setContent] = React.useState('');
  const [coverImageUrl, setCoverImageUrl] = React.useState('');
  const [cityId, setCityId] = React.useState('');
  const [legacyRelatedLandingIds, setLegacyRelatedLandingIds] = React.useState('');
  const [legacyRelatedCollectionIds, setLegacyRelatedCollectionIds] = React.useState('');
  const [seoTitle, setSeoTitle] = React.useState('');
  const [seoDescription, setSeoDescription] = React.useState('');
  const [status, setStatus] = React.useState<ArticleStatus>('DRAFT');
  const [banner, setBanner] = React.useState<string | null>(null);

  type LandingLinkDraft = {
    landingId: string;
    position: number;
    landing?: {
      id: string;
      title: string;
      slug: string;
      isActive: boolean;
      status: string;
      isDeleted: boolean;
      city?: { name: string; slug: string } | null;
    } | null;
  };
  type CollectionLinkDraft = {
    collectionId: string;
    position: number;
    collection?: {
      id: string;
      title: string;
      slug: string;
      isActive: boolean;
      status: string;
      isDeleted: boolean;
      city?: { name: string; slug: string } | null;
    } | null;
  };

  const [landingLinks, setLandingLinks] = React.useState<LandingLinkDraft[]>([]);
  const [collectionLinks, setCollectionLinks] = React.useState<CollectionLinkDraft[]>([]);
  const [showAdvancedLegacy, setShowAdvancedLegacy] = React.useState(false);

  const detailQ = useQuery({
    queryKey: ['admin-article', id],
    queryFn: () => fetchAdminArticle(id),
    enabled: !isNew,
  });

  React.useEffect(() => {
    const d = detailQ.data;
    if (!d) return;
    setTitle(d.title);
    setSlug(d.slug);
    setSlugTouched(true);
    setExcerpt(d.excerpt ?? '');
    setContent(d.content ?? '');
    setCoverImageUrl(d.coverImageUrl ?? '');
    setCityId(d.city?.id ?? '');
    setLegacyRelatedLandingIds(d.relatedLandingIds?.join(', ') ?? '');
    setLegacyRelatedCollectionIds(d.relatedCollectionIds?.join(', ') ?? '');
    setSeoTitle(d.seo.title ?? '');
    setSeoDescription(d.seo.description ?? '');
    setStatus(d.status);

    const canonicalLandingLinks = (d.landingLinks ?? [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((l, idx) => ({
        landingId: l.landingId,
        position: idx,
        landing: l.landing
          ? {
              id: l.landing.id,
              title: l.landing.title,
              slug: l.landing.slug,
              isActive: l.landing.isActive,
              status: l.landing.status,
              isDeleted: l.landing.isDeleted,
              city: l.landing.city ? { name: l.landing.city.name, slug: l.landing.city.slug } : null,
            }
          : null,
      }));

    const canonicalCollectionLinks = (d.collectionLinks ?? [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((l, idx) => ({
        collectionId: l.collectionId,
        position: idx,
        collection: l.collection
          ? {
              id: l.collection.id,
              title: l.collection.title,
              slug: l.collection.slug,
              isActive: l.collection.isActive,
              status: String(l.collection.status ?? ''),
              isDeleted: l.collection.isDeleted,
              city: l.collection.city ? { name: l.collection.city.name, slug: l.collection.city.slug } : null,
            }
          : null,
      }));

    if (canonicalLandingLinks.length) {
      setLandingLinks(canonicalLandingLinks);
    } else {
      setLandingLinks((d.relatedLandingIds ?? []).map((landingId, idx) => ({ landingId, position: idx, landing: null })));
    }
    if (canonicalCollectionLinks.length) {
      setCollectionLinks(canonicalCollectionLinks);
    } else {
      setCollectionLinks((d.relatedCollectionIds ?? []).map((collectionId, idx) => ({ collectionId, position: idx, collection: null })));
    }
  }, [detailQ.data]);

  const citiesQ = useQuery({
    queryKey: ['admin-cities-options-articles'],
    queryFn: async () => {
      const res = await adminApi.get<{ items: CityOpt[] }>('/admin/cities?limit=500');
      return res.items ?? [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const normalizedLandingLinks = landingLinks.map((l, idx) => ({ landingId: l.landingId, position: idx }));
      const normalizedCollectionLinks = collectionLinks.map((l, idx) => ({ collectionId: l.collectionId, position: idx }));

      const body: Record<string, unknown> = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        content,
        coverImageUrl: coverImageUrl.trim() || undefined,
        cityId: cityId || undefined,
        landingLinks: normalizedLandingLinks,
        collectionLinks: normalizedCollectionLinks,
        // legacy mirror for backward compatibility (not primary editing model)
        relatedLandingIds: normalizedLandingLinks.map((l) => l.landingId),
        relatedCollectionIds: normalizedCollectionLinks.map((l) => l.collectionId),
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        status,
      };
      if (isNew) return createAdminArticle(body);
      return patchAdminArticle(id, body);
    },
    onSuccess: (res: AdminArticleDetail) => {
      void qc.invalidateQueries({ queryKey: ['admin-articles'] });
      setBanner('Сохранено');
      window.setTimeout(() => setBanner(null), 3000);
      if (isNew) {
        navigate(`/admin-v3/articles/${res.id}`, { replace: true });
      }
    },
    onError: (e: unknown) => {
      const d = getAdminErrorDisplay(e);
      setBanner(`${d.title}${d.description ? `\n${d.description}` : ''}`);
    },
  });

  const onTitleBlur = () => {
    if (!slugTouched && title.trim()) {
      setSlug(slugifyFromTitle(title));
    }
  };

  const seoWeak = status === 'PUBLISHED' && (!seoTitle.trim() || !seoDescription.trim());

  if (!isNew && detailQ.isLoading) return <LoadingState label="Загрузка статьи…" />;
  if (!isNew && detailQ.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить статью"
        description={detailQ.error instanceof Error ? detailQ.error.message : 'Ошибка'}
        onRetry={() => detailQ.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? 'Новая статья' : 'Редактирование статьи'}
        subtitle={slug ? `Черновик URL: /articles/${slug}` : undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin-v3/articles">К списку</Link>
            </Button>
            {!isNew && slug ? (
              <Button type="button" variant="outline" asChild>
                <a href={`${siteBase}/articles/${encodeURIComponent(slug)}`} target="_blank" rel="noreferrer">
                  Просмотр на сайте
                </a>
              </Button>
            ) : null}
            <Button type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !title.trim()}>
              {saveMut.isPending ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </div>
        }
      />

      {banner ? (
        <div className="whitespace-pre-wrap rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30">
          {banner}
        </div>
      ) : null}

      {seoWeak ? (
        <div className="rounded-md border border-amber-300 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
          Для опубликованной статьи рекомендуется заполнить SEO title и description.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium">Заголовок и slug</h2>
          <label className="block text-xs text-muted-foreground">
            Заголовок
            <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={onTitleBlur} className="mt-1" />
          </label>
          <label className="block text-xs text-muted-foreground">
            Slug
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className="mt-1 font-mono text-sm"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Статус
            <select
              className="mt-1 flex h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as ArticleStatus)}
            >
              <option value="DRAFT">Черновик</option>
              <option value="PUBLISHED">Опубликовано</option>
              <option value="ARCHIVED">Архив</option>
            </select>
          </label>
        </section>

        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium">SEO</h2>
          <label className="block text-xs text-muted-foreground">
            SEO title
            <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="mt-1" />
          </label>
          <label className="block text-xs text-muted-foreground">
            SEO description
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            />
          </label>
        </section>
      </div>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">Контент (Markdown)</h2>
        <label className="block text-xs text-muted-foreground">
          Краткое описание (excerpt)
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          Текст
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={18}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 font-mono text-sm"
          />
        </label>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium">Обложка</h2>
          <label className="block text-xs text-muted-foreground">
            coverImageUrl
            <Input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} className="mt-1" />
          </label>
        </section>
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium">Город</h2>
          <label className="block text-xs text-muted-foreground">
            Город
            <select
              className="mt-1 flex h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
            >
              <option value="">—</option>
              {(citiesQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Related Landings</h2>
            <Badge variant="outline">{landingLinks.length}</Badge>
          </div>

          <RelatedEntityPicker
            kind="landing"
            onPick={(picked) => {
              if (landingLinks.some((x) => x.landingId === picked.id)) return;
              setLandingLinks((prev) => [
                ...prev,
                {
                  landingId: picked.id,
                  position: prev.length,
                  landing: {
                    id: picked.id,
                    title: picked.title,
                    slug: picked.slug,
                    isActive: picked.isActive,
                    status: picked.status,
                    isDeleted: picked.isDeleted,
                    city: picked.city,
                  },
                },
              ]);
            }}
          />

          {landingLinks.length === 0 ? (
            <div className="text-sm text-muted-foreground">Нет связанных лендингов</div>
          ) : (
            <div className="space-y-2">
              {landingLinks.map((l, idx) => (
                <div key={`${l.landingId}-${idx}`} className="flex items-center justify-between gap-2 rounded-md border px-2 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {l.landing?.title ?? l.landingId}
                      {l.landing?.isDeleted ? <span className="ml-2 text-xs text-red-600">deleted</span> : null}
                      {!l.landing?.isDeleted && l.landing && !l.landing.isActive ? (
                        <span className="ml-2 text-xs text-amber-700">inactive</span>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {l.landing?.slug ? `/${l.landing.slug}` : ''}
                      {l.landing?.status ? ` · ${l.landing.status}` : ''}
                      {l.landing?.city ? ` · ${l.landing.city.name}` : ''}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-2"
                      disabled={idx === 0}
                      onClick={() => {
                        setLandingLinks((prev) => {
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
                      className="h-8 px-2"
                      disabled={idx === landingLinks.length - 1}
                      onClick={() => {
                        setLandingLinks((prev) => {
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
                      variant="destructive"
                      className="h-8 px-2"
                      onClick={() =>
                        setLandingLinks((prev) =>
                          prev.filter((x) => x.landingId !== l.landingId).map((x, i) => ({ ...x, position: i })),
                        )
                      }
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Related Collections</h2>
            <Badge variant="outline">{collectionLinks.length}</Badge>
          </div>

          <RelatedEntityPicker
            kind="collection"
            onPick={(picked) => {
              if (collectionLinks.some((x) => x.collectionId === picked.id)) return;
              setCollectionLinks((prev) => [
                ...prev,
                {
                  collectionId: picked.id,
                  position: prev.length,
                  collection: {
                    id: picked.id,
                    title: picked.title,
                    slug: picked.slug,
                    isActive: picked.isActive,
                    status: picked.status,
                    isDeleted: picked.isDeleted,
                    city: picked.city,
                  },
                },
              ]);
            }}
          />

          {collectionLinks.length === 0 ? (
            <div className="text-sm text-muted-foreground">Нет связанных подборок</div>
          ) : (
            <div className="space-y-2">
              {collectionLinks.map((l, idx) => (
                <div
                  key={`${l.collectionId}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {l.collection?.title ?? l.collectionId}
                      {l.collection?.isDeleted ? <span className="ml-2 text-xs text-red-600">deleted</span> : null}
                      {!l.collection?.isDeleted && l.collection && !l.collection.isActive ? (
                        <span className="ml-2 text-xs text-amber-700">inactive</span>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {l.collection?.slug ? `/${l.collection.slug}` : ''}
                      {l.collection?.status ? ` · ${l.collection.status}` : ''}
                      {l.collection?.city ? ` · ${l.collection.city.name}` : ''}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-2"
                      disabled={idx === 0}
                      onClick={() => {
                        setCollectionLinks((prev) => {
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
                      className="h-8 px-2"
                      disabled={idx === collectionLinks.length - 1}
                      onClick={() => {
                        setCollectionLinks((prev) => {
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
                      variant="destructive"
                      className="h-8 px-2"
                      onClick={() =>
                        setCollectionLinks((prev) =>
                          prev
                            .filter((x) => x.collectionId !== l.collectionId)
                            .map((x, i) => ({ ...x, position: i })),
                        )
                      }
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Advanced (legacy)</h2>
          <Button type="button" variant="outline" onClick={() => setShowAdvancedLegacy((v) => !v)}>
            {showAdvancedLegacy ? 'Скрыть' : 'Показать'}
          </Button>
        </div>
        {showAdvancedLegacy ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="block text-xs text-muted-foreground">
              relatedLandingIds (legacy mirror)
              <Input
                value={legacyRelatedLandingIds}
                readOnly
                className="mt-1 font-mono text-sm"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              relatedCollectionIds (legacy mirror)
              <Input
                value={legacyRelatedCollectionIds}
                readOnly
                className="mt-1 font-mono text-sm"
              />
            </label>
            <div className="text-xs text-muted-foreground lg:col-span-2">
              Legacy compatibility mirror (read-only). Primary editor — блоки Related Landings / Related Collections выше.
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

type PickerItem = {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  status: string;
  isDeleted: boolean;
  city: { name: string; slug: string } | null;
};

function RelatedEntityPicker(props: {
  kind: 'landing' | 'collection';
  onPick: (item: PickerItem) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const itemsQ = useQuery({
    queryKey: ['admin-article-rel-picker', props.kind, debounced],
    queryFn: async (): Promise<PickerItem[]> => {
      if (!debounced) return [];
      if (props.kind === 'landing') {
        const res = await adminApi.get<{
          items: Array<{
            id: string;
            title: string;
            slug: string;
            isActive: boolean;
            status: string;
            city: { name: string; slug: string } | null;
          }>;
        }>(
          `/admin/landings?search=${encodeURIComponent(debounced)}&limit=20`,
        );
        return (res.items ?? []).map((x) => ({
          id: x.id,
          title: x.title,
          slug: x.slug,
          isActive: Boolean(x.isActive),
          status: String(x.status ?? ''),
          isDeleted: false,
          city: x.city ? { name: x.city.name, slug: x.city.slug } : null,
        }));
      }
      const res = await adminApi.get<{
        items: Array<{
          id: string;
          title: string;
          slug: string;
          isActive: boolean;
          status: string;
          city: { name: string; slug: string } | null;
        }>;
      }>(
        `/admin/collections?search=${encodeURIComponent(debounced)}&limit=20`,
      );
      return (res.items ?? []).map((x) => ({
        id: x.id,
        title: x.title,
        slug: x.slug,
        isActive: Boolean(x.isActive),
        status: String(x.status ?? ''),
        isDeleted: false,
        city: x.city ? { name: x.city.name, slug: x.city.slug } : null,
      }));
    },
    enabled: open && debounced.length >= 2,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder={props.kind === 'landing' ? 'Поиск лендингов…' : 'Поиск подборок…'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="button" variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? 'Закрыть' : 'Найти'}
        </Button>
      </div>
      {open ? (
        <div className="rounded-md border p-2">
          {debounced.length < 2 ? (
            <div className="text-sm text-muted-foreground">Введите минимум 2 символа</div>
          ) : itemsQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Поиск…</div>
          ) : itemsQ.isError ? (
            <div className="text-sm text-red-600">Ошибка поиска</div>
          ) : (itemsQ.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Ничего не найдено</div>
          ) : (
            <div className="space-y-1">
              {(itemsQ.data ?? []).map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className="w-full rounded-md border px-2 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    props.onPick(it);
                    setOpen(false);
                    setQ('');
                    setDebounced('');
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{it.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {it.slug ? `/${it.slug}` : ''}
                        {it.city ? ` · ${it.city.name}` : ''} · {it.status}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!it.isActive ? <Badge variant="outline">inactive</Badge> : null}
                      {it.isDeleted ? <Badge variant="danger">deleted</Badge> : null}
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
