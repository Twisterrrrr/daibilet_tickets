import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { HubReadinessPanel } from '@/components/shared/hub-readiness/HubReadinessPanel';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  fetchAdminVenueDetail,
  fetchAdminGeoDistricts,
  fetchAdminGeoMetroStations,
  fetchSimilarDrafts,
  fetchVenueAdminSummary,
  fetchVenueSubcategoriesAdmin,
  patchAdminVenue,
  type AdminVenueCandidateRow,
  type AdminVenueDetail,
} from '@/modules/venues/api/candidates';
import { ApproveVenueDraftDialog } from '@/modules/venues/components/candidates/ApproveVenueDraftDialog';
import { MergeVenueDialog } from '@/modules/venues/components/candidates/MergeVenueDialog';
import { RejectVenueDialog } from '@/modules/venues/components/candidates/RejectVenueDialog';
import { VenueTemplatePreviewPanel } from '@/modules/venues/components/detail/VenueTemplatePreviewPanel';
import {
  buildCandidatesPrefilterFromVenue,
  buildVenueCandidatesSearchParams,
} from '@/modules/venues/utils/venueCandidatesUrlState';
import { getVenueTemplatePreview } from '@/modules/venues/utils/venue-template-admin-preview';
import { venueLifecycleLabelRu } from '@/modules/venues/utils/venue-lifecycle-labels';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

type LocationState = { fromCandidatesPath?: string };

type TabId =
  | 'overview'
  | 'location'
  | 'content'
  | 'media'
  | 'events'
  | 'moderation'
  | 'seo'
  | 'extra';

const TAB_LABEL: Record<TabId, string> = {
  overview: 'Основное',
  location: 'Локация',
  content: 'Контент',
  media: 'Медиа',
  events: 'Связанные события',
  moderation: 'Модерация / дубликаты',
  seo: 'SEO',
  extra: 'Связи',
};

function detailToCandidateRow(d: AdminVenueDetail): AdminVenueCandidateRow {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    venueType: d.venueType ?? 'MUSEUM',
    city: d.city,
    rating: 0,
    isActive: d.isActive ?? true,
    isFeatured: false,
    lifecycleStatus: d.lifecycleStatus,
    isPublished: d.isPublished,
    sourceType: d.sourceType,
    importSource: d.importSource,
    externalVenueId: d.externalVenueId,
    needsReview: d.needsReview,
    eventsCount: 0,
    offersCount: 0,
    updatedAt: d.updatedAt ?? new Date().toISOString(),
    rawName: d.rawName,
    rawAddress: d.rawAddress,
    displayAddress: d.displayAddress ?? d.address,
    normalizedName: d.normalizedName,
    normalizedAddress: d.normalizedAddress,
    confidenceScore: d.confidenceScore,
    mergeTargetId: d.mergeTargetId ?? null,
    version: d.version,
  };
}

