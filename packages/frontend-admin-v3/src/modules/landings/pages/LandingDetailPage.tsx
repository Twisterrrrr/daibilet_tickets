import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/api/client';
import { slugifyFromTitle } from '@/modules/articles/utils/slugify';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  createAdminLanding,
  fetchAdminLandingDetail,
  fetchAdminLandingResolvedEvents,
  patchAdminLanding,
  type AdminLandingDetail,
  type AdminLandingResolvedEventsResponse,
} from '@/modules/landings/api/landings';

export function LandingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detailQ = useQuery({
    queryKey: ['admin-landing-detail', id],
    queryFn: () => fetchAdminLandingDetail(id!),
    enabled: Boolean(id) && id !== 'new',
  });

  const [draft, setDraft] = React.useState<AdminLandingDetail | null>(null);
  React.useEffect(() => {
    if (detailQ.data) setDraft(detailQ.data);
  }, [detailQ.data]);

  const citiesQ = useQuery({
    queryKey: ['admin-cities-options-landing-detail'],
    queryFn: async () => {
      const res = await adminApi.get<{ items: Array<{ id: string; name: string; slug: string }> }>('/admin/cities?limit=500');
      return res.items ?? [];
    },
  });

  const parentsQ = useQuery({
    queryKey: ['admin-landings-parent-options'],
    queryFn: async () => {
      const res = await adminApi.get<{ items: Array<{ id: string; title: string; slug: string; landingType: string }> }>(
        '/admin/landings?landingType=MULTI_CITY&limit=200',
      );
      const res2 = await adminApi.get<{ items: Array<{ id: string; title: string; slug: string; landingType: string }> }>(
        '/admin/landings?landingType=HUB&limit=200',
      );
      return [...(res.items ?? []), ...(res2.items ?? [])];
    },
  });

  const resolvedQ = useQuery<AdminLandingResolvedEventsResponse>({
    queryKey: ['admin-landing-resolved-events', id],
    queryFn: () => fetchAdminLandingResolvedEvents(draft!.id),
    enabled: Boolean(draft),
  });

  const [queryConfigText, setQueryConfigText] = React.useState<string>('');
  const [queryConfigError, setQueryConfigError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!draft) return;
    const next = draft.queryConfig ?? null;
    setQueryConfigText(next ? JSON.stringify(next, null, 2) : '');
    setQueryConfigError(null);
  }, [draft?.id]);

  const parseQueryConfigFromText = (text: string): { value: Record<string, unknown> | null; error: string | null } => {
    if (!text.trim()) return { value: null, error: null };
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed === null) return { value: null, error: null };
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { value: null, error: 'queryConfig должен быть JSON-объектом' };
      }
      return { value: parsed as Record<string, unknown>, error: null };
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Некорректный JSON' };
    }
  };

  const [blocksJson, setBlocksJson] = React.useState<{
    howToChoose: string;
    infoBlocks: string;
    faq: string;
    reviews: string;
    stats: string;
    relatedLinks: string;
    seasonalPayload: string;
    additionalFilters: string;
  }>({
    howToChoose: '',
    infoBlocks: '',
    faq: '',
    reviews: '',
    stats: '',
    relatedLinks: '',
    seasonalPayload: '',
    additionalFilters: '',
  });
  const [blocksErr, setBlocksErr] = React.useState<Record<string, string | null>>({});

  React.useEffect(() => {
    if (!draft) return;
    setBlocksJson({
      howToChoose: draft.howToChoose ? JSON.stringify(draft.howToChoose, null, 2) : '',
      infoBlocks: draft.infoBlocks ? JSON.stringify(draft.infoBlocks, null, 2) : '',
      faq: draft.faq ? JSON.stringify(draft.faq, null, 2) : '',
      reviews: draft.reviews ? JSON.stringify(draft.reviews, null, 2) : '',
      stats: draft.stats ? JSON.stringify(draft.stats, null, 2) : '',
      relatedLinks: draft.relatedLinks ? JSON.stringify(draft.relatedLinks, null, 2) : '',
      seasonalPayload: draft.seasonalPayload ? JSON.stringify(draft.seasonalPayload, null, 2) : '',
      additionalFilters: draft.additionalFilters ? JSON.stringify(draft.additionalFilters, null, 2) : '',
    });
    setBlocksErr({});
  }, [draft?.id]);

  const parseJsonText = (text: string): { value: unknown; error: string | null } => {
    if (!text.trim()) return { value: null, error: null };
    try {
      return { value: JSON.parse(text), error: null };
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : 'Некорректный JSON' };
    }
  };

  const canActivateFromPreview = () => {
    if (!draft) return { ok: true as const };
    const wantsActive = draft.status === 'ACTIVE' || Boolean(draft.isActive);
    if (!wantsActive) return { ok: true as const };

    if (draft.landingType === 'CITY') {
      const total = resolvedQ.data?.total ?? null;
      if (total !== null && total <= 0) {
        return { ok: false as const, reason: 'CITY нельзя активировать без выдачи (resolved events = 0).' };
      }
    }
    if (draft.landingType !== 'CITY') {
      const liveChildren = (draft.childLandings ?? []).filter(
        (c) => c.landingType === 'CITY' && c.status === 'ACTIVE' && c.isActive && c.isIndexable,
      ).length;
      if (liveChildren <= 0) {
        return { ok: false as const, reason: 'HUB/MULTI_CITY нельзя активировать без живых городских вариантов.' };
      }
    }
    return { ok: true as const };
  };

  const saveM = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('No draft');
      const parsed = parseQueryConfigFromText(queryConfigText);
      if (parsed.error) throw new Error(`queryConfig: ${parsed.error}`);
      // parse content blocks json
      const parsedBlocks = {
        howToChoose: parseJsonText(blocksJson.howToChoose),
        infoBlocks: parseJsonText(blocksJson.infoBlocks),
        faq: parseJsonText(blocksJson.faq),
        reviews: parseJsonText(blocksJson.reviews),
        stats: parseJsonText(blocksJson.stats),
        relatedLinks: parseJsonText(blocksJson.relatedLinks),
        seasonalPayload: parseJsonText(blocksJson.seasonalPayload),
        additionalFilters: parseJsonText(blocksJson.additionalFilters),
      };
      for (const [k, v] of Object.entries(parsedBlocks)) {
        if (v.error) throw new Error(`${k}: ${v.error}`);
      }
      const gate = canActivateFromPreview();
      if (!gate.ok) throw new Error(gate.reason);
      return patchAdminLanding(draft.id, {
        version: draft.version,
        title: draft.title,
        slug: draft.slug,
        landingType: draft.landingType,
        cityId: draft.cityId,
        parentLandingId: draft.parentLandingId,
        subtitle: draft.subtitle ?? null,
        heroText: draft.heroText ?? null,
        legalText: draft.legalText ?? null,
        templateType: draft.templateType,
        howToChoose: (parsedBlocks.howToChoose.value as any) ?? null,
        infoBlocks: (parsedBlocks.infoBlocks.value as any) ?? null,
        faq: (parsedBlocks.faq.value as any) ?? null,
        reviews: (parsedBlocks.reviews.value as any) ?? null,
        stats: (parsedBlocks.stats.value as any) ?? null,
        relatedLinks: (parsedBlocks.relatedLinks.value as any) ?? null,
        seasonalPayload: (parsedBlocks.seasonalPayload.value as any) ?? null,
        filterTag: draft.filterTag,
        additionalFilters: (parsedBlocks.additionalFilters.value as any) ?? null,
        collectionId: draft.collectionId ?? null,
        selectionMode: draft.selectionMode,
        eventSourceType: draft.eventSourceType,
        queryConfig: parsed.value,
        relatedArticleIds: Array.isArray(draft.relatedArticleIds) ? draft.relatedArticleIds : [],
        relatedCollectionIds: Array.isArray(draft.relatedCollectionIds) ? draft.relatedCollectionIds : [],
        metaTitle: draft.metaTitle ?? null,
        metaDescription: draft.metaDescription ?? null,
        canonicalUrl: draft.canonicalUrl ?? null,
        isIndexable: Boolean(draft.isIndexable),
        isActive: Boolean(draft.isActive),
        status: draft.status,
      } as any);
    },
    onSuccess: async (next) => {
      setDraft(next);
      // Синхронизируем textarea после сохранения
      setQueryConfigText(next.queryConfig ? JSON.stringify(next.queryConfig, null, 2) : '');
      setQueryConfigError(null);
      setBlocksJson({
        howToChoose: next.howToChoose ? JSON.stringify(next.howToChoose, null, 2) : '',
        infoBlocks: next.infoBlocks ? JSON.stringify(next.infoBlocks, null, 2) : '',
        faq: next.faq ? JSON.stringify(next.faq, null, 2) : '',
        reviews: next.reviews ? JSON.stringify(next.reviews, null, 2) : '',
        stats: next.stats ? JSON.stringify(next.stats, null, 2) : '',
        relatedLinks: next.relatedLinks ? JSON.stringify(next.relatedLinks, null, 2) : '',
        seasonalPayload: next.seasonalPayload ? JSON.stringify(next.seasonalPayload, null, 2) : '',
        additionalFilters: next.additionalFilters ? JSON.stringify(next.additionalFilters, null, 2) : '',
      });
      setBlocksErr({});
      await qc.invalidateQueries({ queryKey: ['admin-landings'] });
      await qc.invalidateQueries({ queryKey: ['admin-landing-detail', id] });
      await qc.invalidateQueries({ queryKey: ['admin-landing-resolved-events', id] });
    },
  });

  const createM = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('No draft');
      return createAdminLanding(draft);
    },
    onSuccess: (created) => {
      navigate(`/admin-v3/landings/${created.id}`);
    },
  });

  const errText = (e: unknown) => getAdminErrorDisplay(e).title;

  if (!id) return <ErrorState title="Некорректный ID" description="Не указан идентификатор лендинга." />;

  if (id === 'new') {
    // минимальный create-flow: создаём локальный draft и даём кнопку POST
    const init: AdminLandingDetail = {
      id: 'new',
      title: '',
      slug: '',
      landingType: 'CITY',
      status: 'DRAFT',
      eventSourceType: 'PRIMARY_COLLECTION',
      isActive: false,
      isIndexable: true,
      updatedAt: new Date().toISOString(),
      version: 0,
      city: null,
      parentLanding: null,

      cityId: null,
      parentLandingId: null,
      childLandings: [],

      subtitle: null,
      heroText: null,
      legalText: null,
      templateType: 'GENERIC_CARDS',
      howToChoose: null,
      infoBlocks: null,
      faq: null,
      reviews: null,
      stats: null,
      relatedLinks: null,
      seasonalPayload: null,

      filterTag: '',
      additionalFilters: null,
      collectionId: null,
      selectionMode: 'CUSTOM',
      queryConfig: null,

      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,

      relatedArticleIds: [],
      relatedCollectionIds: [],
    };
    const cur = draft ?? init;
    if (!draft) setDraft(cur);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Новый лендинг"
          subtitle="Создание"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to="/admin-v3/landings">К списку</Link>
              </Button>
              <Button type="button" disabled={createM.isPending} onClick={() => createM.mutate()}>
                Создать
              </Button>
            </div>
          }
        />
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Title
            <input
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={cur.title}
              onChange={(e) => {
                const title = e.target.value;
                setDraft({ ...cur, title, slug: cur.slug || slugifyFromTitle(title) });
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Slug
            <input
              className="h-9 rounded-md border bg-background px-2 font-mono text-sm text-foreground"
              value={cur.slug}
              onChange={(e) => setDraft({ ...cur, slug: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Тип
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={cur.landingType}
              onChange={(e) => {
                const landingType = e.target.value as any;
                setDraft({
                  ...cur,
                  landingType,
                  cityId: landingType === 'CITY' ? cur.cityId : null,
                  parentLandingId: landingType === 'CITY' ? cur.parentLandingId : null,
                });
              }}
            >
              <option value="CITY">CITY</option>
              <option value="HUB">HUB</option>
              <option value="MULTI_CITY">MULTI_CITY</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Город (только CITY)
            <select
              className="h-9 min-w-[240px] rounded-md border bg-background px-2 text-sm text-foreground"
              value={cur.cityId ?? ''}
              onChange={(e) => setDraft({ ...cur, cityId: e.target.value || null })}
              disabled={cur.landingType !== 'CITY'}
            >
              <option value="">—</option>
              {(citiesQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Parent (только CITY)
            <select
              className="h-9 min-w-[240px] rounded-md border bg-background px-2 text-sm text-foreground"
              value={cur.parentLandingId ?? ''}
              onChange={(e) => setDraft({ ...cur, parentLandingId: e.target.value || null })}
              disabled={cur.landingType !== 'CITY'}
            >
              <option value="">—</option>
              {(parentsQ.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.landingType} · {p.slug}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            filterTag
            <input
              className="h-9 rounded-md border bg-background px-2 font-mono text-sm text-foreground"
              value={cur.filterTag}
              onChange={(e) => setDraft({ ...cur, filterTag: e.target.value })}
            />
          </label>
        </div>
      </div>
    );
  }

  if (detailQ.isLoading) return <LoadingState label="Загрузка лендинга…" />;
  if (detailQ.isError) {
    const meta = getAdminErrorDisplay(detailQ.error);
    return (
      <ErrorState
        title="Не удалось загрузить лендинг"
        description={meta.code ? `${meta.title} (${meta.code})` : meta.title}
        onRetry={() => detailQ.refetch()}
      />
    );
  }

  if (!draft) return <LoadingState label="Загрузка…" />;

  const statusVariant = (s: string): 'default' | 'outline' | 'warning' =>
    s === 'ACTIVE' ? 'default' : s === 'ARCHIVED' ? 'outline' : 'warning';
  const publicHref =
    draft.landingType === 'CITY' && draft.city?.slug
      ? `/cities/${draft.city.slug}/${encodeURIComponent(draft.slug)}`
      : `/landings/${encodeURIComponent(draft.slug)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={draft.title || 'Лендинг'}
        subtitle={`${draft.landingType} · ${draft.status} · v${draft.version}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin-v3/landings">К списку</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <a href={publicHref} target="_blank" rel="noreferrer">
                На сайте
              </a>
            </Button>
            <Button type="button" variant="secondary" disabled={saveM.isPending} onClick={() => saveM.mutate()}>
              Сохранить
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Статус</div>
            <Badge variant={statusVariant(draft.status)}>{draft.status}</Badge>
          </div>

          {!canActivateFromPreview().ok ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {canActivateFromPreview().reason}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              status
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as any })}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm pt-6">
              <input
                type="checkbox"
                checked={Boolean(draft.isActive)}
                onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
              />
              Active
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Title
            <input
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={draft.title ?? ''}
              onChange={(e) => {
                const title = e.target.value;
                setDraft((d) => (d ? { ...d, title, slug: d.slug || slugifyFromTitle(title) } : d));
              }}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Slug
            <input
              className="h-9 rounded-md border bg-background px-2 font-mono text-sm text-foreground"
              value={draft.slug ?? ''}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Тип
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={draft.landingType}
              onChange={(e) => {
                const landingType = e.target.value as any;
                setDraft({
                  ...draft,
                  landingType,
                  cityId: landingType === 'CITY' ? draft.cityId : null,
                  parentLandingId: landingType === 'CITY' ? draft.parentLandingId : null,
                });
              }}
            >
              <option value="CITY">CITY</option>
              <option value="HUB">HUB</option>
              <option value="MULTI_CITY">MULTI_CITY</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Город (только CITY)
            <select
              className="h-9 min-w-[240px] rounded-md border bg-background px-2 text-sm text-foreground"
              value={draft.cityId ?? ''}
              onChange={(e) => setDraft({ ...draft, cityId: e.target.value || null })}
              disabled={draft.landingType !== 'CITY'}
            >
              <option value="">—</option>
              {(citiesQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Parent (только CITY)
            <select
              className="h-9 min-w-[240px] rounded-md border bg-background px-2 text-sm text-foreground"
              value={draft.parentLandingId ?? ''}
              onChange={(e) => setDraft({ ...draft, parentLandingId: e.target.value || null })}
              disabled={draft.landingType !== 'CITY'}
            >
              <option value="">—</option>
              {(parentsQ.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.landingType} · {p.slug}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            filterTag
            <input
              className="h-9 rounded-md border bg-background px-2 font-mono text-sm text-foreground"
              value={draft.filterTag ?? ''}
              onChange={(e) => setDraft({ ...draft, filterTag: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            templateType
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={draft.templateType}
              onChange={(e) => setDraft({ ...draft, templateType: e.target.value as any })}
            >
              <option value="GENERIC_CARDS">GENERIC_CARDS</option>
              <option value="COMPARISON_TABLE">COMPARISON_TABLE</option>
              <option value="HYBRID">HYBRID</option>
              <option value="SEASONAL_EVENT">SEASONAL_EVENT</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            canonicalUrl
            <input
              className="h-9 rounded-md border bg-background px-2 font-mono text-sm text-foreground"
              value={draft.canonicalUrl ?? ''}
              onChange={(e) => setDraft({ ...draft, canonicalUrl: e.target.value || null })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            metaTitle
            <input
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={draft.metaTitle ?? ''}
              onChange={(e) => setDraft({ ...draft, metaTitle: e.target.value || null })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            metaDescription
            <textarea
              className="min-h-[90px] rounded-md border bg-background px-2 py-2 text-sm text-foreground"
              value={draft.metaDescription ?? ''}
              onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value || null })}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(draft.isIndexable)}
              onChange={(e) => setDraft({ ...draft, isIndexable: e.target.checked })}
            />
            Indexable
          </label>

          <div className="pt-2 text-sm font-medium">Content blocks (пример: речные/автобусные)</div>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            howToChoose (JSON: массив объектов с полями title/text, либо legacy CTA payload)
            <textarea
              className="min-h-[110px] rounded-md border bg-background px-2 py-2 font-mono text-xs text-foreground"
              value={blocksJson.howToChoose}
              onChange={(e) => {
                const text = e.target.value;
                setBlocksJson((s) => ({ ...s, howToChoose: text }));
                const p = parseJsonText(text);
                setBlocksErr((m) => ({ ...m, howToChoose: p.error }));
              }}
              placeholder={`[\n  { \"title\": \"Как выбрать маршрут\", \"text\": \"Советы по выбору…\" }\n]`}
            />
          </label>
          {blocksErr.howToChoose ? <div className="text-xs text-rose-700">JSON error: {blocksErr.howToChoose}</div> : null}

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            infoBlocks (JSON: массив объектов с полями title/text)
            <textarea
              className="min-h-[110px] rounded-md border bg-background px-2 py-2 font-mono text-xs text-foreground"
              value={blocksJson.infoBlocks}
              onChange={(e) => {
                const text = e.target.value;
                setBlocksJson((s) => ({ ...s, infoBlocks: text }));
                const p = parseJsonText(text);
                setBlocksErr((m) => ({ ...m, infoBlocks: p.error }));
              }}
              placeholder={`[\n  { \"title\": \"Скидки\", \"text\": \"…\" },\n  { \"title\": \"Причалы\", \"text\": \"…\" }\n]`}
            />
          </label>
          {blocksErr.infoBlocks ? <div className="text-xs text-rose-700">JSON error: {blocksErr.infoBlocks}</div> : null}

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            faq (JSON: массив объектов с полями question/answer)
            <textarea
              className="min-h-[110px] rounded-md border bg-background px-2 py-2 font-mono text-xs text-foreground"
              value={blocksJson.faq}
              onChange={(e) => {
                const text = e.target.value;
                setBlocksJson((s) => ({ ...s, faq: text }));
                const p = parseJsonText(text);
                setBlocksErr((m) => ({ ...m, faq: p.error }));
              }}
              placeholder={`[\n  { \"question\": \"Сколько длится прогулка?\", \"answer\": \"…\" }\n]`}
            />
          </label>
          {blocksErr.faq ? <div className="text-xs text-rose-700">JSON error: {blocksErr.faq}</div> : null}

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            reviews (JSON: массив объектов с полями text/author/rating)
            <textarea
              className="min-h-[110px] rounded-md border bg-background px-2 py-2 font-mono text-xs text-foreground"
              value={blocksJson.reviews}
              onChange={(e) => {
                const text = e.target.value;
                setBlocksJson((s) => ({ ...s, reviews: text }));
                const p = parseJsonText(text);
                setBlocksErr((m) => ({ ...m, reviews: p.error }));
              }}
              placeholder={`[\n  { \"text\": \"Отлично!\", \"author\": \"Анна\", \"rating\": 5 }\n]`}
            />
          </label>
          {blocksErr.reviews ? <div className="text-xs text-rose-700">JSON error: {blocksErr.reviews}</div> : null}

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            stats (JSON: объект с полями soldTickets/avgRating)
            <textarea
              className="min-h-[80px] rounded-md border bg-background px-2 py-2 font-mono text-xs text-foreground"
              value={blocksJson.stats}
              onChange={(e) => {
                const text = e.target.value;
                setBlocksJson((s) => ({ ...s, stats: text }));
                const p = parseJsonText(text);
                setBlocksErr((m) => ({ ...m, stats: p.error }));
              }}
              placeholder={`{ \"soldTickets\": 12000, \"avgRating\": 4.8 }`}
            />
          </label>
          {blocksErr.stats ? <div className="text-xs text-rose-700">JSON error: {blocksErr.stats}</div> : null}

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            relatedLinks (JSON: массив объектов с полями title/href)
            <textarea
              className="min-h-[110px] rounded-md border bg-background px-2 py-2 font-mono text-xs text-foreground"
              value={blocksJson.relatedLinks}
              onChange={(e) => {
                const text = e.target.value;
                setBlocksJson((s) => ({ ...s, relatedLinks: text }));
                const p = parseJsonText(text);
                setBlocksErr((m) => ({ ...m, relatedLinks: p.error }));
              }}
              placeholder={`[\n  { \"title\": \"Салют 9 мая\", \"href\": \"/salute-9-may\" }\n]`}
            />
          </label>
          {blocksErr.relatedLinks ? <div className="text-xs text-rose-700">JSON error: {blocksErr.relatedLinks}</div> : null}

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            seasonalPayload (JSON: SEASONAL_EVENT)
            <textarea
              className="min-h-[110px] rounded-md border bg-background px-2 py-2 font-mono text-xs text-foreground"
              value={blocksJson.seasonalPayload}
              onChange={(e) => {
                const text = e.target.value;
                setBlocksJson((s) => ({ ...s, seasonalPayload: text }));
                const p = parseJsonText(text);
                setBlocksErr((m) => ({ ...m, seasonalPayload: p.error }));
              }}
              placeholder={`{\n  \"seasonWindow\": { \"startMonthDay\": \"03-01\", \"endMonthDay\": \"05-09\" }\n}`}
            />
          </label>
          {blocksErr.seasonalPayload ? <div className="text-xs text-rose-700">JSON error: {blocksErr.seasonalPayload}</div> : null}

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            additionalFilters (JSON: comparison payload / legacy filters)
            <textarea
              className="min-h-[110px] rounded-md border bg-background px-2 py-2 font-mono text-xs text-foreground"
              value={blocksJson.additionalFilters}
              onChange={(e) => {
                const text = e.target.value;
                setBlocksJson((s) => ({ ...s, additionalFilters: text }));
                const p = parseJsonText(text);
                setBlocksErr((m) => ({ ...m, additionalFilters: p.error }));
              }}
              placeholder={`{ \"columns\": [\"price\",\"rating\"], \"hideIncomparable\": true, \"maxRows\": 10 }`}
            />
          </label>
          {blocksErr.additionalFilters ? <div className="text-xs text-rose-700">JSON error: {blocksErr.additionalFilters}</div> : null}
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="text-sm font-medium">Catalog source</div>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            eventSourceType
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={draft.eventSourceType}
              onChange={(e) => setDraft({ ...draft, eventSourceType: e.target.value as any })}
            >
              <option value="PRIMARY_COLLECTION">PRIMARY_COLLECTION</option>
              <option value="AUTO_QUERY">AUTO_QUERY</option>
              <option value="MIXED">MIXED</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            collectionId (primary)
            <input
              className="h-9 rounded-md border bg-background px-2 font-mono text-sm text-foreground"
              value={draft.collectionId ?? ''}
              onChange={(e) => setDraft({ ...draft, collectionId: e.target.value || null })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            queryConfig (JSON)
            <textarea
              className="min-h-[140px] rounded-md border bg-background px-2 py-2 font-mono text-xs text-foreground"
              value={queryConfigText}
              onChange={(e) => {
                const text = e.target.value;
                setQueryConfigText(text);
                const parsed = parseQueryConfigFromText(text);
                setQueryConfigError(parsed.error);
                if (!parsed.error) {
                  setDraft((d) => (d ? { ...d, queryConfig: parsed.value } : d));
                }
              }}
              placeholder={`{\n  "datePreset": "WEEKEND",\n  "limit": 30\n}`}
            />
          </label>
          {queryConfigError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              JSON error: {queryConfigError}
            </div>
          ) : null}

          <div className="text-sm font-medium pt-2">Preview · resolved events</div>
          {resolvedQ.isLoading ? (
            <LoadingState label="Резолвим события…" />
          ) : resolvedQ.isError ? (
            <ErrorState title="Не удалось резолвить события" description={errText(resolvedQ.error)} onRetry={() => resolvedQ.refetch()} />
          ) : (
            <>
              <div className="text-sm text-muted-foreground">Всего: {resolvedQ.data?.total ?? 0}</div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Событие</th>
                      <th className="px-3 py-2 text-left font-medium">Город</th>
                      <th className="px-3 py-2 text-left font-medium">Цена от</th>
                      <th className="px-3 py-2 text-left font-medium">Ближайший сеанс</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(resolvedQ.data?.items ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                          Нет событий
                        </td>
                      </tr>
                    ) : (
                      (resolvedQ.data?.items ?? []).slice(0, 30).map((it) => (
                        <tr key={it.id} className="border-b last:border-0">
                          <td className="px-3 py-2 align-top">
                            <div className="font-medium">{it.title}</div>
                            <div className="mt-1 font-mono text-xs text-muted-foreground">{it.slug ?? it.id}</div>
                          </td>
                          <td className="px-3 py-2 align-top text-muted-foreground">{it.city?.name ?? '—'}</td>
                          <td className="px-3 py-2 align-top text-muted-foreground">{it.priceFrom ?? '—'}</td>
                          <td className="px-3 py-2 align-top text-muted-foreground">
                            {it.nextSessionAt ? new Date(it.nextSessionAt).toLocaleString('ru-RU') : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => resolvedQ.refetch()}>
                  Обновить preview
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {draft.landingType !== 'CITY' ? (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="text-sm font-medium">Family / variants</div>
          <div className="text-sm text-muted-foreground">
            City‑варианты (child лендинги): {Array.isArray(draft.childLandings) ? draft.childLandings.length : 0}
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Лендинг</th>
                  <th className="px-3 py-2 text-left font-medium">Город</th>
                  <th className="px-3 py-2 text-left font-medium">Статус</th>
                  <th className="px-3 py-2 text-right font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {(draft.childLandings ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                      Нет вариантов
                    </td>
                  </tr>
                ) : (
                  (draft.childLandings ?? []).map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">{c.title}</div>
                        <div className="mt-1 font-mono text-xs text-muted-foreground">{c.slug}</div>
                      </td>
                      <td className="px-3 py-2 align-top text-muted-foreground">{c.city?.name ?? '—'}</td>
                      <td className="px-3 py-2 align-top text-muted-foreground">{c.status}</td>
                      <td className="px-3 py-2 align-top text-right">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link to={`/admin-v3/landings/${c.id}`}>Открыть</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <CreateChildVariantPanel
            parent={draft}
            cities={citiesQ.data ?? []}
            onCreated={(createdId) => navigate(`/admin-v3/landings/${createdId}`)}
          />
        </div>
      ) : null}
    </div>
  );
}

function CreateChildVariantPanel({
  parent,
  cities,
  onCreated,
}: {
  parent: AdminLandingDetail;
  cities: Array<{ id: string; name: string; slug: string }>;
  onCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [cityId, setCityId] = React.useState<string>('');
  const [title, setTitle] = React.useState<string>('');

  React.useEffect(() => {
    setTitle(parent.title ? `${parent.title}` : '');
  }, [parent.id]);

  const createChildM = useMutation({
    mutationFn: async () => {
      if (!cityId) throw new Error('Выберите город');
      const city = cities.find((c) => c.id === cityId);
      const childSlug = parent.slug; // как дефолт: тот же topic slug
      const childTitle = city ? `${parent.title} · ${city.name}` : parent.title;
      const payload: Partial<AdminLandingDetail> = {
        landingType: 'CITY',
        parentLandingId: parent.id,
        cityId,
        slug: childSlug,
        title: title.trim() || childTitle || parent.title,
        subtitle: parent.subtitle ?? null,
        heroText: parent.heroText ?? null,
        legalText: parent.legalText ?? null,
        filterTag: parent.filterTag,
        additionalFilters: parent.additionalFilters ?? null,
        collectionId: parent.collectionId ?? null,
        selectionMode: parent.selectionMode,
        eventSourceType: parent.eventSourceType,
        queryConfig: parent.queryConfig ?? null,
        metaTitle: parent.metaTitle ?? null,
        metaDescription: parent.metaDescription ?? null,
        canonicalUrl: null,
        isIndexable: true,
        isActive: false,
        status: 'DRAFT',
        relatedArticleIds: parent.relatedArticleIds ?? [],
        relatedCollectionIds: parent.relatedCollectionIds ?? [],
      };
      return createAdminLanding(payload);
    },
    onSuccess: async (created) => {
      await qc.invalidateQueries({ queryKey: ['admin-landings'] });
      await qc.invalidateQueries({ queryKey: ['admin-landing-detail', parent.id] });
      onCreated(created.id);
    },
  });

  return (
    <div className="rounded-md border bg-muted/20 p-4 space-y-3">
      <div className="text-sm font-medium">Создать city‑вариант</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Город
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
          >
            <option value="">—</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Title (опционально)
          <input
            className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Оставьте пустым для дефолта"
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" disabled={createChildM.isPending} onClick={() => createChildM.mutate()}>
          Создать
        </Button>
        {createChildM.isError ? (
          <div className="text-sm text-rose-700">{createChildM.error instanceof Error ? createChildM.error.message : 'Ошибка'}</div>
        ) : null}
      </div>
      <div className="text-xs text-muted-foreground">
        Prefill: slug = slug родителя, filterTag/источник/SEO/related — копируются, статус = DRAFT.
      </div>
    </div>
  );
}

