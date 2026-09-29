import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { DataTableShell, EmptyState, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Globe2, LayoutTemplate, MapPin, Search as SearchIcon, X } from 'lucide-react';
import { createLanding, listLandings } from '@/modules/landings/api/landings';
import type { LandingListItemDto, Paginated } from '@/modules/landings/types';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';

function statusFromLanding(r: LandingListItemDto): 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error' {
  const s = (r.status ?? '').toUpperCase();
  if (s.includes('DRAFT')) return 'draft';
  if (s.includes('ACTIVE') || r.isActive) return 'live';
  if (s.includes('PAUSED')) return 'paused';
  return 'ready';
}

export function LandingsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get('q') ?? '';
  const city = params.get('city') ?? 'all';
  const status = params.get('status') ?? 'all';
  const landingType = params.get('landingType') ?? 'all';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);
  const pageSize = 50;

  const update = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (!v || v === 'all') next.delete(k);
    else next.set(k, v);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  const setPage = (p: number) => {
    const next = new URLSearchParams(params);
    if (p <= 1) next.delete('page');
    else next.set('page', String(p));
    setParams(next, { replace: true });
  };
  const reset = () => setParams(new URLSearchParams(), { replace: true });

  const [data, setData] = React.useState<Paginated<LandingListItemDto> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const debouncedQ = useDebouncedValue(q, 350);

  // Narrow operator shortcut: seasonal hub salute-9-may
  const [saluteHub, setSaluteHub] = React.useState<LandingListItemDto | null>(null);
  const [saluteLoading, setSaluteLoading] = React.useState(false);
  const [saluteError, setSaluteError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listLandings({
          page,
          limit: pageSize,
          lite: true,
          search: debouncedQ.trim() ? debouncedQ.trim() : undefined,
          city: city !== 'all' ? city : undefined,
          status: status !== 'all' ? status : undefined,
          landingType: landingType !== 'all' ? landingType : undefined,
        });
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
  }, [debouncedQ, city, status, landingType, page]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setSaluteLoading(true);
      setSaluteError('');
      try {
        const res = await listLandings({ page: 1, limit: 5, lite: true, search: 'salute-9-may', landingType: 'MULTI_CITY' });
        const hub = (res.items ?? []).find((x) => x.slug === 'salute-9-may' && x.landingType === 'MULTI_CITY') ?? null;
        if (!cancelled) setSaluteHub(hub);
      } catch (e: unknown) {
        if (!cancelled) setSaluteError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setSaluteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = data?.items ?? [];
  const showEmpty = !loading && !error && data !== null && rows.length === 0;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <>
      <PageHeader
        title="Лендинги"
        description="Редакционные и мерчандайзинговые поверхности. Город или тема — две формы одной системы лендингов."
        actions={
          <Button size="sm" variant="outline" disabled>
            Новый лендинг (later)
          </Button>
        }
      />

      <Card className="mb-3 border-border p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-96">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => update('q', e.target.value)} placeholder="Поиск: title, slug…" className="h-9 border-border bg-background pl-8 text-sm" />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="ml-0 mr-1">Быстро:</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('q', 'salute-9-may');
                next.set('landingType', 'MULTI_CITY');
                setParams(next, { replace: true });
              }}
            >
              Салют 9 мая
            </Button>

            <span>Тип:</span>
            <button type="button" className={`rounded border px-2 py-1 ${landingType === 'all' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('landingType', 'all')}>
              Все
            </button>
            <button type="button" className={`rounded border px-2 py-1 ${landingType === 'CITY' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('landingType', 'CITY')}>
              Город
            </button>
            <button type="button" className={`rounded border px-2 py-1 ${landingType === 'MULTI_CITY' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('landingType', 'MULTI_CITY')}>
              Мульти
            </button>

            <span className="ml-2">Статус:</span>
            <button type="button" className={`rounded border px-2 py-1 ${status === 'all' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('status', 'all')}>
              Все
            </button>
            <button type="button" className={`rounded border px-2 py-1 ${status === 'ACTIVE' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('status', 'ACTIVE')}>
              Активные
            </button>
            <button type="button" className={`rounded border px-2 py-1 ${status === 'DRAFT' ? 'bg-secondary' : 'border-border hover:bg-secondary'}`} onClick={() => update('status', 'DRAFT')}>
              Черновики
            </button>

            {(q || city !== 'all' || status !== 'all' || landingType !== 'all') && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={reset}>
                <X className="mr-1 h-3.5 w-3.5" /> Сбросить
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="mb-3 border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">Сезонный HUB: “Салют 9 мая”</div>
            <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">slug: salute-9-may · landingType: MULTI_CITY</div>
            {saluteError ? <div className="mt-1 text-xs text-destructive">{saluteError}</div> : null}
          </div>
          <div className="flex items-center gap-2">
            {saluteLoading ? (
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                загрузка…
              </Badge>
            ) : saluteHub ? (
              <>
                <StatusBadge status={statusFromLanding(saluteHub)} label={saluteHub.status ?? undefined} />
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/admin-v4/landings/${saluteHub.id}`}>Открыть HUB</Link>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={async () => {
                  setSaluteLoading(true);
                  setSaluteError('');
                  try {
                    // Safety: if hub already exists (or DB treats cityId=null as unique), open it instead of failing on create.
                    const existing = await listLandings({
                      page: 1,
                      limit: 10,
                      lite: true,
                      search: 'salute-9-may',
                      landingType: 'MULTI_CITY',
                    });
                    const hub = (existing.items ?? []).find((x) => x.slug === 'salute-9-may' && x.landingType === 'MULTI_CITY') ?? null;
                    if (hub) {
                      navigate(`/admin-v4/landings/${hub.id}?tab=coverage`, { replace: true });
                      return;
                    }

                    const created = await createLanding({
                      slug: 'salute-9-may',
                      landingType: 'MULTI_CITY',
                      filterTag: 'salyut-9-maya',
                      title: 'Салют 9 мая — по городам',
                      metaTitle: 'Салют 9 мая — события по городам | Дайбилет',
                      metaDescription: 'Выберите город и сравните варианты: теплоходы, крыши и обзорные точки.',
                      seasonalPayload: { seasonWindow: { startMonthDay: '03-01', endMonthDay: '05-09' } },
                      isActive: false,
                      isIndexable: false,
                      status: 'DRAFT',
                    });
                    navigate(`/admin-v4/landings/${created.id}?tab=coverage`, { replace: true });
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Не удалось создать HUB';
                    // If we raced with another create, open existing hub.
                    if (typeof msg === 'string' && msg.includes('Unique constraint failed')) {
                      try {
                        const existing = await listLandings({
                          page: 1,
                          limit: 10,
                          lite: true,
                          search: 'salute-9-may',
                          landingType: 'MULTI_CITY',
                        });
                        const hub = (existing.items ?? []).find((x) => x.slug === 'salute-9-may' && x.landingType === 'MULTI_CITY') ?? null;
                        if (hub) {
                          navigate(`/admin-v4/landings/${hub.id}?tab=coverage`, { replace: true });
                          return;
                        }
                      } catch {
                        // ignore
                      }
                    }
                    setSaluteError(msg);
                  } finally {
                    setSaluteLoading(false);
                  }
                }}
              >
                Создать HUB
              </Button>
            )}
          </div>
        </div>
      </Card>

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      <DataTableShell
        columns={['Название', 'Город', 'Тип', 'На сайте', 'SEO', 'Статус']}
        loading={loading}
        empty={showEmpty ? <EmptyState icon={LayoutTemplate} title="Лендинги не найдены" description="Измените фильтры или создайте новый лендинг." /> : null}
      >
        {rows.map((r) => {
          const seoOk = Boolean((r.metaTitle ?? '').trim() && (r.metaDescription ?? '').trim());
          const landingTypeRu =
            r.landingType === 'CITY' ? 'Город' : r.landingType === 'MULTI_CITY' ? 'Мульти' : (r.landingType ?? '—');
          return (
            <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="px-4 py-3">
                <Link to={`/admin-v4/landings/${r.id}`} className="flex items-center gap-2 font-medium hover:underline">
                  {r.landingType === 'CITY' ? <MapPin className="h-4 w-4 text-muted-foreground" /> : <Globe2 className="h-4 w-4 text-muted-foreground" />}
                  {r.title}
                </Link>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{r.slug}</div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{r.city?.name ?? '—'}</td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                  {landingTypeRu}
                </Badge>
              </td>
              <td className="px-4 py-3 max-w-[220px]">
                {r.storefrontPublicUrl ? (
                  <a
                    href={r.storefrontPublicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate font-mono text-[11px] text-primary hover:underline"
                    title={r.storefrontPublicUrl}
                  >
                    {r.storefrontPublicUrl}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground" title="Задайте canonical или PUBLIC_STOREFRONT_ORIGIN на бэке">
                    —
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className={`border-border font-normal ${seoOk ? 'text-muted-foreground' : 'text-warning-foreground border-warning/30 bg-warning/10'}`}>
                  {seoOk ? 'ок' : 'не заполнено'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={statusFromLanding(r)} label={r.status ?? undefined} />
              </td>
            </tr>
          );
        })}
      </DataTableShell>

      {data && total > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <div>
            Всего: {total} · стр. {page} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" disabled={!canPrev} onClick={() => setPage(page - 1)}>
              Назад
            </Button>
            <Button variant="outline" size="sm" className="h-8" disabled={!canNext} onClick={() => setPage(page + 1)}>
              Вперёд
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