export function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const fromCandidates = (location.state as LocationState | null)?.fromCandidatesPath;

  const [tab, setTab] = React.useState<TabId>('overview');
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [geoSaving, setGeoSaving] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const [geoSavedAt, setGeoSavedAt] = React.useState<string | null>(null);
  const [geoForm, setGeoForm] = React.useState(() => ({
    districtId: '',
    metroStationId: '',
    isHiddenGem: false,
  }));

  const detailQ = useQuery({
    queryKey: ['admin-venue-detail-page', id],
    queryFn: () => fetchAdminVenueDetail(id!),
    enabled: Boolean(id),
  });

  const summaryQ = useQuery({
    queryKey: ['admin-venue-summary', id],
    queryFn: () => fetchVenueAdminSummary(id!),
    enabled: Boolean(id),
  });

  const subcatQ = useQuery({
    queryKey: ['admin-venue-subcategories', id],
    queryFn: () => fetchVenueSubcategoriesAdmin(id!),
    enabled: Boolean(id),
  });

  const similarQ = useQuery({
    queryKey: ['admin-venue-similar', id],
    queryFn: () => fetchSimilarDrafts(id!, { includeActive: true, limit: 15 }),
    enabled: Boolean(id) && detailQ.data?.lifecycleStatus === 'DRAFT',
  });

  const candidatesPrefilterHref = React.useMemo(() => {
    if (!id || !detailQ.data) return '/admin-v3/venues/candidates';
    const st = buildCandidatesPrefilterFromVenue({
      venueId: id,
      title: detailQ.data.title,
      citySlug: detailQ.data.city.slug,
    });
    return `/admin-v3/venues/candidates?${buildVenueCandidatesSearchParams(st).toString()}`;
  }, [id, detailQ.data]);

  const templatePreview = React.useMemo(() => {
    if (!detailQ.data) return null;
    return getVenueTemplatePreview(detailQ.data);
  }, [detailQ.data]);

  const siteBase = (import.meta as unknown as { env?: { VITE_PUBLIC_SITE_URL?: string } }).env
    ?.VITE_PUBLIC_SITE_URL?.replace(/\/$/, '');

  const v = detailQ.data;
  const cityId = v?.city?.id ?? null;

  React.useEffect(() => {
    if (!v) return;
    setGeoForm({
      districtId: v.districtId ?? '',
      metroStationId: v.metroStationId ?? '',
      isHiddenGem: v.isHiddenGem ?? false,
    });
    setGeoError(null);
    setGeoSavedAt(null);
  }, [v?.id, v?.version]);

  const districtsQ = useQuery({
    queryKey: ['admin-geo-districts', cityId],
    queryFn: async () => {
      if (!cityId) return [];
      const res = await fetchAdminGeoDistricts({ cityId });
      return res.items ?? [];
    },
    enabled: Boolean(cityId),
    staleTime: 60_000,
  });

  const metroQ = useQuery({
    queryKey: ['admin-geo-metro', cityId],
    queryFn: async () => {
      if (!cityId) return [];
      const res = await fetchAdminGeoMetroStations({ cityId });
      return res.items ?? [];
    },
    enabled: Boolean(cityId),
    staleTime: 60_000,
  });

  if (!id) {
    return <ErrorState title="Некорректный ID" description="Не указан идентификатор площадки." />;
  }

  if (detailQ.isLoading) return <LoadingState label="Загрузка площадки…" />;
  if (detailQ.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить площадку"
        description={detailQ.error instanceof Error ? detailQ.error.message : 'Ошибка'}
        onRetry={() => detailQ.refetch()}
      />
    );
  }

  if (!v) return <LoadingState label="Загрузка…" />;

  const row = detailToCandidateRow(v);
  const readiness = summaryQ.data?.venueReadiness ?? v.readiness;
  const eventsHref = `/admin-v3/events?venueId=${encodeURIComponent(id)}`;
  const publicPath = v.slug ? `/venues/${v.slug}` : null;
  const publicAbs = siteBase && publicPath ? `${siteBase}${publicPath}` : null;

  const showDraftActions = v.lifecycleStatus === 'DRAFT' && v.sourceType === 'IMPORTED';

  function invalidateVenue() {
    void qc.invalidateQueries({ queryKey: ['admin-venue-detail-page', id] });
    void qc.invalidateQueries({ queryKey: ['admin-venue-summary', id] });
    void qc.invalidateQueries({ queryKey: ['admin-venues-list'] });
    void qc.invalidateQueries({ queryKey: ['admin-venue-similar', id] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={v.title}
        subtitle={`${v.city.name} · ${venueLifecycleLabelRu(v.lifecycleStatus)} · v${v.version}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {fromCandidates ? (
              <Button type="button" variant="secondary" onClick={() => navigate(fromCandidates)}>
                Назад к кандидатам
              </Button>
            ) : null}
            <Button type="button" variant="outline" asChild>
              <Link to={candidatesPrefilterHref}>Похожие кандидаты</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to={eventsHref}>События площадки</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/admin-v3/venues">К списку площадок</Link>
            </Button>
            {publicAbs ? (
              <Button type="button" variant="outline" asChild>
                <a href={publicAbs} target="_blank" rel="noreferrer">
                  Публичная страница
                </a>
              </Button>
            ) : null}
            {showDraftActions ? (
              <>
                <Button type="button" onClick={() => setApproveOpen(true)}>
                  Утвердить
                </Button>
                <Button type="button" variant="secondary" onClick={() => setMergeOpen(true)}>
                  Объединить
                </Button>
                <Button type="button" variant="destructive" onClick={() => setRejectOpen(true)}>
                  Отклонить
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {readiness ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Готовность</span>
            <Badge variant="default">{readiness.status}</Badge>
            <span className="text-muted-foreground">{readiness.score}/100</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Блокеры</div>
              <ul className="mt-1 list-inside list-disc text-xs">
                {readiness.blockers.length ? readiness.blockers.map((x) => <li key={x}>{x}</li>) : <li>—</li>}
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Предупреждения</div>
              <ul className="mt-1 list-inside list-disc text-xs">
                {readiness.warnings.length ? readiness.warnings.map((x) => <li key={x}>{x}</li>) : <li>—</li>}
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Модерация</div>
              <ul className="mt-1 list-inside list-disc text-xs">
                {readiness.moderationSignals.length ? (
                  readiness.moderationSignals.map((x) => <li key={x}>{x}</li>)
                ) : (
                  <li>—</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      ) : summaryQ.isLoading ? (
        <div className="text-sm text-muted-foreground">Загрузка сводки готовности…</div>
      ) : null}

      <HubReadinessPanel title="Страница площадки (hub-слой)" snapshot={v.hubReadiness} />

      <div className="flex flex-wrap gap-1 border-b pb-2">
        {(Object.keys(TAB_LABEL) as TabId[]).map((k) => (
          <Button
            key={k}
            type="button"
            size="sm"
            variant={tab === k ? 'secondary' : 'ghost'}
            onClick={() => setTab(k)}
          >
            {TAB_LABEL[k]}
          </Button>
        ))}
      </div>

      {tab === 'overview' ? (
        <section className="rounded-lg border bg-card p-5 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Название" value={v.title} />
            <Field label="Slug" value={v.slug ?? '—'} />
            <Field label="Город" value={`${v.city.name} (${v.city.slug})`} />
            <Field label="Тип площадки" value={v.venueType ?? '—'} />
            <Field label="Жизненный цикл" value={venueLifecycleLabelRu(v.lifecycleStatus)} />
            <Field label="Источник" value={`${v.sourceType}${v.importSource ? ` · ${v.importSource}` : ''}`} />
            <Field label="Активна" value={v.isActive === false ? 'Нет' : 'Да'} />
            <Field label="Публикация (каталог)" value={v.isPublished ? 'Да' : 'Нет'} />
            <Field
              label="Режим витринной страницы"
              value={
                v.venuePageMode === 'HUB'
                  ? 'HUB (полноценный хаб)'
                  : v.venuePageMode === 'BASIC'
                    ? 'BASIC'
                    : 'NONE'
              }
            />
            <Field
              label="SEO whitelist страницы"
              value={v.isVenuePageWhitelisted ? 'Да' : 'Нет'}
            />
            <Field label="Внешний ID" value={v.externalVenueId ?? '—'} />
          </div>
        </section>
      ) : null}

      {tab === 'location' ? (
        <section className="rounded-lg border bg-card p-5 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Адрес (канон.)" value={v.address ?? '—'} />
            <Field label="Для UI (displayAddress)" value={v.displayAddress ?? '—'} />
            <Field label="Нормализованный" value={v.normalizedAddress ?? '—'} />
            <Field label="Сырой (импорт)" value={v.rawAddress ?? '—'} />
            <Field label="Широта / долгота" value={v.lat != null && v.lng != null ? `${v.lat}, ${v.lng}` : '—'} />
            <Field label="Метро" value={v.metro ?? '—'} />
            <Field label="Район" value={v.district ?? '—'} />
          </div>

          <div className="mt-6 rounded-md border bg-background p-4">
            <div className="font-medium">Нормализованная география</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Район (District)</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={geoForm.districtId}
                  onChange={(e) => setGeoForm((s) => ({ ...s, districtId: e.target.value }))}
                >
                  <option value="">—</option>
                  {(districtsQ.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Метро (MetroStation)</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={geoForm.metroStationId}
                  onChange={(e) => setGeoForm((s) => ({ ...s, metroStationId: e.target.value }))}
                >
                  <option value="">—</option>
                  {(metroQ.data ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.lineName ? ` · ${m.lineName}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={geoForm.isHiddenGem}
                  onChange={(e) => setGeoForm((s) => ({ ...s, isHiddenGem: e.target.checked }))}
                />
                <span>Hidden gem</span>
              </label>
            </div>

            {geoError ? <div className="mt-3 text-sm text-destructive">{geoError}</div> : null}
            {geoSavedAt ? <div className="mt-3 text-xs text-muted-foreground">Сохранено: {geoSavedAt}</div> : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={geoSaving}
                onClick={async () => {
                  setGeoSaving(true);
                  setGeoError(null);
                  setGeoSavedAt(null);
                  try {
                    await patchAdminVenue(id, {
                      version: v.version,
                      districtId: geoForm.districtId || null,
                      metroStationId: geoForm.metroStationId || null,
                      isHiddenGem: geoForm.isHiddenGem,
                    });
                    invalidateVenue();
                    setGeoSavedAt(new Date().toLocaleString('ru-RU'));
                  } catch (e) {
                    setGeoError(e instanceof Error ? e.message : 'Ошибка сохранения');
                  } finally {
                    setGeoSaving(false);
                  }
                }}
              >
                {geoSaving ? 'Сохранение…' : 'Сохранить'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={geoSaving}
                onClick={() =>
                  setGeoForm({
                    districtId: v.districtId ?? '',
                    metroStationId: v.metroStationId ?? '',
                    isHiddenGem: v.isHiddenGem ?? false,
                  })
                }
              >
                Сбросить
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'content' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Краткое описание (legacy / поля сущности)</div>
            <div className="mt-1 whitespace-pre-wrap">{v.shortDescription ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Полное описание (legacy)</div>
            <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{v.description ?? '—'}</div>
          </div>

          {templatePreview ? (
            <VenueTemplatePreviewPanel sections={templatePreview} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Нет собранных блоков шаблона PDP (проверьте venueTemplateData и тип площадки с поддержкой шаблона).
            </p>
          )}

          {v.venueTemplateData != null && typeof v.venueTemplateData === 'object' ? (
            <details>
              <summary className="cursor-pointer text-xs font-medium">Сырой JSON (venueTemplateData)</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/50 p-2 text-xs">
                {JSON.stringify(v.venueTemplateData, null, 2)}
              </pre>
            </details>
          ) : null}
        </section>
      ) : null}

      {tab === 'media' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Обложка</div>
            {v.imageUrl ? (
              <a className="mt-1 block break-all text-primary hover:underline" href={v.imageUrl} target="_blank" rel="noreferrer">
                {v.imageUrl}
              </a>
            ) : (
              <div className="mt-1">—</div>
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Галерея ({v.galleryUrls?.length ?? 0})</div>
            <ul className="mt-1 list-inside list-disc text-xs">
              {(v.galleryUrls ?? []).slice(0, 20).map((u) => (
                <li key={u}>
                  <a className="text-primary hover:underline" href={u} target="_blank" rel="noreferrer">
                    {u}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {tab === 'events' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
          {summaryQ.isLoading ? (
            <div className="text-muted-foreground">Загрузка событий…</div>
          ) : summaryQ.data ? (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <Field label="Активных событий" value={String(summaryQ.data.storefront.activeEventsCount)} />
                <Field
                  label="С будущими сеансами"
                  value={String(summaryQ.data.storefront.eventsWithFutureSlotsCount)}
                />
                <Field
                  label="Доля READY (выборка)"
                  value={
                    summaryQ.data.storefront.readyRatio != null
                      ? `${Math.round(summaryQ.data.storefront.readyRatio * 100)}% (${summaryQ.data.storefront.readyDataQuality})`
                      : '—'
                  }
                />
              </div>
              <Button type="button" variant="outline" size="sm" asChild>
                <Link to={eventsHref}>Все события площадки в админке</Link>
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr>
                      <th className="py-2">Событие</th>
                      <th className="py-2">Готовность</th>
                      <th className="py-2">Витрина</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryQ.data.relatedEvents.slice(0, 30).map((e) => (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="py-2">
                          <Link className="font-medium text-primary hover:underline" to={`/admin-v3/events/${e.id}`}>
                            {e.title}
                          </Link>
                          <div className="text-muted-foreground">{e.slug}</div>
                        </td>
                        <td className="py-2">{e.readinessStatus}</td>
                        <td className="py-2">{e.storefrontVisibility}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {summaryQ.data.truncated ? (
                <p className="text-xs text-muted-foreground">Список обрезан на сервере (лимит).</p>
              ) : null}
            </>
          ) : (
            <ErrorState title="Нет сводки" description="Не удалось загрузить /summary" />
          )}
        </section>
      ) : null}

      {tab === 'moderation' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="confidenceScore" value={v.confidenceScore != null ? String(v.confidenceScore) : '—'} />
            <Field label="needsReview" value={v.needsReview ? 'Да' : 'Нет'} />
            <Field
              label="mergeTargetId"
              value={
                v.mergeTargetId ? (
                  <Link className="text-primary hover:underline" to={`/admin-v3/venues/${v.mergeTargetId}`}>
                    {v.mergeTargetId}
                  </Link>
                ) : (
                  '—'
                )
              }
            />
          </div>
          {v.lifecycleStatus === 'DRAFT' ? (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Похожие площадки</div>
              {similarQ.isLoading ? (
                <div className="mt-2 text-muted-foreground">Загрузка…</div>
              ) : similarQ.data?.items?.length ? (
                <ul className="mt-2 space-y-1 text-xs">
                  {similarQ.data.items.map((s) => (
                    <li key={s.id}>
                      <Link className="text-primary hover:underline" to={`/admin-v3/venues/${s.id}`}>
                        {s.title}
                      </Link>{' '}
                      <span className="text-muted-foreground">
                        · sim {s.similarityScore.toFixed(2)} · {s.lifecycleStatus}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-muted-foreground">Нет похожих в выборке</div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Поиск дублей для черновиков — на вкладке доступен при статусе DRAFT.</p>
          )}
        </section>
      ) : null}

      {tab === 'seo' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-3">
          <Field label="metaTitle" value={v.metaTitle ?? '—'} />
          <Field label="metaDescription" value={v.metaDescription ?? '—'} />
          <Field label="Slug (публичный ключ)" value={v.slug ?? '—'} />
          <Field
            label="Публичный URL (preview)"
            value={publicAbs ?? publicPath ?? '—'}
          />
          <p className="text-xs text-muted-foreground">
            Индексация страницы `/venues/:slug` зависит от ACTIVE, модерации контента и флага SEO whitelist.
          </p>
        </section>
      ) : null}

      {tab === 'extra' ? (
        <section className="rounded-lg border bg-card p-5 text-sm space-y-3">
          {subcatQ.isLoading ? (
            <div className="text-muted-foreground">Загрузка подкатегорий…</div>
          ) : subcatQ.data ? (
            <>
              <div>
                <div className="text-xs text-muted-foreground">PRIMARY</div>
                <div className="mt-1">
                  {subcatQ.data.primarySubcategory
                    ? `${subcatQ.data.primarySubcategory.nameRu} (${subcatQ.data.primarySubcategory.slug})`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">SECONDARY</div>
                <ul className="mt-1 list-inside list-disc">
                  {subcatQ.data.secondarySubcategories.map((s) => (
                    <li key={s.id}>
                      {s.nameRu} ({s.slug})
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <ErrorState title="Подкатегории" description="Не удалось загрузить" />
          )}
        </section>
      ) : null}

      <ApproveVenueDraftDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        row={row}
        onSuccess={() => {
          setApproveOpen(false);
          invalidateVenue();
        }}
      />
      <MergeVenueDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        row={row}
        onSuccess={() => {
          setMergeOpen(false);
          invalidateVenue();
        }}
      />
      <RejectVenueDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        row={row}
        onSuccess={() => {
          setRejectOpen(false);
          invalidateVenue();
        }}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
