import * as React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { LandingContentBlocksTab, type LandingBlockRow } from '@/modules/landings/components/tabs/LandingContentBlocksTab';
import { LandingCoverageTab, type LandingCoverageChild } from '@/modules/landings/components/tabs/LandingCoverageTab';
import { LandingDiagnosticsTab } from '@/modules/landings/components/tabs/LandingDiagnosticsTab';
import { LandingMatchingTab } from '@/modules/landings/components/tabs/LandingMatchingTab';
import { LandingOverviewTab } from '@/modules/landings/components/tabs/LandingOverviewTab';
import { LandingSeoTab } from '@/modules/landings/components/tabs/LandingSeoTab';
import { getLanding, patchLanding } from '@/modules/landings/api/landings';
import type { LandingDetailDto } from '@/modules/landings/types';
import { Salute9MayAssemblySection } from '@/modules/landings/components/Salute9MayAssemblySection';

function buildPreviewHref(l: LandingDetailDto): string | null {
  const storefront = (l.storefrontPublicUrl ?? '').trim();
  if (storefront) return storefront;
  const c = (l.canonicalUrl ?? '').trim();
  if (/^https?:\/\//i.test(c)) return c;
  const citySlug = l.city?.slug;
  if (citySlug && l.slug) return `/${citySlug}/${l.slug}`;
  if ((l.landingType ?? '').toUpperCase() === 'MULTI_CITY' && l.slug) return `/${l.slug}`;
  return null;
}

function normalizeContentBlocks(raw: unknown): LandingBlockRow[] {
  if (!Array.isArray(raw)) return [];
  const out: LandingBlockRow[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const id = o.id != null ? String(o.id) : '';
    if (!id) continue;
    out.push({
      id,
      type: o.type != null ? String(o.type) : null,
      variant: o.variant != null ? String(o.variant) : null,
      title: o.title != null ? String(o.title) : null,
      sortOrder: typeof o.sortOrder === 'number' ? o.sortOrder : null,
      isEnabled: typeof o.isEnabled === 'boolean' ? o.isEnabled : null,
    });
  }
  return out;
}

function statusFromLanding(r: LandingDetailDto): 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error' {
  const s = (r.status ?? '').toUpperCase();
  if (s.includes('DRAFT')) return 'draft';
  if (s.includes('ACTIVE') || r.isActive) return 'live';
  if (s.includes('PAUSED')) return 'paused';
  return 'ready';
}

type TabId = 'overview' | 'coverage' | 'seo' | 'blocks' | 'matching' | 'diagnostics';

type AdditionalFiltersDraft = {
  category: string;
  source: string;
  minDuration: string;
  maxDuration: string;
  featuresCsv: string;
};

function readAdditionalFiltersDraft(raw: unknown): AdditionalFiltersDraft {
  const o = raw && typeof raw === 'object' ? (raw as any) : {};
  return {
    category: typeof o.category === 'string' ? o.category : '',
    source: typeof o.source === 'string' ? o.source : '',
    minDuration: typeof o.minDuration === 'number' ? String(o.minDuration) : '',
    maxDuration: typeof o.maxDuration === 'number' ? String(o.maxDuration) : '',
    featuresCsv: Array.isArray(o.features) ? o.features.map(String).filter(Boolean).join(', ') : '',
  };
}

function buildAdditionalFiltersPayload(d: AdditionalFiltersDraft): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const cat = d.category.trim();
  const src = d.source.trim();
  if (cat) out.category = cat;
  if (src) out.source = src;
  const min = d.minDuration.trim() ? Number(d.minDuration.trim()) : NaN;
  const max = d.maxDuration.trim() ? Number(d.maxDuration.trim()) : NaN;
  if (Number.isFinite(min)) out.minDuration = min;
  if (Number.isFinite(max)) out.maxDuration = max;
  const features = d.featuresCsv
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (features.length) out.features = Array.from(new Set(features));
  return out;
}

