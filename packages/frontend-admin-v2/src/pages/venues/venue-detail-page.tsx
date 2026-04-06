import { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { VenueDetailView } from '@/features/venue-detail/venue-detail-view';
import { blueprintVenueDetail } from '@/shared/config/admin-v2-blueprints';
import { IntegrationBlueprint } from '@/shared/layout/admin-v2-blueprint';
import { DetailPageLayout } from '@/shared/layout/detail-page-layout';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/format';
import { getMockVenueById } from '@/shared/mock/venues';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { StatusBadge } from '@/shared/ui/status-badge';

export function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const venue = useMemo(() => (id ? getMockVenueById(id) : undefined), [id]);

  if (!id) return <Navigate to="/venues" replace />;
  if (!venue) return <Navigate to="/venues" replace />;

  return (
    <DetailPageLayout
      title={venue.name}
      subtitle={venue.shortDescription}
      glyph={<PageGlyph icon={Building2} tone="sky" />}
      meta={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge value={venue.status} kind="venue" />
          <StatusBadge value={venue.type} kind="venue-type" />
          <Badge variant="default">Обновлено {formatDateTime(venue.updatedAt)}</Badge>
        </span>
      }
      actions={
        <>
          <Link to="/venues" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'no-underline')}>
            К списку
          </Link>
          <Link to="/events" className={cn(buttonVariants({ variant: 'secondary', size: 'md' }), 'no-underline')}>
            События
          </Link>
        </>
      }
      tabs={<VenueDetailView venue={venue} />}
      blueprint={<IntegrationBlueprint {...blueprintVenueDetail} />}
    />
  );
}
