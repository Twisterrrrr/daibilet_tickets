import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { PromoBlockDetailView } from '@/features/promo-block-detail/promo-block-detail-view';
import { blueprintPromoBlockDetail } from '@/shared/config/admin-v2-blueprints';
import { IntegrationBlueprint } from '@/shared/layout/admin-v2-blueprint';
import { DetailPageLayout } from '@/shared/layout/detail-page-layout';
import { formatDateTime } from '@/shared/lib/format';
import { getMockPromoBlockById } from '@/shared/mock/promo-blocks';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { PageGlyph } from '@/shared/ui/page-glyph';

export function PromoBlockDetailPage() {
  const { id } = useParams<{ id: string }>();
  const block = useMemo(() => (id ? getMockPromoBlockById(id) : undefined), [id]);

  if (!id) return <Navigate to="/promo-blocks" replace />;
  if (!block) return <Navigate to="/promo-blocks" replace />;

  return (
    <DetailPageLayout
      title={block.name}
      subtitle={block.zone}
      glyph={<PageGlyph icon={BarChart3} tone="amber" />}
      meta={
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant={block.active ? 'success' : 'default'}>{block.active ? 'Активен' : 'Выключен'}</Badge>
          <Badge variant="default">Приоритет {block.priority}</Badge>
          <Badge variant="default">{block.period}</Badge>
          <Badge variant="default">Обновлено {formatDateTime(block.updatedAt)}</Badge>
        </span>
      }
      actions={
        <Link to="/promo-blocks" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'no-underline')}>
          К списку промо-блоков
        </Link>
      }
      tabs={<PromoBlockDetailView block={block} />}
      blueprint={<IntegrationBlueprint {...blueprintPromoBlockDetail} />}
    />
  );
}
