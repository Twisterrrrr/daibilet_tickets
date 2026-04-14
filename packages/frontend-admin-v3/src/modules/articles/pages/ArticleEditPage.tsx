import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
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

function parseIds(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

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
  const [relatedLandingIds, setRelatedLandingIds] = React.useState('');
  const [relatedCollectionIds, setRelatedCollectionIds] = React.useState('');
  const [seoTitle, setSeoTitle] = React.useState('');
  const [seoDescription, setSeoDescription] = React.useState('');
  const [status, setStatus] = React.useState<ArticleStatus>('DRAFT');
  const [banner, setBanner] = React.useState<string | null>(null);

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
    setRelatedLandingIds(d.relatedLandingIds?.join(', ') ?? '');
    setRelatedCollectionIds(d.relatedCollectionIds?.join(', ') ?? '');
    setSeoTitle(d.seo.title ?? '');
    setSeoDescription(d.seo.description ?? '');
    setStatus(d.status);
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
      const body: Record<string, unknown> = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        content,
        coverImageUrl: coverImageUrl.trim() || undefined,
        cityId: cityId || undefined,
        relatedLandingIds: parseIds(relatedLandingIds),
        relatedCollectionIds: parseIds(relatedCollectionIds),
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
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
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

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">Связи (UUID через запятую)</h2>
        <label className="block text-xs text-muted-foreground">
          relatedLandingIds
          <textarea
            value={relatedLandingIds}
            onChange={(e) => setRelatedLandingIds(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 font-mono text-xs"
            placeholder="uuid, uuid…"
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          relatedCollectionIds
          <textarea
            value={relatedCollectionIds}
            onChange={(e) => setRelatedCollectionIds(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 font-mono text-xs"
            placeholder="uuid, uuid…"
          />
        </label>
      </section>
    </div>
  );
}
