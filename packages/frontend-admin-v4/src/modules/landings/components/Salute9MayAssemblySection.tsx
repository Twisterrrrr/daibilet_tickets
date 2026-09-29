import * as React from 'react';
import { Link } from 'react-router-dom';

import {
  ActionPanel,
  DataTableShell,
  EmptyState,
  ReadinessChecklist,
  type ChecklistItem,
  RequestErrorState,
} from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { listCities } from '@/modules/cities/api/cities';
import type { CityListItemDto } from '@/modules/cities/types';
import { createLanding, getLanding, listLandings, patchLanding } from '@/modules/landings/api/landings';
import type { LandingDetailDto, LandingListItemDto } from '@/modules/landings/types';
import { LayoutTemplate } from 'lucide-react';

const SALUTE_SLUG = 'salute-9-may';
const DEFAULT_SEASON_WINDOW = { startMonthDay: '03-01', endMonthDay: '05-09' };

type SeasonWindow = { startMonthDay: string; endMonthDay: string };

function readSeasonWindow(payload: unknown): SeasonWindow | null {
  if (!payload || typeof payload !== 'object') return null;
  const win = (payload as any).seasonWindow;
  if (!win || typeof win !== 'object') return null;
  const start = (win as any).startMonthDay;
  const end = (win as any).endMonthDay;
  if (typeof start !== 'string' || typeof end !== 'string') return null;
  return { startMonthDay: start, endMonthDay: end };
}

function setSeasonWindow(payload: unknown, win: SeasonWindow): unknown {
  const base = payload && typeof payload === 'object' ? (payload as any) : {};
  return { ...base, seasonWindow: { startMonthDay: win.startMonthDay, endMonthDay: win.endMonthDay } };
}

