import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, LoadingState, PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type CatalogConsistencySnapshot = {
  generatedAt: string;
  cacheTtlSeconds?: number;
  events: {
    listableTotal?: number;
    noPrimaryImage?: number;
    noEffectiveSubcategory: number;
    excessSubcategoryLinksOver3: number;
    atSubcategoryCap3Links?: number;
    weakLocationNoVenueNoPoint?: number;
    noOffers?: number;
    scheduledNoUpcomingSessions?: number;
  };
  quality: {
    eventOverridesBlocked: number;
  };
  selection: {
    activeCollectionsWithZeroEligibleEvents: number;
    activeCollectionsTotal: number;
    activeLandingsWithZeroEligibleEvents: number;
    activeLandingsTotal: number;
  };
};

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function CatalogConsistencyPage() {
  const [data, setData] = useState<CatalogConsistencySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((bustCache?: boolean) => {
    setLoading(true);
    setError(null);
    const path = bustCache ? '/admin/catalog/consistency?refresh=1' : '/admin/catalog/consistency';
    adminApi
      .get<CatalogConsistencySnapshot>(path)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="p-4">
        <PageHeader title="Согласованность каталога" subtitle="Метрики классификации и пустой выдачи подборок/лендингов" />
        <LoadingState label="Загрузка…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-4">
        <PageHeader title="Согласованность каталога" subtitle="Метрики классификации и пустой выдачи подборок/лендингов" />
        <ErrorState title="Не удалось загрузить" description={error} />
        <Button type="button" variant="outline" onClick={() => load()}>
          Повторить
        </Button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const gen = new Date(data.generatedAt).toLocaleString('ru-RU');

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Согласованность каталога"
          subtitle="Снимок по событиям (подкатегории), качеству и активным подборкам/лендингам без событий"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => load(true)} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить (сброс кэша)
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Сформировано: {gen}
        {data.cacheTtlSeconds != null ? ` · кэш API: до ${data.cacheTtlSeconds} с` : null}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>События</CardTitle>
          <CardDescription>Дедуп канонических событий, без эффективной подкатегории; аномалии по числу связей</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {data.events.listableTotal != null ? (
            <Stat label="Всего listable-событий (активные, не дубль)" value={data.events.listableTotal} />
          ) : null}
          {data.events.noPrimaryImage != null ? (
            <Stat
              label="Без обложки (imageUrl пустой или null)"
              value={data.events.noPrimaryImage}
            />
          ) : null}
          <Stat
            label="Без эффективной подкатегории (нет связей и пустой legacy enum)"
            value={data.events.noEffectiveSubcategory}
          />
          <Stat
            label="Событий с &gt; 3 связями EventSubcategoryLink"
            value={data.events.excessSubcategoryLinksOver3}
            hint="Количество событий (SQL HAVING COUNT&gt;3)."
          />
          {data.events.atSubcategoryCap3Links != null ? (
            <Stat
              label="Ровно 3 связи EventSubcategoryLink (на капе)"
              value={data.events.atSubcategoryCap3Links}
            />
          ) : null}
          {data.events.weakLocationNoVenueNoPoint != null ? (
            <Stat
              label="Слабая локация (нет venue/startLocation и адреса/точки)"
              value={data.events.weakLocationNoVenueNoPoint}
            />
          ) : null}
          {data.events.noOffers != null ? (
            <Stat label="Без активных offers" value={data.events.noOffers} />
          ) : null}
          {data.events.scheduledNoUpcomingSessions != null ? (
            <Stat
              label="SCHEDULED: нет предстоящих сеансов"
              value={data.events.scheduledNoUpcomingSessions}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Качество (overrides)</CardTitle>
          <CardDescription>EventOverride с qualityStatus = BLOCKED</CardDescription>
        </CardHeader>
        <CardContent>
          <Stat label="Записей BLOCKED" value={data.quality.eventOverridesBlocked} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Подборки и лендинги</CardTitle>
          <CardDescription>Активные сущности, у которых отбор даёт 0 событий (текущие правила eligibility)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Stat
            label="Активные подборки: пустая выдача"
            value={data.selection.activeCollectionsWithZeroEligibleEvents}
            hint={`Всего активных с cityId: ${data.selection.activeCollectionsTotal}`}
          />
          <Stat
            label="Активные лендинги: пустая выдача"
            value={data.selection.activeLandingsWithZeroEligibleEvents}
            hint={`Всего активных: ${data.selection.activeLandingsTotal}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Действия</CardTitle>
          <CardDescription>Где править контент и классификацию</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link to="/collections">Подборки</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/landings">Лендинги</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/events">События</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
