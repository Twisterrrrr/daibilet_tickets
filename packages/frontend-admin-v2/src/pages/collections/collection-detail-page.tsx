import { useMemo } from 'react';
import { FolderOpen } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { CollectionDetailView } from '@/features/collection-detail/collection-detail-view';
import { blueprintCollectionDetail } from '@/shared/config/admin-v2-blueprints';
import { IntegrationBlueprint } from '@/shared/layout/admin-v2-blueprint';
import { DetailPageLayout } from '@/shared/layout/detail-page-layout';
import { formatDateTime } from '@/shared/lib/format';
import { getMockCollectionById } from '@/shared/mock/collections';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { PageGlyph } from '@/shared/ui/page-glyph';

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const collection = useMemo(() => (id ? getMockCollectionById(id) : undefined), [id]);

  if (!id) return <Navigate to="/collections" replace />;
  if (!collection) return <Navigate to="/collections" replace />;

  const statusOk = collection.status === 'Опубликовано';

  return (
    <DetailPageLayout
      title={collection.title}
      subtitle={collection.description}
      glyph={<PageGlyph icon={FolderOpen} tone="violet" />}
      meta={
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant={statusOk ? 'success' : 'default'}>{collection.status}</Badge>
          <code className="rounded-control border border-border-soft bg-surface-alt px-2 py-0.5 text-small text-text-secondary">
            {collection.slug}
          </code>
          <Badge variant="default">{collection.itemsCount} элементов</Badge>
          <Badge variant="default">Обновлено {formatDateTime(collection.updatedAt)}</Badge>
        </span>
      }
      actions={
        <Link to="/collections" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'no-underline')}>
          К списку подборок
        </Link>
      }
      tabs={<CollectionDetailView collection={collection} />}
      blueprint={<IntegrationBlueprint {...blueprintCollectionDetail} />}
    />
  );
}
