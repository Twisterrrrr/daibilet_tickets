import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { fetchAdminVenueDetail } from '@/modules/venues/api/candidates';
import {
  buildCandidatesPrefilterFromVenue,
  buildVenueCandidatesSearchParams,
} from '@/modules/venues/utils/venueCandidatesUrlState';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

type LocationState = { fromCandidatesPath?: string };

export function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromCandidates = (location.state as LocationState | null)?.fromCandidatesPath;

  const detailQ = useQuery({
    queryKey: ['admin-venue-detail-page', id],
    queryFn: () => fetchAdminVenueDetail(id!),
    enabled: Boolean(id),
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

  const v = detailQ.data;
  if (!v) return <LoadingState label="Загрузка…" />;

  const eventsHref = `/admin-v3/events?venueId=${encodeURIComponent(id)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={v.title}
        subtitle={`${v.city.name} · ${v.lifecycleStatus} · v{v.version}`}
      />

      <div className="flex flex-wrap gap-2">
        {fromCandidates ? (
          <Button type="button" variant="secondary" onClick={() => navigate(fromCandidates)}>
            Назад к кандидатам
          </Button>
        ) : null}
        <Button type="button" variant="outline" asChild>
          <Link to={candidatesPrefilterHref}>Найти похожих кандидатов</Link>
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link to={eventsHref}>Открыть события площадки</Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-5 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">Адрес</div>
            <div>{v.address ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Город</div>
            <div>
              {v.city.name} ({v.city.slug})
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Источник / импорт</div>
            <div>
              {v.sourceType} {v.importSource ? ` · ${v.importSource}` : ''}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Публикация</div>
            <div>{v.isPublished ? 'Да' : 'Нет'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
