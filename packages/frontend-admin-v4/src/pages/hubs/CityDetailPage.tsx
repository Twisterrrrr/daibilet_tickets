import * as React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { DataTableShell, EmptyState, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin } from 'lucide-react';
import { getCity, patchCity } from '@/modules/cities/api/cities';
import type { CityDetailDto } from '@/modules/cities/types';

type TabKey = 'overview' | 'content' | 'seo' | 'landings';

export function CityDetailPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'overview') as TabKey;

  const setTab = (nextTab: TabKey) => {
    const next = new URLSearchParams(params);
    next.set('tab', nextTab);
    setParams(next, { replace: true });
  };

  const [data, setData] = React.useState<CityDetailDto | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [mutating, setMutating] = React.useState(false);
  const [mutateError, setMutateError] = React.useState('');

  const [metaTitle, setMetaTitle] = React.useState('');
  const [metaDescription, setMetaDescription] = React.useState('');
  const [heroImage, setHeroImage] = React.useState('');
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const res = await getCity(id);
        if (!cancelled) setData(res);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const city = data;
  const landings = city?.landingPages ?? [];
  React.useEffect(() => {
    if (!city) return;
    setMetaTitle(String(city.metaTitle ?? ''));
    setMetaDescription(String(city.metaDescription ?? ''));
    setHeroImage(String(city.heroImage ?? ''));
    setDescription(String(city.description ?? ''));
  }, [city?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader
        title={city ? city.name : 'Город'}
        description={city ? city.slug : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin-v4/cities">Назад к списку</Link>
            </Button>
          </div>
        }
      />

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}
      {mutateError ? <div className="mb-3 text-sm text-destructive">{mutateError}</div> : null}

      <Card className="mb-3 border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={city?.isActive ? 'live' : 'draft'} label={city?.isActive ? 'опубликован' : 'черновик'} />
          <Badge variant="outline" className="border-border font-normal text-muted-foreground">
            id: <span className="ml-1 font-mono">{id}</span>
          </Badge>
          {city?.readinessStatus ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              готовность: {city.readinessStatus}
            </Badge>
          ) : null}
          {city?.flags?.hasSeo != null ? (
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              seo: {city.flags.hasSeo ? 'ok' : 'missing'}
            </Badge>
          ) : null}
        </div>
      </Card>

      <Card className="mb-3 border-border p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['overview', 'Обзор'],
              ['content', 'Контент'],
              ['seo', 'SEO'],
              ['landings', 'Лендинги'],
            ] as const
          ).map(([id, label]) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                  (active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-secondary')
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </Card>

      {city ? (
        <Card className="mb-3 border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium">Действия</div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={mutating || !city}
                onClick={async () => {
                  if (!city) return;
                  setMutateError('');
                  setMutating(true);
                  try {
                    const next = await patchCity(city.id, {
                      version: city.version,
                      metaTitle: metaTitle.trim() ? metaTitle.trim() : null,
                      metaDescription: metaDescription.trim() ? metaDescription.trim() : null,
                      heroImage: heroImage.trim() ? heroImage.trim() : null,
                      description: description.trim() ? description.trim() : null,
                    });
                    setData(next);
                  } catch (e: unknown) {
                    setMutateError(e instanceof Error ? e.message : 'Не удалось сохранить город');
                  } finally {
                    setMutating(false);
                  }
                }}
              >
                Сохранить
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={mutating || !city}
                onClick={async () => {
                  if (!city) return;
                  setMutateError('');
                  setMutating(true);
                  try {
                    const next = await patchCity(city.id, { version: city.version, isActive: !city.isActive });
                    setData(next);
                  } catch (e: unknown) {
                    setMutateError(e instanceof Error ? e.message : 'Не удалось изменить активность');
                  } finally {
                    setMutating(false);
                  }
                }}
              >
                {city.isActive ? 'Снять с публикации' : 'Опубликовать'}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {tab === 'overview' && city ? (
        <Card className="mb-3 border-border p-4">
          <div className="text-sm font-medium">Сводка</div>
          <div className="mt-2 grid gap-2 text-sm lg:grid-cols-2">
            <div className="text-muted-foreground">
              Slug: <span className="font-mono text-foreground">{city.slug}</span>
            </div>
            <div className="text-muted-foreground">
              SEO: <span className="text-foreground">{city.flags?.hasSeo ? 'ok' : 'missing'}</span>
            </div>
          </div>
        </Card>
      ) : null}

      {tab === 'content' && city ? (
        <Card className="mb-3 border-border p-4">
          <div className="text-sm font-medium">Контент хаба</div>
          <div className="mt-3 grid gap-3">
            <label className="text-xs text-muted-foreground">
              heroImage (url)
              <Input value={heroImage} onChange={(e) => setHeroImage(e.target.value)} className="mt-1 h-9" />
            </label>
            <label className="text-xs text-muted-foreground">
              description
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-[120px]" />
            </label>
          </div>
        </Card>
      ) : null}

      {tab === 'seo' && city ? (
        <Card className="mb-3 border-border p-4">
          <div className="text-sm font-medium">SEO</div>
          <div className="mt-3 grid gap-3">
            <label className="text-xs text-muted-foreground">
              metaTitle
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="mt-1 h-9" />
            </label>
            <label className="text-xs text-muted-foreground">
              metaDescription
              <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="mt-1 min-h-[92px]" />
            </label>
          </div>
        </Card>
      ) : null}

      {tab === 'landings' ? (
        <DataTableShell
          columns={['Лендинг', 'Тип', 'Indexable', 'Статус', 'Updated']}
          loading={loading}
          empty={!loading && !error && city && landings.length === 0 ? <EmptyState icon={MapPin} title="Лендингов пока нет" description="У этого города ещё нет связанных landing pages." /> : null}
        >
          {landings.map((l) => (
            <tr key={l.id} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="px-4 py-3">
                <Link to={`/admin-v4/landings/${l.id}`} className="font-medium hover:underline">
                  {l.title}
                </Link>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{l.slug}</div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{l.landingType ?? '—'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{l.isIndexable ? 'yes' : 'no'}</td>
              <td className="px-4 py-3">
                <StatusBadge status={(l.isActive ? 'live' : 'draft') as any} label={l.status ?? undefined} />
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{l.updatedAt ? new Date(l.updatedAt).toLocaleString('ru-RU') : '—'}</td>
            </tr>
          ))}
        </DataTableShell>
      ) : null}
    </>
  );
}

