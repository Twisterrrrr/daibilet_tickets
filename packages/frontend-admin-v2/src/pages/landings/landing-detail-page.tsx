import { useMemo } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { LandingDetailView } from '@/features/landing-detail/landing-detail-view';
import { blueprintLandingDetail } from '@/shared/config/admin-v2-blueprints';
import { IntegrationBlueprint } from '@/shared/layout/admin-v2-blueprint';
import { DetailPageLayout } from '@/shared/layout/detail-page-layout';
import { formatDateTime } from '@/shared/lib/format';
import { getMockLandingById } from '@/shared/mock/landings';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { PageGlyph } from '@/shared/ui/page-glyph';

export function LandingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const landing = useMemo(() => (id ? getMockLandingById(id) : undefined), [id]);

  if (!id) return <Navigate to="/landings" replace />;
  if (!landing) return <Navigate to="/landings" replace />;

  return (
    <DetailPageLayout
      title={landing.title}
      subtitle={landing.heroSubtitle}
      glyph={<PageGlyph icon={LayoutTemplate} tone="sky" />}
      meta={
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant={landing.status === 'Активен' ? 'success' : 'default'}>{landing.status}</Badge>
          <code className="rounded-control border border-border-soft bg-surface-alt px-2 py-0.5 text-small text-text-secondary">
            {landing.path}
          </code>
          <Badge variant="default">v{landing.version}</Badge>
          <Badge variant="default">Обновлено {formatDateTime(landing.updatedAt)}</Badge>
        </span>
      }
      actions={
        <Link to="/landings" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'no-underline')}>
          К списку лендингов
        </Link>
      }
      tabs={<LandingDetailView landing={landing} />}
      blueprint={<IntegrationBlueprint {...blueprintLandingDetail} />}
    />
  );
}