export function LandingDetailPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as TabId | null) ?? 'coverage';

  const setTab = (t: TabId) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next, { replace: true });
  };

  const [data, setData] = React.useState<LandingDetailDto | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');
  const [editOpen, setEditOpen] = React.useState(false);

  const [draftTitle, setDraftTitle] = React.useState('');
  const [draftSlug, setDraftSlug] = React.useState('');
  const [draftFilterTag, setDraftFilterTag] = React.useState('');
  const [draftMetaTitle, setDraftMetaTitle] = React.useState('');
  const [draftMetaDescription, setDraftMetaDescription] = React.useState('');
  const [draftSeoH1, setDraftSeoH1] = React.useState('');
  const [draftSeoTitle, setDraftSeoTitle] = React.useState('');
  const [draftSeoDescription, setDraftSeoDescription] = React.useState('');
  const [draftCanonicalUrl, setDraftCanonicalUrl] = React.useState('');
  const [draftOgImageUrl, setDraftOgImageUrl] = React.useState('');
  const [draftIsActive, setDraftIsActive] = React.useState(false);
  const [draftIsIndexable, setDraftIsIndexable] = React.useState(true);
  const [draftStatus, setDraftStatus] = React.useState('');
  const [draftAdditionalFilters, setDraftAdditionalFilters] = React.useState<AdditionalFiltersDraft>({
    category: '',
    source: '',
    minDuration: '',
    maxDuration: '',
    featuresCsv: '',
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const res = await getLanding(id);
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

  const l = data;

  React.useEffect(() => {
    if (!l) return;
    setDraftTitle(l.title ?? '');
    setDraftSlug(l.slug ?? '');
    setDraftFilterTag(l.filterTag ?? '');
    setDraftMetaTitle(l.metaTitle ?? '');
    setDraftMetaDescription(l.metaDescription ?? '');
    setDraftSeoH1(l.seoH1 ?? '');
    setDraftSeoTitle(l.seoTitle ?? '');
    setDraftSeoDescription(l.seoDescription ?? '');
    setDraftCanonicalUrl(l.canonicalUrl ?? '');
    setDraftOgImageUrl(l.ogImageUrl ?? '');
    setDraftIsActive(Boolean(l.isActive));
    setDraftIsIndexable(l.isIndexable == null ? true : Boolean(l.isIndexable));
    setDraftStatus(l.status ?? '');
    setDraftAdditionalFilters(readAdditionalFiltersDraft(l.additionalFilters));
  }, [l?.id, l?.version]);

  const blockRows = React.useMemo(() => normalizeContentBlocks(l?.contentBlocks), [l?.contentBlocks]);
  const blocksCount = blockRows.length;
  const child = (l?.childLandings ?? []) as LandingCoverageChild[];
  const seoOk = Boolean((l?.metaTitle ?? '').trim() && (l?.metaDescription ?? '').trim());
  const isSaluteHub = Boolean(l && l.slug === 'salute-9-may' && l.landingType === 'MULTI_CITY');
  const previewHref = l ? buildPreviewHref(l) : null;

  return (
    <>
      <PageHeader
        title={l ? l.title : 'Лендинг'}
        description={l ? l.slug : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin-v4/landings">Назад к списку</Link>
            </Button>
            {previewHref ? (
              <Button size="sm" variant="outline" asChild>
                <a href={previewHref} target="_blank" rel="noreferrer">
                  На сайте
                </a>
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="mb-3 border-border p-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setTab('overview')} className={`rounded-full border px-3 py-1 text-xs ${tab === 'overview' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
            Обзор
          </button>
          <button type="button" onClick={() => setTab('coverage')} className={`rounded-full border px-3 py-1 text-xs ${tab === 'coverage' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
            Охват
          </button>
          <button type="button" onClick={() => setTab('seo')} className={`rounded-full border px-3 py-1 text-xs ${tab === 'seo' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
            SEO
          </button>
          <button type="button" onClick={() => setTab('blocks')} className={`rounded-full border px-3 py-1 text-xs ${tab === 'blocks' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
            Блоки
          </button>
          <button type="button" onClick={() => setTab('matching')} className={`rounded-full border px-3 py-1 text-xs ${tab === 'matching' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
            Подбор
          </button>
          <button type="button" onClick={() => setTab('diagnostics')} className={`rounded-full border px-3 py-1 text-xs ${tab === 'diagnostics' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
            Диагностика
          </button>
        </div>
      </Card>

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      {isSaluteHub && l ? (
        <Salute9MayAssemblySection
          hub={l}
          onHubUpdated={(next) => {
            setData(next);
          }}
        />
      ) : null}

      {tab === 'overview' ? (
        <>
          <LandingOverviewTab
            id={id}
            statusBadge={l ? { status: statusFromLanding(l), label: l.status ?? undefined } : undefined}
            cityName={l?.city?.name ?? null}
            landingType={l?.landingType ?? null}
            isIndexable={l?.isIndexable ?? null}
            seoOk={seoOk}
            blocksCount={blocksCount}
            canonicalUrl={l?.canonicalUrl ?? null}
            previewHref={previewHref}
            hubReadiness={l?.hubReadiness ?? null}
          />

          {l ? (
            <Card className="mb-3 border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Редактирование (PATCH)</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Сохранение через <span className="font-mono">PATCH /admin/landings/:id</span> с <span className="font-mono">version</span> (конфликты не затираем молча).
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditOpen((v) => !v)}>
                    {editOpen ? 'Скрыть форму' : 'Открыть форму'}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!editOpen || saving}
                    onClick={async () => {
                      setSaveError('');
                      setSaving(true);
                      try {
                        const body: Record<string, unknown> = {
                          version: l.version ?? 0,
                          title: draftTitle.trim(),
                          slug: draftSlug.trim(),
                          filterTag: draftFilterTag.trim(),
                          status: draftStatus.trim() ? draftStatus.trim() : undefined,
                          isActive: draftIsActive,
                          isIndexable: draftIsIndexable,
                          metaTitle: draftMetaTitle.trim() ? draftMetaTitle.trim() : null,
                          metaDescription: draftMetaDescription.trim() ? draftMetaDescription.trim() : null,
                          seoH1: draftSeoH1.trim() ? draftSeoH1.trim() : null,
                          seoTitle: draftSeoTitle.trim() ? draftSeoTitle.trim() : null,
                          seoDescription: draftSeoDescription.trim() ? draftSeoDescription.trim() : null,
                          canonicalUrl: draftCanonicalUrl.trim() ? draftCanonicalUrl.trim() : null,
                          ogImageUrl: draftOgImageUrl.trim() ? draftOgImageUrl.trim() : null,
                          additionalFilters: buildAdditionalFiltersPayload(draftAdditionalFilters),
                        };
                        await patchLanding(l.id, body as any);
                        const next = await getLanding(l.id);
                        setData(next);
                      } catch (e: unknown) {
                        setSaveError(e instanceof Error ? e.message : 'Не удалось сохранить');
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {saving ? 'Сохранение…' : 'Сохранить'}
                  </Button>
                </div>
              </div>

              {saveError ? <div className="mt-3 text-sm text-destructive">{saveError}</div> : null}

              {editOpen ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">title</div>
                      <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">slug</div>
                      <Input value={draftSlug} onChange={(e) => setDraftSlug(e.target.value)} className="h-9 font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">filterTag (slug)</div>
                      <Input value={draftFilterTag} onChange={(e) => setDraftFilterTag(e.target.value)} className="h-9 font-mono" />
                      <div className="text-[11px] text-muted-foreground">Важно: filterTag участвует в подборе событий (resolved-events).</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={draftIsActive} onChange={(e) => setDraftIsActive(e.target.checked)} />
                        isActive
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={draftIsIndexable} onChange={(e) => setDraftIsIndexable(e.target.checked)} />
                        isIndexable
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">status</div>
                      <Input value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)} className="h-9 font-mono" placeholder="DRAFT / ACTIVE / ..." />
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">canonicalUrl (полный URL для multi-origin)</div>
                      <Input value={draftCanonicalUrl} onChange={(e) => setDraftCanonicalUrl(e.target.value)} className="h-9 font-mono" placeholder="https://..." />
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">ogImageUrl</div>
                      <Input value={draftOgImageUrl} onChange={(e) => setDraftOgImageUrl(e.target.value)} className="h-9 font-mono" placeholder="https://..." />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">metaTitle</div>
                      <Input value={draftMetaTitle} onChange={(e) => setDraftMetaTitle(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">metaDescription</div>
                      <Textarea value={draftMetaDescription} onChange={(e) => setDraftMetaDescription(e.target.value)} className="min-h-[90px]" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">seoH1</div>
                      <Input value={draftSeoH1} onChange={(e) => setDraftSeoH1(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">seoTitle</div>
                      <Input value={draftSeoTitle} onChange={(e) => setDraftSeoTitle(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">seoDescription</div>
                      <Textarea value={draftSeoDescription} onChange={(e) => setDraftSeoDescription(e.target.value)} className="min-h-[90px]" />
                    </div>

                    <div className="rounded-md border border-border bg-secondary/10 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Baseline filters (additionalFilters)</div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-medium text-muted-foreground">category</div>
                          <Input value={draftAdditionalFilters.category} onChange={(e) => setDraftAdditionalFilters((p) => ({ ...p, category: e.target.value }))} className="h-9 font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-medium text-muted-foreground">source</div>
                          <Input value={draftAdditionalFilters.source} onChange={(e) => setDraftAdditionalFilters((p) => ({ ...p, source: e.target.value }))} className="h-9 font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-medium text-muted-foreground">minDuration</div>
                          <Input value={draftAdditionalFilters.minDuration} onChange={(e) => setDraftAdditionalFilters((p) => ({ ...p, minDuration: e.target.value }))} className="h-9 font-mono" placeholder="например 60" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-medium text-muted-foreground">maxDuration</div>
                          <Input value={draftAdditionalFilters.maxDuration} onChange={(e) => setDraftAdditionalFilters((p) => ({ ...p, maxDuration: e.target.value }))} className="h-9 font-mono" placeholder="например 180" />
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <div className="text-[11px] font-medium text-muted-foreground">features[] (csv)</div>
                        <Input
                          value={draftAdditionalFilters.featuresCsv}
                          onChange={(e) => setDraftAdditionalFilters((p) => ({ ...p, featuresCsv: e.target.value }))}
                          className="h-9 font-mono"
                          placeholder="guide, deck, dinner, ..."
                        />
                        <div className="text-[11px] text-muted-foreground">Сохраняем как массив строк; валидируется на бэке.</div>
                      </div>
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving}
                          onClick={() =>
                            setDraftAdditionalFilters({
                              category: '',
                              source: '',
                              minDuration: '',
                              maxDuration: '',
                              featuresCsv: '',
                            })
                          }
                        >
                          Очистить filters
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          ) : null}
        </>
      ) : null}

      {tab === 'coverage' ? <LandingCoverageTab loading={loading} error={error} hasLanding={Boolean(l)} childLandings={child} /> : null}

      {tab === 'seo' ? <LandingSeoTab metaTitle={l?.metaTitle ?? null} metaDescription={l?.metaDescription ?? null} canonicalUrl={l?.canonicalUrl ?? null} /> : null}

      {tab === 'blocks' && l ? <LandingContentBlocksTab landingId={l.id} blocks={blockRows} onReload={async () => setData(await getLanding(l.id))} /> : null}

      {tab === 'matching' && id ? <LandingMatchingTab landingId={id} /> : null}

      {tab === 'diagnostics' && id ? <LandingDiagnosticsTab landingId={id} /> : null}
    </>
  );
}

