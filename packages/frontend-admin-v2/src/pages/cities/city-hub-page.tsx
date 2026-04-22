import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { CityHubView } from '@/features/city-hub/city-hub-view';
import { blueprintCityHub } from '@/shared/config/admin-v2-blueprints';
import { IntegrationBlueprint } from '@/shared/layout/admin-v2-blueprint';
import { DetailPageLayout } from '@/shared/layout/detail-page-layout';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/format';
import { getMockCityHubById } from '@/shared/mock/cities';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button';
import { PageGlyph } from '@/shared/ui/page-glyph';

export function CityHubPage() {
  const { id } = useParams<{ id: string }>();
  const city = useMemo(() => (id ? getMockCityHubById(id) : undefined), [id]);

  if (!id) return <Navigate to="/cities" replace />;
  if (!city) return <Navigate to="/cities" replace />;

  return (
    <DetailPageLayout
      title={city.name}
      subtitle={city.heroSubtitle}
      glyph={<PageGlyph icon={MapPin} tone="mint" />}
      meta={
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{city.region}</Badge>
          <code className="rounded-control border border-border-soft bg-surface-alt px-2 py-0.5 text-small text-text-secondary">
            /{city.slug}
          </code>
          <Badge variant="default">{city.timezone}</Badge>
          <Badge variant="default">Обновлено {formatDateTime(city.updatedAt)}</Badge>
        </span>
      }
      actions={
        <Link to="/cities" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'no-underline')}>
          К списку городов
        </Link>
      }
      tabs={<CityHubView city={city} />}
      blueprint={<IntegrationBlueprint {...blueprintCityHub} />}
    />
  );
}