function hubReadinessOk(hubReadiness: Record<string, unknown> | undefined): boolean {
  // Backend returns a snapshot with issues[]; treat ERROR presence as not ok.
  const issues = (hubReadiness as any)?.issues;
  if (!Array.isArray(issues)) return true;
  return !issues.some((i) => String(i?.severity ?? '').toUpperCase() === 'ERROR');
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function Salute9MayAssemblySection({
  hub,
  onHubUpdated,
}: {
  hub: LandingDetailDto;
  onHubUpdated: (next: LandingDetailDto) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string>('');

  const [hubMetaTitle, setHubMetaTitle] = React.useState(hub.metaTitle ?? '');
  const [hubMetaDescription, setHubMetaDescription] = React.useState(hub.metaDescription ?? '');
  const [hubSeoH1, setHubSeoH1] = React.useState(hub.seoH1 ?? '');
  const [hubSeoTitle, setHubSeoTitle] = React.useState(hub.seoTitle ?? '');
  const [hubSeoDescription, setHubSeoDescription] = React.useState(hub.seoDescription ?? '');

  const initWin = readSeasonWindow(hub.seasonalPayload) ?? DEFAULT_SEASON_WINDOW;
  const [winStart, setWinStart] = React.useState(initWin.startMonthDay);
  const [winEnd, setWinEnd] = React.useState(initWin.endMonthDay);

  React.useEffect(() => {
    setHubMetaTitle(hub.metaTitle ?? '');
    setHubMetaDescription(hub.metaDescription ?? '');
    setHubSeoH1(hub.seoH1 ?? '');
    setHubSeoTitle(hub.seoTitle ?? '');
    setHubSeoDescription(hub.seoDescription ?? '');
    const w = readSeasonWindow(hub.seasonalPayload) ?? DEFAULT_SEASON_WINDOW;
    setWinStart(w.startMonthDay);
    setWinEnd(w.endMonthDay);
  }, [hub.id]);

  const children = (hub.childLandings ?? []) as any[];
  const hasAnyChild = children.length > 0;
  const hasActiveChild = children.some((c) => Boolean(c?.isActive));
  const seoFilled = isNonEmptyString(hub.metaTitle) && isNonEmptyString(hub.metaDescription) && isNonEmptyString(hub.title);
  const seasonWindowFilled = isNonEmptyString(winStart) && isNonEmptyString(winEnd);
  const readinessOk = hubReadinessOk(hub.hubReadiness);

  const hubChecklist: ChecklistItem[] = [
    { id: 'exists', label: 'HUB существует', done: true },
    { id: 'slug', label: `slug = ${SALUTE_SLUG}`, done: hub.slug === SALUTE_SLUG },
    { id: 'type', label: 'landingType = MULTI_CITY', done: hub.landingType === 'MULTI_CITY' },
    { id: 'child', label: 'Есть хотя бы один CITY child', done: hasAnyChild },
    { id: 'activeChild', label: 'Есть хотя бы один активный CITY child', done: hasActiveChild },
    { id: 'seo', label: 'SEO заполнено (title + metaTitle + metaDescription)', done: seoFilled },
    { id: 'season', label: 'seasonWindow заполнен', done: seasonWindowFilled },
    { id: 'hubReadiness', label: 'hubReadiness без ERROR', done: readinessOk },
  ];

  const canActivateHub = hubChecklist.every((i) => i.done);

  const [spbCity, setSpbCity] = React.useState<CityListItemDto | null>(null);
  const [spbCandidate, setSpbCandidate] = React.useState<LandingListItemDto | null>(null);
  const [spbCandidateLoading, setSpbCandidateLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setSpbCandidateLoading(true);
      try {
        const cities = await listCities({ page: 1, limit: 50, search: 'saint-petersburg' });
        const spb = (cities.items ?? []).find((c) => c.slug === 'saint-petersburg') ?? null;
        if (!cancelled) setSpbCity(spb);

        const res = await listLandings({ page: 1, limit: 50, lite: true, search: SALUTE_SLUG, city: 'saint-petersburg', landingType: 'CITY' });
        const candidate = (res.items ?? []).find((x) => x.slug === SALUTE_SLUG && x.landingType === 'CITY') ?? null;
        if (!cancelled) setSpbCandidate(candidate);
      } catch {
        if (!cancelled) {
          setSpbCity(null);
          setSpbCandidate(null);
        }
      } finally {
        if (!cancelled) setSpbCandidateLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hub.id]);

  const spbChildAlreadyLinked = children.some((c) => c?.city?.slug === 'saint-petersburg' && c?.slug === SALUTE_SLUG);

  async function saveHubBasics() {
    setBusy(true);
    setErr('');
    try {
      const next = await patchLanding(hub.id, {
        metaTitle: hubMetaTitle || null,
        metaDescription: hubMetaDescription || null,
        seoH1: hubSeoH1 || null,
        seoTitle: hubSeoTitle || null,
        seoDescription: hubSeoDescription || null,
        seasonalPayload: setSeasonWindow(hub.seasonalPayload, { startMonthDay: winStart, endMonthDay: winEnd }),
        version: hub.version,
      });
      onHubUpdated(next);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Не удалось сохранить HUB');
    } finally {
      setBusy(false);
    }
  }

  async function toggleHubActive(nextActive: boolean) {
    setBusy(true);
    setErr('');
    try {
      const next = await patchLanding(hub.id, { isActive: nextActive, version: hub.version });
      onHubUpdated(next);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Не удалось обновить isActive');
    } finally {
      setBusy(false);
    }
  }

  async function createSpbChild() {
    if (!spbCity) {
      setErr('Город saint-petersburg не найден в /admin/cities');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const created = await createLanding({
        slug: SALUTE_SLUG,
        landingType: 'CITY',
        parentLandingId: hub.id,
        cityId: spbCity.id,
        templateType: 'SEASONAL_EVENT',
        title: 'Салют 9 мая в Санкт-Петербурге — расписание и цены',
        metaTitle: 'Салют 9 мая в Санкт-Петербурге — с Невы, теплоходы и билеты | Дайбилет',
        metaDescription: 'Салют 9 мая в Петербурге: варианты с Невы и лучшие точки обзора. Сравните предложения на Дайбилет.',
        filterTag: 'salyut-9-maya',
        seasonalPayload: {
          seasonWindow: DEFAULT_SEASON_WINDOW,
          viewpoints: [],
          tips: [],
        },
        isActive: false,
        isIndexable: false,
        status: 'DRAFT',
      });
      // Open child in a new tab of admin v4
      window.open(`/admin-v4/landings/${created.id}?tab=coverage`, '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Не удалось создать CITY-child');
    } finally {
      setBusy(false);
    }
  }

  async function linkSpbCandidate() {
    if (!spbCandidate) return;
    setBusy(true);
    setErr('');
    try {
      const detail = await getLanding(spbCandidate.id);
      const next = await patchLanding(spbCandidate.id, {
        parentLandingId: hub.id,
        templateType: detail.templateType ?? 'SEASONAL_EVENT',
        seasonalPayload: detail.seasonalPayload ?? { seasonWindow: DEFAULT_SEASON_WINDOW },
        version: detail.version,
      });
      window.open(`/admin-v4/landings/${next.id}?tab=coverage`, '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Не удалось привязать CITY-лендинг к HUB');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-4 border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Сезонный сборщик: “Салют 9 мая”</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              HUB slug: <span className="ml-1 font-mono">{hub.slug}</span>
            </Badge>
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              landingType: <span className="ml-1 font-mono">{hub.landingType ?? '—'}</span>
            </Badge>
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              seasonWindow: <span className="ml-1 font-mono">{winStart}…{winEnd}</span>
            </Badge>
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              children: <span className="ml-1 font-mono">{children.length}</span>
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href="/salute-9-may" target="_blank" rel="noreferrer">
              Preview /salute-9-may
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href="/cities/saint-petersburg/salute-9-may" target="_blank" rel="noreferrer">
              Preview /cities/spb/salute-9-may
            </a>
          </Button>
        </div>
      </div>

      {err ? <div className="mt-3"><RequestErrorState description={err} onRetry={() => setErr('')} /></div> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ReadinessChecklist title="HUB readiness" items={hubChecklist} />

        <ActionPanel title="HUB actions">
          <div className="grid gap-2">
            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">
                metaTitle
                <Input value={hubMetaTitle} onChange={(e) => setHubMetaTitle(e.target.value)} className="mt-1 h-9" />
              </label>
              <label className="text-xs text-muted-foreground">
                metaDescription
                <Input value={hubMetaDescription} onChange={(e) => setHubMetaDescription(e.target.value)} className="mt-1 h-9" />
              </label>
              <label className="text-xs text-muted-foreground">
                seoH1
                <Input value={hubSeoH1} onChange={(e) => setHubSeoH1(e.target.value)} className="mt-1 h-9" />
              </label>
              <label className="text-xs text-muted-foreground">
                seoTitle
                <Input value={hubSeoTitle} onChange={(e) => setHubSeoTitle(e.target.value)} className="mt-1 h-9" />
              </label>
              <label className="text-xs text-muted-foreground">
                seoDescription
                <Input value={hubSeoDescription} onChange={(e) => setHubSeoDescription(e.target.value)} className="mt-1 h-9" />
              </label>
            </div>

            <div className="grid gap-2 rounded-md border border-border p-3">
              <div className="text-xs font-semibold text-foreground">seasonWindow (MM-DD)</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  startMonthDay
                  <Input value={winStart} onChange={(e) => setWinStart(e.target.value)} className="mt-1 h-9 font-mono" />
                </label>
                <label className="text-xs text-muted-foreground">
                  endMonthDay
                  <Input value={winEnd} onChange={(e) => setWinEnd(e.target.value)} className="mt-1 h-9 font-mono" />
                </label>
              </div>
            </div>

            <Button size="sm" onClick={saveHubBasics} disabled={busy}>
              Сохранить HUB
            </Button>
            <Button size="sm" variant="outline" onClick={() => toggleHubActive(!hub.isActive)} disabled={busy || (!hub.isActive && !canActivateHub)}>
              {hub.isActive ? 'Выключить HUB' : canActivateHub ? 'Включить HUB' : 'Включить HUB (blocked)'}
            </Button>
          </div>
        </ActionPanel>

        <ActionPanel title="CITY child (первый город: СПб)">
          <div className="text-xs text-muted-foreground">
            Цель MVP: собрать <span className="font-mono">/salute-9-may</span> и <span className="font-mono">/cities/saint-petersburg/salute-9-may</span>.
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <Button size="sm" onClick={createSpbChild} disabled={busy || spbChildAlreadyLinked}>
              Создать CITY-child для СПб
            </Button>
            <Button size="sm" variant="outline" onClick={linkSpbCandidate} disabled={busy || !spbCandidate || spbChildAlreadyLinked || spbCandidateLoading}>
              Привязать существующий CITY-лендинг СПб к HUB
            </Button>
            {spbCandidateLoading ? (
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                поиск CITY-лендинга…
              </Badge>
            ) : spbChildAlreadyLinked ? (
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                CITY-child СПб уже привязан
              </Badge>
            ) : spbCandidate ? (
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                найден CITY-кандидат: <span className="ml-1 font-mono">{spbCandidate.id}</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                CITY-кандидат не найден (можно создать)
              </Badge>
            )}
          </div>
        </ActionPanel>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-sm font-semibold text-foreground">CITY child landings</div>
        <DataTableShell
          columns={[
            'Город',
            'slug',
            'isActive',
            'templateType',
            'filterTag',
            'seasonalPayload',
            'SEO',
            'preview',
          ]}
          empty={
            children.length === 0 ? (
              <EmptyState
                icon={LayoutTemplate}
                title="Дочерних CITY-лендингов нет"
                description="Создайте первый child для Санкт-Петербурга."
              />
            ) : null
          }
        >
          {children.map((c: any) => {
            const citySlug = c?.city?.slug ?? null;
            const seoOkRow = isNonEmptyString(c?.metaTitle) && isNonEmptyString(c?.metaDescription) && isNonEmptyString(c?.title);
            const seasonOkRow = Boolean(readSeasonWindow(c?.seasonalPayload));
            const filterOkRow = Boolean(isNonEmptyString(c?.filterTag) || isNonEmptyString(c?.filterTagRef?.slug) || isNonEmptyString(c?.filterTagId));
            const tplOkRow = String(c?.templateType ?? '').toUpperCase() === 'SEASONAL_EVENT';
            return (
              <tr key={c.id} className="border-b border-border/60 hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <Link to={`/admin-v4/landings/${c.id}?tab=coverage`} className="font-medium hover:underline">
                    {c?.city?.name ?? '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{c.slug ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{c.isActive ? 'yes' : 'no'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{c.templateType ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {filterOkRow ? 'ok' : 'missing'}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {seasonOkRow ? 'window ok' : 'window missing'}
                  {!tplOkRow ? <div className="mt-1 text-[11px] text-warning-foreground">templateType != SEASONAL_EVENT</div> : null}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{seoOkRow ? 'ok' : 'missing'}</td>
                <td className="px-4 py-3">
                  {citySlug ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/cities/${citySlug}/${SALUTE_SLUG}`} target="_blank" rel="noreferrer">
                        Preview
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTableShell>
      </div>
    </Card>
  );
}

